import fs from 'fs';
import path from 'path';
import { Pool, PoolClient, QueryResultRow } from 'pg';
import { normalizeBadge, SUPREME_ADMIN_BADGE, SUPREME_ADMIN_ID } from '@/lib/auth';
import {
  Database,
  Employee,
  EmployeeRole,
  Tool,
  ToolCategory,
  ToolCondition,
  Withdrawal,
  WithdrawalStatus,
} from '@/lib/types';

const DATABASE_URL =
  process.env.DATABASE_URL ||
  process.env.POSTGRES_URL ||
  process.env.POSTGRES_URL_NON_POOLING ||
  process.env.POSTGRES_PRISMA_URL;
const LEGACY_DB_PATH = path.join(process.cwd(), 'data', 'db.json');
const TOOLS_CATALOG_VERSION = 'mining-industrial-v1';
const SUPREME_ADMIN_VERSION = 'supreme-admin-v1';

let pool: Pool | null = null;
let initializationPromise: Promise<void> | null = null;

type EmployeeRow = {
  id: string;
  name: string;
  role: EmployeeRole;
  badge: string;
  password: string;
  department: string;
  shift: Employee['shift'];
  photo_url: string | null;
};

type ToolRow = {
  id: string;
  name: string;
  category: ToolCategory;
  code: string;
  description: string;
  available: boolean;
  condition: ToolCondition;
  location: string;
  photo_url: string | null;
};

type WithdrawalRow = {
  id: string;
  tool_id: string;
  employee_id: string;
  withdrawn_at: string | Date;
  expected_return_at: string | Date | null;
  returned_at: string | Date | null;
  status: WithdrawalStatus;
  cost_center: string | null;
  notes: string | null;
};

type Queryable = Pool | PoolClient;

function getPool() {
  if (!DATABASE_URL) {
    throw new Error('DATABASE_URL não configurada. Configure a URL do PostgreSQL para iniciar o sistema.');
  }

  if (pool) {
    return pool;
  }

  pool = new Pool({ connectionString: DATABASE_URL });
  return pool;
}

async function firstRow<T extends QueryResultRow>(db: Queryable, text: string, values: unknown[] = []) {
  const result = await db.query<T>(text, values);
  return result.rows[0];
}

