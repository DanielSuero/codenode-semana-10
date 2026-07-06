import path from 'path';
import fs from 'fs';
import postgres from 'postgres';

interface StatementLike {
  get: (...params: unknown[]) => Promise<unknown> | unknown;
  all: (...params: unknown[]) => Promise<unknown[]> | unknown[];
  run: (...params: unknown[]) => Promise<{ changes: number; lastInsertRowid?: number }> | { changes: number; lastInsertRowid?: number };
}

interface DbAdapter {
  prepare: (sql: string) => StatementLike;
  transaction: <T>(fn: () => T | Promise<T>) => Promise<T> | T;
  exec: (sql: string) => void;
  close: () => void;
}

const DB_PATH = path.join(process.cwd(), 'car_revision.db');
const dbDir = path.dirname(DB_PATH);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const usePostgres = Boolean(process.env.DATABASE_URL);

function convertToPostgresQuery(query: string, params: unknown[]) {
  let output = '';
  let paramIndex = 1;
  let index = 0;

  while (index < query.length) {
    if (query[index] === '?') {
      output += `$${paramIndex}`;
      paramIndex += 1;
    } else {
      output += query[index];
    }
    index += 1;
  }

  return { text: output, values: params };
}

class SqliteAdapter implements DbAdapter {
  private readonly connection: any;

  constructor() {
    const DatabaseCtor = require('better-sqlite3');
    this.connection = new DatabaseCtor(DB_PATH, { timeout: 10000 });
    this.connection.pragma('journal_mode = WAL');
    this.connection.pragma('synchronous = NORMAL');
  }

  prepare(sql: string): StatementLike {
    const statement = this.connection.prepare(sql);
    return {
      get: (...params: unknown[]) => statement.get(...params),
      all: (...params: unknown[]) => statement.all(...params),
      run: (...params: unknown[]) => statement.run(...params),
    };
  }

  transaction<T>(fn: () => T | Promise<T>): Promise<T> | T {
    return fn();
  }

  exec(sql: string): void {
    this.connection.exec(sql);
  }

  close(): void {
    this.connection.close();
  }
}

class PostgresAdapter implements DbAdapter {
  private readonly connection: ReturnType<typeof postgres>;
  private readonly ready: Promise<void>;

  constructor() {
    this.connection = postgres(process.env.DATABASE_URL!, {
      ssl: 'require',
      max: 1,
    });
    this.ready = this.initialize();
  }

  private async initialize() {
    await this.connection`
      CREATE TABLE IF NOT EXISTS car_profile (
        id SERIAL PRIMARY KEY,
        make TEXT NOT NULL,
        model TEXT NOT NULL,
        engine TEXT,
        year INTEGER NOT NULL,
        license_plate TEXT NOT NULL,
        vin TEXT,
        mileage INTEGER NOT NULL,
        last_revision_date TEXT,
        is_active BOOLEAN NOT NULL DEFAULT FALSE
      )
    `;

    await this.connection`
      CREATE TABLE IF NOT EXISTS revisions (
        id TEXT PRIMARY KEY,
        date TEXT NOT NULL,
        mileage INTEGER NOT NULL,
        inspector_name TEXT NOT NULL,
        notes TEXT,
        status TEXT NOT NULL,
        car_id INTEGER NOT NULL DEFAULT 1
      )
    `;

    await this.connection`
      CREATE TABLE IF NOT EXISTS revision_items (
        id SERIAL PRIMARY KEY,
        revision_id TEXT NOT NULL,
        category TEXT NOT NULL,
        name TEXT NOT NULL,
        status TEXT NOT NULL,
        value TEXT,
        notes TEXT,
        FOREIGN KEY(revision_id) REFERENCES revisions(id) ON DELETE CASCADE
      )
    `;

    await this.connection`
      ALTER TABLE car_profile ADD COLUMN IF NOT EXISTS engine TEXT
    `;

    await this.connection`
      ALTER TABLE car_profile ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT FALSE
    `;

    await this.connection`
      ALTER TABLE revisions ADD COLUMN IF NOT EXISTS car_id INTEGER NOT NULL DEFAULT 1
    `;

    const activeCar = await this.connection<{ id: number }[]>`SELECT id FROM car_profile WHERE is_active = TRUE ORDER BY id LIMIT 1`;
    const fallbackCarId = activeCar[0]?.id ?? (await this.connection<{ id: number }[]>`SELECT id FROM car_profile ORDER BY id LIMIT 1`)[0]?.id ?? 1;

    await this.connection`UPDATE car_profile SET is_active = (id = ${fallbackCarId})`;
    await this.connection`UPDATE revisions SET car_id = ${fallbackCarId} WHERE car_id IS NULL`;

    const carCount = await this.connection<{ count: number }[]>`SELECT COUNT(*)::int as count FROM car_profile`;
    if (carCount[0]?.count === 0) {
      const createdCar = await this.connection<{ id: number }[]>`INSERT INTO car_profile (make, model, engine, year, license_plate, vin, mileage, last_revision_date, is_active)
        VALUES (${'Porsche'}, ${'911 Carrera S (992)'}, ${'3.0 T Biturbo 450 CV'}, ${2022}, ${'911-DBX'}, ${'WP0AD2A9XNS254911'}, ${24500}, ${'2026-01-15'}, ${true}) RETURNING id`;
      const createdCarId = createdCar[0]?.id ?? 1;

      await this.connection`INSERT INTO revisions (id, date, mileage, inspector_name, notes, status, car_id)
        VALUES (${'rev-sample-1'}, ${'2026-01-15'}, ${24500}, ${'Alex Martinez'}, ${'Revisión general rutinaria. El coche está en excelente estado, solo se observó desgaste menor en pastillas delanteras.'}, ${'Conditional'}, ${createdCarId})`;

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

      for (const item of sampleItems) {
        await this.connection`INSERT INTO revision_items (revision_id, category, name, status, value, notes)
          VALUES (${'rev-sample-1'}, ${item.category}, ${item.name}, ${item.status}, ${item.value}, ${item.notes})`;
      }
    }
  }

