import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function GET() {
  try {
    const car = db.prepare('SELECT * FROM car_profile LIMIT 1').get();
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
    const { make, model, year, license_plate, vin, mileage } = body;

    // Validation
    if (!make || !model || !year || !license_plate || mileage === undefined) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const updated = db.prepare(`
      UPDATE car_profile
      SET make = ?, model = ?, year = ?, license_plate = ?, vin = ?, mileage = ?
      WHERE id = (SELECT id FROM car_profile LIMIT 1)
    `).run(make, model, year, license_plate, vin || null, mileage);

    if (updated.changes === 0) {
      return NextResponse.json({ error: 'Failed to update car profile' }, { status: 500 });
    }

    const car = db.prepare('SELECT * FROM car_profile LIMIT 1').get();
    return NextResponse.json(car);
  } catch (error) {
    console.error('Error updating car profile:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