async function runTransaction<T>(callback: (client: PoolClient) => Promise<T>) {
  const currentPool = getPool();
  const client = await currentPool.connect();

  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function getMeta(db: Queryable, key: string) {
  const row = await firstRow<{ value: string }>(db, `SELECT value FROM app_meta WHERE key = $1`, [key]);
  return row?.value || null;
}

async function setMeta(db: Queryable, key: string, value: string) {
  await db.query(
    `
      INSERT INTO app_meta (key, value)
      VALUES ($1, $2)
      ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value
    `,
    [key, value]
  );
}

async function findAvailableBadge(db: Queryable) {
  for (let value = 100; value <= 999999; value += 1) {
    const badge = String(value).padStart(3, '0');
    const exists = await firstRow<{ id: string }>(db, `SELECT id FROM employees WHERE badge = $1 LIMIT 1`, [badge]);
    if (!exists) {
      return badge;
    }
  }

  return `${Date.now()}`.slice(-6);
}

async function seedFromLegacy(legacy: Database) {
  await runTransaction(async (client) => {
    for (const employee of legacy.employees) {
      await client.query(
        `
          INSERT INTO employees (id, name, role, badge, password, department, shift, photo_url)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          ON CONFLICT (id) DO NOTHING
        `,
        [
          employee.id,
          employee.name,
          employee.role,
          employee.badge,
          employee.password,
          employee.department,
          employee.shift,
          employee.photoUrl || null,
        ]
      );
    }

    for (const tool of legacy.tools) {
      await client.query(
        `
          INSERT INTO tools (id, name, category, code, description, available, condition, location, photo_url)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          ON CONFLICT (id) DO NOTHING
        `,
        [
          tool.id,
          tool.name,
          tool.category,
          tool.code,
          tool.description,
          tool.available,
          tool.condition,
          tool.location,
          tool.photoUrl || null,
        ]
      );
    }

    for (const withdrawal of legacy.withdrawals) {
      await client.query(
        `
          INSERT INTO withdrawals (
            id,
            tool_id,
            employee_id,
            withdrawn_at,
            expected_return_at,
            returned_at,
            status,
            cost_center,
            notes
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          ON CONFLICT (id) DO NOTHING
        `,
        [
          withdrawal.id,
          withdrawal.toolId,
          withdrawal.employeeId,
          withdrawal.withdrawnAt,
          withdrawal.expectedReturnAt || null,
          withdrawal.returnedAt || null,
          withdrawal.status,
          withdrawal.costCenter || null,
          withdrawal.notes || null,
        ]
      );
    }
  });
}

async function syncToolsCatalogIfNeeded(db: Queryable) {
  const current = await getMeta(db, 'tools_catalog_version');
  if (current === TOOLS_CATALOG_VERSION) {
    return;
  }

  if (!fs.existsSync(LEGACY_DB_PATH)) {
    await setMeta(db, 'tools_catalog_version', TOOLS_CATALOG_VERSION);
    return;
  }

  const raw = fs.readFileSync(LEGACY_DB_PATH, 'utf-8');
  const legacy = JSON.parse(raw) as Database;
  const catalogTools = legacy.tools.filter((tool) => /^tool-0\d{2}$/.test(tool.id));

  await runTransaction(async (client) => {
    for (const tool of catalogTools) {
      const existing = await firstRow<{ id: string; code: string }>(
        client,
        `SELECT id, code FROM tools WHERE id = $1`,
        [tool.id]
      );

      if (!existing) {
        await client.query(
          `
            INSERT INTO tools (id, name, category, code, description, available, condition, location, photo_url)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          `,
          [
            tool.id,
            tool.name,
            tool.category,
            tool.code,
            tool.description,
            tool.available,
            tool.condition,
            tool.location,
            tool.photoUrl || null,
          ]
        );
        continue;
      }

      let nextCode = tool.code;
      const codeOwner = await firstRow<{ id: string }>(client, `SELECT id FROM tools WHERE code = $1 LIMIT 1`, [
        nextCode,
      ]);
      if (codeOwner && codeOwner.id !== tool.id) {
        nextCode = existing.code;
      }

      await client.query(
        `
          UPDATE tools
          SET name = $1, category = $2, code = $3, description = $4, location = $5
          WHERE id = $6
        `,
        [tool.name, tool.category, nextCode, tool.description, tool.location, tool.id]
      );
    }

    await setMeta(client, 'tools_catalog_version', TOOLS_CATALOG_VERSION);
  });
}

async function syncSupremeAdminIfNeeded(db: Queryable) {
  const current = await getMeta(db, 'supreme_admin_version');
  if (current === SUPREME_ADMIN_VERSION) {
    return;
  }

  await runTransaction(async (client) => {
    const supremeById = await firstRow<{ id: string }>(client, `SELECT id FROM employees WHERE id = $1 LIMIT 1`, [
      SUPREME_ADMIN_ID,
    ]);
    const supremeByLegacyBadge = await firstRow<{ id: string }>(
      client,
      `SELECT id FROM employees WHERE badge = '900' LIMIT 1`
    );
    const reservedHolder = await firstRow<{ id: string }>(
      client,
      `SELECT id FROM employees WHERE badge = $1 LIMIT 1`,
      [SUPREME_ADMIN_BADGE]
    );

    const promotedId = supremeById?.id || supremeByLegacyBadge?.id;

    if (reservedHolder && promotedId && reservedHolder.id !== promotedId) {
      const nextBadge = await findAvailableBadge(client);
      await client.query(`UPDATE employees SET badge = $1 WHERE id = $2`, [nextBadge, reservedHolder.id]);
    }

    const reservedAfterReassign = await firstRow<{ id: string }>(
      client,
      `SELECT id FROM employees WHERE badge = $1 LIMIT 1`,
      [SUPREME_ADMIN_BADGE]
    );

    const fallbackAdmin = await firstRow<{ id: string }>(
      client,
      `
        SELECT id
        FROM employees
        ORDER BY CASE WHEN role = 'admin' THEN 0 ELSE 1 END, name ASC
        LIMIT 1
      `
    );

    const targetId = promotedId || reservedAfterReassign?.id || fallbackAdmin?.id;
    if (targetId) {
      await client.query(
        `
          UPDATE employees
          SET badge = $1, role = 'admin'
          WHERE id = $2
        `,
        [SUPREME_ADMIN_BADGE, targetId]
      );
    }

    await setMeta(client, 'supreme_admin_version', SUPREME_ADMIN_VERSION);
  });
}

async function initializeDatabase() {
  const db = getPool();

  await db.query(`
    CREATE TABLE IF NOT EXISTS app_meta (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS employees (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      role TEXT NOT NULL,
      badge TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      department TEXT NOT NULL,
      shift TEXT NOT NULL,
      photo_url TEXT
    );

    CREATE TABLE IF NOT EXISTS tools (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      code TEXT NOT NULL UNIQUE,
      description TEXT NOT NULL,
      available BOOLEAN NOT NULL DEFAULT TRUE,
      condition TEXT NOT NULL,
      location TEXT NOT NULL,
      photo_url TEXT
    );

    CREATE TABLE IF NOT EXISTS withdrawals (
      id TEXT PRIMARY KEY,
      tool_id TEXT NOT NULL REFERENCES tools (id) ON DELETE RESTRICT,
      employee_id TEXT NOT NULL REFERENCES employees (id) ON DELETE RESTRICT,
      withdrawn_at TIMESTAMPTZ NOT NULL,
      expected_return_at TIMESTAMPTZ,
      returned_at TIMESTAMPTZ,
      status TEXT NOT NULL,
      cost_center TEXT,
      notes TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_employees_badge ON employees (badge);
    CREATE INDEX IF NOT EXISTS idx_tools_available ON tools (available);
    CREATE INDEX IF NOT EXISTS idx_withdrawals_status ON withdrawals (status);
    CREATE INDEX IF NOT EXISTS idx_withdrawals_tool_status ON withdrawals (tool_id, status);
    CREATE INDEX IF NOT EXISTS idx_withdrawals_employee_status ON withdrawals (employee_id, status);
  `);

  const counts = await firstRow<{
    employees_count: string;
    tools_count: string;
    withdrawals_count: string;
  }>(
    db,
    `
      SELECT
        (SELECT COUNT(*)::text FROM employees) AS employees_count,
        (SELECT COUNT(*)::text FROM tools) AS tools_count,
        (SELECT COUNT(*)::text FROM withdrawals) AS withdrawals_count
    `
  );

  const hasExistingData = Boolean(
    counts &&
      (Number.parseInt(counts.employees_count, 10) > 0 ||
        Number.parseInt(counts.tools_count, 10) > 0 ||
        Number.parseInt(counts.withdrawals_count, 10) > 0)
  );

  if (!hasExistingData && fs.existsSync(LEGACY_DB_PATH)) {
    const raw = fs.readFileSync(LEGACY_DB_PATH, 'utf-8');
    const legacy = JSON.parse(raw) as Database;
    await seedFromLegacy(legacy);
  }

  await setMeta(db, 'initialized_at', new Date().toISOString());
  await syncSupremeAdminIfNeeded(db);
  await syncToolsCatalogIfNeeded(db);
}

async function ensureInitialized() {
  if (initializationPromise) {
    return initializationPromise;
  }

  initializationPromise = initializeDatabase().catch((error) => {
    initializationPromise = null;
    throw error;
  });

  return initializationPromise;
}

function mapEmployee(row: EmployeeRow): Employee {
  return {
    id: row.id,
    name: row.name,
    role: row.role,
    badge: row.badge,
    password: row.password,
    department: row.department,
    shift: row.shift,
    photoUrl: row.photo_url || undefined,
  };
}

function mapTool(row: ToolRow): Tool {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    code: row.code,
    description: row.description,
    available: row.available,
    condition: row.condition,
    location: row.location,
    photoUrl: row.photo_url || undefined,
  };
}

