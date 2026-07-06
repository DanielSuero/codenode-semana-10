import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const revision = await db.prepare('SELECT * FROM revisions WHERE id = ?').get(id) as any;
    if (!revision) {
      return NextResponse.json({ error: 'Revision not found' }, { status: 404 });
    }

    const items = await db.prepare('SELECT * FROM revision_items WHERE revision_id = ?').all(id);

    return NextResponse.json({
      ...revision,
      items
    });
  } catch (error) {
    console.error('Error fetching revision details:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { date, mileage, inspector_name, notes, status, items } = body;

    const existingRevision = await db.prepare('SELECT * FROM revisions WHERE id = ?').get(id);
    if (!existingRevision) {
      return NextResponse.json({ error: 'Revision not found' }, { status: 404 });
    }

    if (!date || mileage === undefined || !inspector_name || !status || !Array.isArray(items)) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    await db.transaction(async () => {
      await db.prepare(`
        UPDATE revisions
        SET date = ?, mileage = ?, inspector_name = ?, notes = ?, status = ?
        WHERE id = ?
      `).run(date, mileage, inspector_name, notes || null, status, id);

      await db.prepare('DELETE FROM revision_items WHERE revision_id = ?').run(id);

      const insertItem = db.prepare(`
        INSERT INTO revision_items (revision_id, category, name, status, value, notes)
        VALUES (?, ?, ?, ?, ?, ?)
      `);

      for (const item of items) {
        await insertItem.run(
          id,
          item.category,
          item.name,
          item.status || 'Pending',
          item.value || null,
          item.notes || null
        );
      }

      const activeCar = await db.prepare('SELECT * FROM car_profile WHERE is_active = 1 LIMIT 1').get() as any;
      if (activeCar) {
        const latestRevision = await db.prepare('SELECT * FROM revisions WHERE car_id = ? ORDER BY date DESC, mileage DESC LIMIT 1').get(activeCar.id) as any;
        if (latestRevision) {
          await db.prepare(`
            UPDATE car_profile
            SET mileage = ?, last_revision_date = ?
            WHERE id = ?
          `).run(latestRevision.mileage, latestRevision.date, activeCar.id);
        }
      }
    });

    const updatedRevision = await db.prepare('SELECT * FROM revisions WHERE id = ?').get(id) as any;
    const updatedItems = await db.prepare('SELECT * FROM revision_items WHERE revision_id = ?').all(id);

    return NextResponse.json({
      ...updatedRevision,
      items: updatedItems
    });
  } catch (error) {
    console.error('Error updating revision:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const existingRevision = await db.prepare('SELECT * FROM revisions WHERE id = ?').get(id);
    if (!existingRevision) {
      return NextResponse.json({ error: 'Revision not found' }, { status: 404 });
    }

    await db.transaction(async () => {
      await db.prepare('DELETE FROM revision_items WHERE revision_id = ?').run(id);
      await db.prepare('DELETE FROM revisions WHERE id = ?').run(id);

      const activeCar = await db.prepare('SELECT * FROM car_profile WHERE is_active = 1 LIMIT 1').get() as any;
      if (activeCar) {
        const latestRevision = await db.prepare('SELECT * FROM revisions WHERE car_id = ? ORDER BY date DESC, mileage DESC LIMIT 1').get(activeCar.id) as any;
        if (latestRevision) {
          await db.prepare(`
            UPDATE car_profile
            SET mileage = ?, last_revision_date = ?
            WHERE id = ?
          `).run(latestRevision.mileage, latestRevision.date, activeCar.id);
        } else {
          await db.prepare(`
            UPDATE car_profile
            SET last_revision_date = NULL
            WHERE id = ?
          `).run(activeCar.id);
        }
      }
    });

    return NextResponse.json({ success: true, message: 'Revision deleted successfully' });
  } catch (error) {
    console.error('Error deleting revision:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
