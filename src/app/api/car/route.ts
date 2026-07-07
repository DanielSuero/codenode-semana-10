import { NextResponse } from 'next/server';
import getDb from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const includeAll = searchParams.get('all') === '1' || searchParams.get('all') === 'true';

    let db;
    try {
      db = await getDb();
    } catch (err) {
      console.error('DB initialization error in GET /api/car:', err);
      return NextResponse.json({ error: 'DB initialization error', details: String(err) }, { status: 500 });
    }

    if (includeAll) {
      const cars = await db.prepare('SELECT * FROM car_profile ORDER BY is_active DESC, id ASC').all();
      return NextResponse.json(cars);
    }

    const car = await db.prepare('SELECT * FROM car_profile WHERE is_active = 1 LIMIT 1').get();
    if (!car) {
      return NextResponse.json({ error: 'Car profile not found' }, { status: 404 });
    }
    return NextResponse.json(car);
  } catch (error) {
    console.error('Error fetching car profile:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { make, model, engine, year, license_plate, vin, mileage } = body;

    if (!make || !model || !year || !license_plate || mileage === undefined) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    let db;
    try {
      db = await getDb();
    } catch (err) {
      console.error('DB initialization error in PUT /api/car:', err);
      return NextResponse.json({ error: 'DB initialization error', details: String(err) }, { status: 500 });
    }

    const activeCar = await db.prepare('SELECT * FROM car_profile WHERE is_active = 1 LIMIT 1').get() as any;
    if (!activeCar) {
      return NextResponse.json({ error: 'No active car profile found' }, { status: 404 });
    }

    const updated = await db.prepare(`
      UPDATE car_profile
      SET make = ?, model = ?, engine = ?, year = ?, license_plate = ?, vin = ?, mileage = ?
      WHERE id = ?
    `).run(make, model, engine || null, year, license_plate, vin || null, mileage, activeCar.id);

    if (updated.changes === 0) {
      return NextResponse.json({ error: 'Failed to update car profile' }, { status: 500 });
    }

    const car = await db.prepare('SELECT * FROM car_profile WHERE id = ?').get(activeCar.id);
    return NextResponse.json(car);
  } catch (error) {
    console.error('Error updating car profile:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