function timestampToString(value: string | Date | null) {
  if (!value) return undefined;
  if (value instanceof Date) return value.toISOString();
  return value;
}

function mapWithdrawal(row: WithdrawalRow): Withdrawal {
  return {
    id: row.id,
    toolId: row.tool_id,
    employeeId: row.employee_id,
    withdrawnAt: timestampToString(row.withdrawn_at) || '',
    expectedReturnAt: timestampToString(row.expected_return_at),
    returnedAt: timestampToString(row.returned_at),
    status: row.status,
    costCenter: row.cost_center || undefined,
    notes: row.notes || '',
  };
}

export async function getEmployees() {
  await ensureInitialized();
  const db = getPool();
  const result = await db.query<EmployeeRow>(`SELECT * FROM employees ORDER BY name ASC`);
  return result.rows.map(mapEmployee);
}

export async function getEmployeeById(id: string) {
  await ensureInitialized();
  const db = getPool();
  const row = await firstRow<EmployeeRow>(db, `SELECT * FROM employees WHERE id = $1`, [id]);
  return row ? mapEmployee(row) : null;
}

export async function getEmployeeByBadgeAndPassword(badge: string, password: string) {
  await ensureInitialized();
  const db = getPool();
  const row = await firstRow<EmployeeRow>(
    db,
    `SELECT * FROM employees WHERE badge = $1 AND password = $2 LIMIT 1`,
    [normalizeBadge(badge), password]
  );

  return row ? mapEmployee(row) : null;
}

