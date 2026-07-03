import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const revision = db.prepare('SELECT * FROM revisions WHERE id = ?').get(id) as any;
    if (!revision) {
      return NextResponse.json({ error: 'Revision not found' }, { status: 404 });
    }

    const items = db.prepare('SELECT * FROM revision_items WHERE revision_id = ?').all(id);

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

    // Check if revision exists
    const existingRevision = db.prepare('SELECT * FROM revisions WHERE id = ?').get(id);
    if (!existingRevision) {
      return NextResponse.json({ error: 'Revision not found' }, { status: 404 });
    }

    // Validation
    if (!date || mileage === undefined || !inspector_name || !status || !Array.isArray(items)) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Execute update in a transaction
    const updateTransaction = db.transaction(() => {
      // 1. Update main revision table
      db.prepare(`
        UPDATE revisions
        SET date = ?, mileage = ?, inspector_name = ?, notes = ?, status = ?
        WHERE id = ?
      `).run(date, mileage, inspector_name, notes || null, status, id);

      // 2. Clear old items and insert new items
      db.prepare('DELETE FROM revision_items WHERE revision_id = ?').run(id);

      const insertItem = db.prepare(`
        INSERT INTO revision_items (revision_id, category, name, status, value, notes)
        VALUES (?, ?, ?, ?, ?, ?)
      `);

      for (const item of items) {
        insertItem.run(
          id,
          item.category,
          item.name,
          item.status || 'Pending',
          item.value || null,
          item.notes || null
        );
      }

      // 3. Recalculate and update the car profile's mileage/last revision date
      // Fetch latest completed revision by date
      const latestRevision = db.prepare('SELECT * FROM revisions ORDER BY date DESC, mileage DESC LIMIT 1').get() as any;
      if (latestRevision) {
        db.prepare(`
          UPDATE car_profile
          SET mileage = ?, last_revision_date = ?
          WHERE id = (SELECT id FROM car_profile LIMIT 1)
        `).run(latestRevision.mileage, latestRevision.date);
      }
    });

    updateTransaction();

    // Fetch the updated revision
    const updatedRevision = db.prepare('SELECT * FROM revisions WHERE id = ?').get() as any;
    const updatedItems = db.prepare('SELECT * FROM revision_items WHERE revision_id = ?').all(id);

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

    // Check if revision exists
    const existingRevision = db.prepare('SELECT * FROM revisions WHERE id = ?').get(id);
    if (!existingRevision) {
      return NextResponse.json({ error: 'Revision not found' }, { status: 404 });
    }

    const deleteTransaction = db.transaction(() => {
      // 1. Delete revision items (handled by cascade, but good to have)
      db.prepare('DELETE FROM revision_items WHERE revision_id = ?').run(id);
      
      // 2. Delete revision
      db.prepare('DELETE FROM revisions WHERE id = ?').run(id);

      // 3. Update the car profile's mileage and last revision date to the previous latest revision
      const latestRevision = db.prepare('SELECT * FROM revisions ORDER BY date DESC, mileage DESC LIMIT 1').get() as any;
      if (latestRevision) {
        db.prepare(`
          UPDATE car_profile
          SET mileage = ?, last_revision_date = ?
          WHERE id = (SELECT id FROM car_profile LIMIT 1)
        `).run(latestRevision.mileage, latestRevision.date);
      } else {
        // No revisions left, reset last_revision_date (mileage stays as is or doesn't reset)
        db.prepare(`
          UPDATE car_profile
          SET last_revision_date = NULL
          WHERE id = (SELECT id FROM car_profile LIMIT 1)
        `).run();
      }
    });

    deleteTransaction();

    return NextResponse.json({ success: true, message: 'Revision deleted successfully' });
  } catch (error) {
    console.error('Error deleting revision:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
