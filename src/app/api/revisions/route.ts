import { NextResponse } from 'next/server';
import getDb from '@/lib/db';
import crypto from 'crypto';

export async function GET() {
  try {
    const db = await getDb();
    const activeCar = await db.prepare('SELECT * FROM car_profile WHERE is_active = 1 LIMIT 1').get() as any;
    const carId = activeCar?.id;

    const revisions = carId
      ? await db.prepare('SELECT * FROM revisions WHERE car_id = ? ORDER BY date DESC, mileage DESC').all(carId)
      : [];

    const enrichedRevisions = await Promise.all(revisions.map(async (rev: any) => {
      const items = await db.prepare('SELECT * FROM revision_items WHERE revision_id = ?').all(rev.id);
      return {
        ...rev,
        items
      };
    }));

    return NextResponse.json(enrichedRevisions);
  } catch (error) {
    console.error('Error fetching revisions:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { date, mileage, inspector_name, notes, status, items } = body;

    if (!date || mileage === undefined || !inspector_name || !status || !Array.isArray(items)) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const db = await getDb();
    const activeCar = await db.prepare('SELECT * FROM car_profile WHERE is_active = 1 LIMIT 1').get() as any;
    if (!activeCar) {
      return NextResponse.json({ error: 'No active car profile found' }, { status: 404 });
    }

    const revisionId = `rev-${crypto.randomBytes(4).toString('hex')}`;

    const resultId = await db.transaction(async () => {
      await db.prepare(`
        INSERT INTO revisions (id, date, mileage, inspector_name, notes, status, car_id)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(revisionId, date, mileage, inspector_name, notes || null, status, activeCar.id);

      const insertItem = db.prepare(`
        INSERT INTO revision_items (revision_id, category, name, status, value, notes)
        VALUES (?, ?, ?, ?, ?, ?)
      `);

      for (const item of items) {
        await insertItem.run(
          revisionId,
          item.category,
          item.name,
          item.status || 'Pending',
          item.value || null,
          item.notes || null
        );
      }

      const shouldUpdate = !activeCar.last_revision_date || date >= activeCar.last_revision_date || mileage >= activeCar.mileage;
      if (shouldUpdate) {
        await db.prepare(`
          UPDATE car_profile
          SET mileage = ?, last_revision_date = ?
          WHERE id = ?
        `).run(mileage, date, activeCar.id);
      }

      return revisionId;
    });

    const newRevision = await db.prepare('SELECT * FROM revisions WHERE id = ?').get(resultId) as any;
    const newItems = await db.prepare('SELECT * FROM revision_items WHERE revision_id = ?').all(resultId);

    return NextResponse.json({
      ...newRevision,
      items: newItems
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating revision:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