export async function employeeBadgeExists(badge: string, excludeId?: string) {
  await ensureInitialized();
  const db = getPool();
  const normalizedBadge = normalizeBadge(badge);

  const row = excludeId
    ? await firstRow<{ id: string }>(db, `SELECT id FROM employees WHERE badge = $1 AND id != $2 LIMIT 1`, [
        normalizedBadge,
        excludeId,
      ])
    : await firstRow<{ id: string }>(db, `SELECT id FROM employees WHERE badge = $1 LIMIT 1`, [normalizedBadge]);

  return Boolean(row);
}

export async function createEmployee(employee: Employee) {
  await ensureInitialized();
  const db = getPool();

  await db.query(
    `
      INSERT INTO employees (id, name, role, badge, password, department, shift, photo_url)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `,
    [
      employee.id,
      employee.name,
      employee.role,
      employee.badge,
      employee.password,
      employee.department,
      employee.shift,
      employee.photoUrl || null,
    ]
  );

  return employee;
}

export async function updateEmployee(employee: Employee) {
  await ensureInitialized();
  const db = getPool();

  const result = await db.query(
    `
      UPDATE employees
      SET name = $1, role = $2, badge = $3, password = $4, department = $5, shift = $6, photo_url = $7
      WHERE id = $8
    `,
    [
      employee.name,
      employee.role,
      employee.badge,
      employee.password,
      employee.department,
      employee.shift,
      employee.photoUrl || null,
      employee.id,
    ]
  );

  return (result.rowCount ?? 0) > 0 ? employee : null;
}

export async function deleteEmployeeById(id: string) {
  await ensureInitialized();
  const db = getPool();
  const result = await db.query(`DELETE FROM employees WHERE id = $1`, [id]);
  return (result.rowCount ?? 0) > 0;
}

export async function deleteWithdrawalsByEmployeeId(employeeId: string) {
  await ensureInitialized();
  const db = getPool();
  const result = await db.query(`DELETE FROM withdrawals WHERE employee_id = $1`, [employeeId]);
  return result.rowCount ?? 0;
}

export async function hasActiveWithdrawalForEmployee(employeeId: string) {
  await ensureInitialized();
  const db = getPool();
  const row = await firstRow<{ id: string }>(
    db,
    `SELECT id FROM withdrawals WHERE employee_id = $1 AND status = 'active' LIMIT 1`,
    [employeeId]
  );

  return Boolean(row);
}

export async function getTools() {
  await ensureInitialized();
  const db = getPool();
  const result = await db.query<ToolRow>(`SELECT * FROM tools ORDER BY name ASC`);
  return result.rows.map(mapTool);
}

export async function getToolById(id: string) {
  await ensureInitialized();
  const db = getPool();
  const row = await firstRow<ToolRow>(db, `SELECT * FROM tools WHERE id = $1`, [id]);
  return row ? mapTool(row) : null;
}

export async function createTool(tool: Tool) {
  await ensureInitialized();
  const db = getPool();

  await db.query(
    `
      INSERT INTO tools (id, name, category, code, description, available, condition, location, photo_url)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    `,
    [
      tool.id,
      tool.name,
      tool.category,
      tool.code,
      tool.description,
      tool.available,
      tool.condition,
      tool.location,
      tool.photoUrl || null,
    ]
  );

  return tool;
}

