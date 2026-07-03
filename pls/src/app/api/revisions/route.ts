import { NextResponse } from 'next/server';
import db from '@/lib/db';
import crypto from 'crypto';

export async function GET() {
  try {
    // Fetch all revisions, ordered by date descending
    const revisions = db.prepare('SELECT * FROM revisions ORDER BY date DESC, mileage DESC').all();
    
    // For each revision, fetch its items count
    const enrichedRevisions = revisions.map((rev: any) => {
      const items = db.prepare('SELECT * FROM revision_items WHERE revision_id = ?').all(rev.id);
      return {
        ...rev,
        items
      };
    });

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

    // Validation
    if (!date || mileage === undefined || !inspector_name || !status || !Array.isArray(items)) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const revisionId = `rev-${crypto.randomBytes(4).toString('hex')}`;

    // Use a transaction to perform all inserts and updates atomicaly
    const createTransaction = db.transaction(() => {
      // 1. Insert revision
      db.prepare(`
        INSERT INTO revisions (id, date, mileage, inspector_name, notes, status)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(revisionId, date, mileage, inspector_name, notes || null, status);

      // 2. Insert items
      const insertItem = db.prepare(`
        INSERT INTO revision_items (revision_id, category, name, status, value, notes)
        VALUES (?, ?, ?, ?, ?, ?)
      `);

      for (const item of items) {
        insertItem.run(
          revisionId,
          item.category,
          item.name,
          item.status || 'Pending',
          item.value || null,
          item.notes || null
        );
      }

      // 3. Update the car's profile with the new mileage and revision date if this revision is more recent
      const car = db.prepare('SELECT * FROM car_profile LIMIT 1').get() as any;
      if (car) {
        // Simple date comparison or always update if mileage is higher
        const shouldUpdate = !car.last_revision_date || date >= car.last_revision_date || mileage >= car.mileage;
        if (shouldUpdate) {
          db.prepare(`
            UPDATE car_profile
            SET mileage = ?, last_revision_date = ?
            WHERE id = ?
          `).run(mileage, date, car.id);
        }
      }

      return revisionId;
    });

    const resultId = createTransaction();

    // Fetch the newly created revision
    const newRevision = db.prepare('SELECT * FROM revisions WHERE id = ?').get(resultId) as any;
    const newItems = db.prepare('SELECT * FROM revision_items WHERE revision_id = ?').all(resultId);

    return NextResponse.json({
      ...newRevision,
      items: newItems
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating revision:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
