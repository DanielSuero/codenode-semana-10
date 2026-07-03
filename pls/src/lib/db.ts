import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DB_PATH = path.join(process.cwd(), 'car_revision.db');

// Ensure database file directory exists
const dbDir = path.dirname(DB_PATH);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new Database(DB_PATH, { timeout: 10000 });

// Enable WAL mode for performance
db.pragma('journal_mode = WAL');
db.pragma('synchronous = NORMAL');

// Initialize database tables
db.exec(`
  CREATE TABLE IF NOT EXISTS car_profile (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    make TEXT NOT NULL,
    model TEXT NOT NULL,
    year INTEGER NOT NULL,
    license_plate TEXT NOT NULL,
    vin TEXT,
    mileage INTEGER NOT NULL,
    last_revision_date TEXT
  );

  CREATE TABLE IF NOT EXISTS revisions (
    id TEXT PRIMARY KEY,
    date TEXT NOT NULL,
    mileage INTEGER NOT NULL,
    inspector_name TEXT NOT NULL,
    notes TEXT,
    status TEXT NOT NULL -- 'Passed', 'Conditional', 'Failed'
  );

  CREATE TABLE IF NOT EXISTS revision_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    revision_id TEXT NOT NULL,
    category TEXT NOT NULL,
    name TEXT NOT NULL,
    status TEXT NOT NULL, -- 'Passed', 'Warning', 'Failed', 'Pending'
    value TEXT,
    notes TEXT,
    FOREIGN KEY(revision_id) REFERENCES revisions(id) ON DELETE CASCADE
  );
`);

// Seed initial car if database is empty
const carCountResult = db.prepare('SELECT COUNT(*) as count FROM car_profile').get() as { count: number };

if (carCountResult.count === 0) {
  db.prepare(`
    INSERT INTO car_profile (make, model, year, license_plate, vin, mileage, last_revision_date)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    'Porsche',
    '911 Carrera S (992)',
    2022,
    '911-DBX',
    'WP0AD2A9XNS254911',
    24500,
    '2026-01-15'
  );

  // Seed a sample past revision
  const sampleRevisionId = 'rev-sample-1';
  db.prepare(`
    INSERT INTO revisions (id, date, mileage, inspector_name, notes, status)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    sampleRevisionId,
    '2026-01-15',
    24500,
    'Alex Martinez',
    'Revisión general rutinaria. El coche está en excelente estado, solo se observó desgaste menor en pastillas delanteras.',
    'Conditional'
  );

  const sampleItems = [
    { category: 'Engine', name: 'Nivel de Aceite (Oil Level)', status: 'Passed', value: 'OK', notes: 'Nivel óptimo' },
    { category: 'Engine', name: 'Líquido Refrigerante (Coolant)', status: 'Passed', value: '-35°C', notes: 'Protección adecuada' },
    { category: 'Engine', name: 'Filtro de Aire (Air Filter)', status: 'Passed', value: 'Clean', notes: 'Reemplazado en la anterior' },
    { category: 'Tires & Brakes', name: 'Presión Neumáticos (Tire Pressure)', status: 'Passed', value: '2.4 bar', notes: 'Delanteros y traseros calibrados' },
    { category: 'Tires & Brakes', name: 'Profundidad de Neumáticos (Tread Depth)', status: 'Passed', value: '6mm', notes: 'Buen estado general' },
    { category: 'Tires & Brakes', name: 'Pastillas de Freno (Brake Pads)', status: 'Warning', value: '4mm', notes: 'Desgaste medio. Recomendar cambio en 5,000 km' },
    { category: 'Electronics', name: 'Luces Principales (Headlights)', status: 'Passed', value: 'OK', notes: 'Matriz LED funcionando correctamente' },
    { category: 'Electronics', name: 'Batería (Battery Voltage)', status: 'Passed', value: '12.6 V', notes: 'Voltaje saludable con motor apagado' },
    { category: 'Safety & Body', name: 'Limpiaparabrisas (Wipers)', status: 'Warning', value: 'Slight Streak', notes: 'Dejan marcas leves al limpiar' },
    { category: 'Safety & Body', name: 'Cinturones de Seguridad (Seatbelts)', status: 'Passed', value: 'OK', notes: 'Pretensores y anclajes perfectos' }
  ];

  const insertItem = db.prepare(`
    INSERT INTO revision_items (revision_id, category, name, status, value, notes)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  for (const item of sampleItems) {
    insertItem.run(sampleRevisionId, item.category, item.name, item.status, item.value, item.notes);
  }
}

export default db;
export interface CarProfile {
  id: number;
  make: string;
  model: string;
  year: number;
  license_plate: string;
  vin: string;
  mileage: number;
  last_revision_date: string | null;
}

export interface Revision {
  id: string;
  date: string;
  mileage: number;
  inspector_name: string;
  notes: string | null;
  status: 'Passed' | 'Conditional' | 'Failed';
}

export interface RevisionItem {
  id: number;
  revision_id: string;
  category: string;
  name: string;
  status: 'Passed' | 'Warning' | 'Failed' | 'Pending';
  value: string | null;
  notes: string | null;
}