export async function updateTool(tool: Tool) {
  await ensureInitialized();
  const db = getPool();
  const result = await db.query(
    `
      UPDATE tools
      SET name = $1, category = $2, code = $3, description = $4, available = $5, condition = $6, location = $7, photo_url = $8
      WHERE id = $9
    `,
    [
      tool.name,
      tool.category,
      tool.code,
      tool.description,
      tool.available,
      tool.condition,
      tool.location,
      tool.photoUrl || null,
      tool.id,
    ]
  );

  return (result.rowCount ?? 0) > 0 ? tool : null;
}

export async function deleteToolById(id: string) {
  await ensureInitialized();
  const db = getPool();
  const result = await db.query(`DELETE FROM tools WHERE id = $1`, [id]);
  return (result.rowCount ?? 0) > 0;
}

export async function hasActiveWithdrawalForTool(toolId: string) {
  await ensureInitialized();
  const db = getPool();
  const row = await firstRow<{ id: string }>(
    db,
    `SELECT id FROM withdrawals WHERE tool_id = $1 AND status = 'active' LIMIT 1`,
    [toolId]
  );

  return Boolean(row);
}

export async function getWithdrawals() {
  await ensureInitialized();
  const db = getPool();
  const result = await db.query<WithdrawalRow>(`SELECT * FROM withdrawals ORDER BY withdrawn_at DESC`);
  return result.rows.map(mapWithdrawal);
}

export async function getWithdrawalById(id: string) {
  await ensureInitialized();
  const db = getPool();
  const row = await firstRow<WithdrawalRow>(db, `SELECT * FROM withdrawals WHERE id = $1`, [id]);
  return row ? mapWithdrawal(row) : null;
}

export async function createWithdrawal(withdrawal: Withdrawal) {
  await ensureInitialized();

  return runTransaction(async (client) => {
    await client.query(
      `
        INSERT INTO withdrawals (
          id,
          tool_id,
          employee_id,
          withdrawn_at,
          expected_return_at,
          returned_at,
          status,
          cost_center,
          notes
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `,
      [
        withdrawal.id,
        withdrawal.toolId,
        withdrawal.employeeId,
        withdrawal.withdrawnAt,
        withdrawal.expectedReturnAt || null,
        withdrawal.returnedAt || null,
        withdrawal.status,
        withdrawal.costCenter || null,
        withdrawal.notes || null,
      ]
    );

    await client.query(`UPDATE tools SET available = FALSE WHERE id = $1`, [withdrawal.toolId]);
    return withdrawal;
  });
}

export async function returnWithdrawal(
  withdrawalId: string,
  updates: { notes?: string; condition?: ToolCondition }
) {
  await ensureInitialized();

  return runTransaction(async (client) => {
    const existingRow = await firstRow<WithdrawalRow>(client, `SELECT * FROM withdrawals WHERE id = $1`, [
      withdrawalId,
    ]);

    if (!existingRow) {
      return null;
    }

    const returnedAt = new Date().toISOString();
    const nextNotes = updates.notes !== undefined ? String(updates.notes) : existingRow.notes || '';

    await client.query(
      `
        UPDATE withdrawals
        SET status = 'returned', returned_at = $1, notes = $2
        WHERE id = $3
      `,
      [returnedAt, nextNotes, withdrawalId]
    );

    if (updates.condition) {
      await client.query(
        `
          UPDATE tools
          SET available = TRUE, condition = $1
          WHERE id = $2
        `,
        [updates.condition, existingRow.tool_id]
      );
    } else {
      await client.query(
        `
          UPDATE tools
          SET available = TRUE
          WHERE id = $1
        `,
        [existingRow.tool_id]
      );
    }

    const updatedRow = await firstRow<WithdrawalRow>(client, `SELECT * FROM withdrawals WHERE id = $1`, [
      withdrawalId,
    ]);

    return updatedRow ? mapWithdrawal(updatedRow) : null;
  });
}

export async function getDatabaseSnapshot(): Promise<Database> {
  const [employees, tools, withdrawals] = await Promise.all([getEmployees(), getTools(), getWithdrawals()]);
  return {
    employees,
    tools,
    withdrawals,
  };
}

export function getDatabasePath() {
  return DATABASE_URL || 'DATABASE_URL não configurada';
}
