import { NextResponse } from 'next/server';
import db from '@/lib/db';

/**
 * POST /api/car/change
 * Saves the current vehicle as a new car profile and switches the active one without deleting the previous one.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { car_id, make, model, engine, year, license_plate, vin, mileage } = body;

    if (car_id) {
      const existingCar = db.prepare('SELECT * FROM car_profile WHERE id = ?').get(car_id) as any;
      if (!existingCar) {
        return NextResponse.json({ error: 'Car not found' }, { status: 404 });
      }

      await db.prepare('UPDATE car_profile SET is_active = CASE WHEN id = ? THEN 1 ELSE 0 END').run(existingCar.id);
      const car = await db.prepare('SELECT * FROM car_profile WHERE id = ?').get(existingCar.id);
      return NextResponse.json(car);
    }

    if (!make || !model || !year || !license_plate || mileage === undefined) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const createdCarId = await db.transaction(async () => {
      const createdCar = await db.prepare(`
        INSERT INTO car_profile (make, model, engine, year, license_plate, vin, mileage, last_revision_date, is_active)
        VALUES (?, ?, ?, ?, ?, ?, ?, NULL, 1)
      `).run(make, model, engine || null, year, license_plate, vin || null, mileage) as { lastInsertRowid?: number | bigint };

      await db.prepare('UPDATE car_profile SET is_active = CASE WHEN id = ? THEN 1 ELSE 0 END').run(createdCar.lastInsertRowid);
      return createdCar.lastInsertRowid;
    });

    const car = await db.prepare('SELECT * FROM car_profile WHERE id = ?').get(createdCarId);
    return NextResponse.json(car);
  } catch (error) {
    console.error('Error changing car:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