  private async ensureReady() {
    await this.ready;
  }

  prepare(sql: string): StatementLike {
    return {
      get: async (...params: unknown[]) => {
        await this.ensureReady();
        const { text, values } = convertToPostgresQuery(sql, params);
        const rows = await this.connection.unsafe(text, ...values);
        return rows[0] as unknown;
      },
      all: async (...params: unknown[]) => {
        await this.ensureReady();
        const { text, values } = convertToPostgresQuery(sql, params);
        return this.connection.unsafe(text, ...values) as Promise<unknown[]>;
      },
      run: async (...params: unknown[]) => {
        await this.ensureReady();
        const { text, values } = convertToPostgresQuery(sql, params);
        const isInsert = /^\s*INSERT\b/i.test(text);
        const queryText = isInsert && !/\bRETURNING\b/i.test(text) ? `${text} RETURNING id` : text;
        const result = await this.connection.unsafe(queryText, ...values);
        const rows = Array.isArray(result) ? result : [];
        const lastInsertRowid = rows[0]?.id ?? undefined;
        return { changes: rows.length, lastInsertRowid };
      },
    };
  }

  async transaction<T>(fn: () => T | Promise<T>): Promise<T> {
    await this.ensureReady();
    return fn();
  }

  exec(sql: string): void {
    void this.connection.unsafe(sql);
  }

  close(): void {
    void this.connection.end();
  }
}

const adapter: DbAdapter = usePostgres ? new PostgresAdapter() : new SqliteAdapter();

const db = {
  prepare: adapter.prepare.bind(adapter),
  transaction: adapter.transaction.bind(adapter),
  exec: adapter.exec.bind(adapter),
  close: adapter.close.bind(adapter),
};

if (!usePostgres) {
  const sqliteDb = adapter as SqliteAdapter;
  sqliteDb.exec(`
    CREATE TABLE IF NOT EXISTS car_profile (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      make TEXT NOT NULL,
      model TEXT NOT NULL,
      engine TEXT,
      year INTEGER NOT NULL,
      license_plate TEXT NOT NULL,
      vin TEXT,
      mileage INTEGER NOT NULL,
      last_revision_date TEXT,
      is_active INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS revisions (
      id TEXT PRIMARY KEY,
      date TEXT NOT NULL,
      mileage INTEGER NOT NULL,
      inspector_name TEXT NOT NULL,
      notes TEXT,
      status TEXT NOT NULL,
      car_id INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS revision_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      revision_id TEXT NOT NULL,
      category TEXT NOT NULL,
      name TEXT NOT NULL,
      status TEXT NOT NULL,
      value TEXT,
      notes TEXT,
      FOREIGN KEY(revision_id) REFERENCES revisions(id) ON DELETE CASCADE
    );
  `);

  try {
    sqliteDb.exec('ALTER TABLE car_profile ADD COLUMN engine TEXT');
  } catch {
    // Already exists
  }

  try {
    sqliteDb.exec('ALTER TABLE car_profile ADD COLUMN is_active INTEGER NOT NULL DEFAULT 0');
  } catch {
    // Already exists
  }

  try {
    sqliteDb.exec('ALTER TABLE revisions ADD COLUMN car_id INTEGER NOT NULL DEFAULT 1');
  } catch {
    // Already exists
  }

  const activeCar = sqliteDb.prepare('SELECT id FROM car_profile WHERE is_active = 1 ORDER BY id LIMIT 1').get() as { id: number } | undefined;
  const fallbackCarId = activeCar?.id ?? (sqliteDb.prepare('SELECT id FROM car_profile ORDER BY id LIMIT 1').get() as { id: number } | undefined)?.id ?? 1;

  sqliteDb.prepare('UPDATE car_profile SET is_active = CASE WHEN id = ? THEN 1 ELSE 0 END').run(fallbackCarId);
  sqliteDb.prepare('UPDATE revisions SET car_id = ? WHERE car_id IS NULL').run(fallbackCarId);

  const carCountResult = sqliteDb.prepare('SELECT COUNT(*) as count FROM car_profile').get() as { count: number };
  if (carCountResult.count === 0) {
    const createdCar = sqliteDb.prepare(`
      INSERT INTO car_profile (make, model, engine, year, license_plate, vin, mileage, last_revision_date, is_active)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run('Porsche', '911 Carrera S (992)', '3.0 T Biturbo 450 CV', 2022, '911-DBX', 'WP0AD2A9XNS254911', 24500, '2026-01-15', 1);

    const createdCarId = Number(createdCar.lastInsertRowid);
    sqliteDb.prepare(`
      INSERT INTO revisions (id, date, mileage, inspector_name, notes, status, car_id)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run('rev-sample-1', '2026-01-15', 24500, 'Alex Martinez', 'Revisión general rutinaria. El coche está en excelente estado, solo se observó desgaste menor en pastillas delanteras.', 'Conditional', createdCarId);

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

    const insertItem = sqliteDb.prepare(`
      INSERT INTO revision_items (revision_id, category, name, status, value, notes)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    for (const item of sampleItems) {
      insertItem.run('rev-sample-1', item.category, item.name, item.status, item.value, item.notes);
    }
  }
}

export default db;
export interface CarProfile {
  id: number;
  make: string;
  model: string;
  engine: string | null;
  year: number;
  license_plate: string;
  vin: string;
  mileage: number;
  last_revision_date: string | null;
  is_active: number;
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
