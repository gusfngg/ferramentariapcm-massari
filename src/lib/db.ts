import fs from 'fs';
import os from 'os';
import path from 'path';
import { DatabaseSync } from 'node:sqlite';
import { normalizeBadge, SUPREME_ADMIN_BADGE, SUPREME_ADMIN_ID } from '@/lib/auth';
import { Database, Employee, EmployeeRole, Tool, ToolCategory, ToolCondition, Withdrawal, WithdrawalStatus } from '@/lib/types';

const IS_VERCEL = Boolean(process.env.VERCEL);
const DB_PATH =
  process.env.TOOL_MANAGER_DB_PATH ||
  (IS_VERCEL ? path.join(os.tmpdir(), 'tool-manager.sqlite') : path.join(process.cwd(), 'data', 'tool-manager.sqlite'));
const LEGACY_DB_PATH = path.join(process.cwd(), 'data', 'db.json');
const TOOLS_CATALOG_VERSION = 'mining-industrial-v1';
const SUPREME_ADMIN_VERSION = 'supreme-admin-v1';

let connection: DatabaseSync | null = null;

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
  available: number;
  condition: ToolCondition;
  location: string;
  photo_url: string | null;
};

type WithdrawalRow = {
  id: string;
  tool_id: string;
  employee_id: string;
  withdrawn_at: string;
  expected_return_at: string | null;
  returned_at: string | null;
  status: WithdrawalStatus;
  cost_center: string | null;
  notes: string | null;
};

function getConnection() {
  if (connection) {
    return connection;
  }

  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

  const db = new DatabaseSync(DB_PATH);
  db.exec('PRAGMA journal_mode = WAL;');
  db.exec('PRAGMA foreign_keys = ON;');

  db.exec(`
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
      shift TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS tools (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      code TEXT NOT NULL UNIQUE,
      description TEXT NOT NULL,
      available INTEGER NOT NULL DEFAULT 1,
      condition TEXT NOT NULL,
      location TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS withdrawals (
      id TEXT PRIMARY KEY,
      tool_id TEXT NOT NULL,
      employee_id TEXT NOT NULL,
      withdrawn_at TEXT NOT NULL,
      expected_return_at TEXT,
      returned_at TEXT,
      status TEXT NOT NULL,
      cost_center TEXT,
      notes TEXT,
      FOREIGN KEY (tool_id) REFERENCES tools (id) ON DELETE RESTRICT,
      FOREIGN KEY (employee_id) REFERENCES employees (id) ON DELETE RESTRICT
    );

    CREATE INDEX IF NOT EXISTS idx_employees_badge ON employees (badge);
    CREATE INDEX IF NOT EXISTS idx_tools_available ON tools (available);
    CREATE INDEX IF NOT EXISTS idx_withdrawals_status ON withdrawals (status);
    CREATE INDEX IF NOT EXISTS idx_withdrawals_tool_status ON withdrawals (tool_id, status);
    CREATE INDEX IF NOT EXISTS idx_withdrawals_employee_status ON withdrawals (employee_id, status);
  `);

  ensureColumn(db, 'employees', 'photo_url', 'TEXT');
  ensureColumn(db, 'tools', 'photo_url', 'TEXT');
  ensureColumn(db, 'withdrawals', 'cost_center', 'TEXT');

  initializeDatabase(db);
  syncSupremeAdminIfNeeded(db);
  syncToolsCatalogIfNeeded(db);
  connection = db;
  return db;
}

function ensureColumn(
  db: DatabaseSync,
  table: 'employees' | 'tools' | 'withdrawals',
  column: string,
  definition: string
) {
  const columns = db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[];
  if (columns.some((item) => item.name === column)) {
    return;
  }

  db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
}

function initializeDatabase(db: DatabaseSync) {
  const alreadyInitialized = db
    .prepare(`SELECT value FROM app_meta WHERE key = 'initialized_at'`)
    .get() as { value: string } | undefined;

  if (alreadyInitialized) {
    return;
  }

  const counts = db
    .prepare(`
      SELECT
        (SELECT COUNT(*) FROM employees) AS employees_count,
        (SELECT COUNT(*) FROM tools) AS tools_count,
        (SELECT COUNT(*) FROM withdrawals) AS withdrawals_count
    `)
    .get() as
    | {
        employees_count: number;
        tools_count: number;
        withdrawals_count: number;
      }
    | undefined;

  const hasExistingData = Boolean(
    counts &&
      (counts.employees_count > 0 || counts.tools_count > 0 || counts.withdrawals_count > 0)
  );

  if (!hasExistingData && fs.existsSync(LEGACY_DB_PATH)) {
    const raw = fs.readFileSync(LEGACY_DB_PATH, 'utf-8');
    const legacy = JSON.parse(raw) as Database;

    runTransaction(db, () => {
      const insertEmployee = db.prepare(`
        INSERT INTO employees (id, name, role, badge, password, department, shift, photo_url)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);
      const insertTool = db.prepare(`
        INSERT INTO tools (id, name, category, code, description, available, condition, location, photo_url)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      const insertWithdrawal = db.prepare(`
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
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      for (const employee of legacy.employees) {
        insertEmployee.run(
          employee.id,
          employee.name,
          employee.role,
          employee.badge,
          employee.password,
          employee.department,
          employee.shift,
          employee.photoUrl || null
        );
      }

      for (const tool of legacy.tools) {
        insertTool.run(
          tool.id,
          tool.name,
          tool.category,
          tool.code,
          tool.description,
          tool.available ? 1 : 0,
          tool.condition,
          tool.location,
          tool.photoUrl || null
        );
      }

      for (const withdrawal of legacy.withdrawals) {
        insertWithdrawal.run(
          withdrawal.id,
          withdrawal.toolId,
          withdrawal.employeeId,
          withdrawal.withdrawnAt,
          withdrawal.expectedReturnAt || null,
          withdrawal.returnedAt || null,
          withdrawal.status,
          withdrawal.costCenter || null,
          withdrawal.notes || null
        );
      }
    });
  }

  db.prepare(`
    INSERT OR REPLACE INTO app_meta (key, value)
    VALUES ('initialized_at', ?)
  `).run(new Date().toISOString());
}

function getMeta(db: DatabaseSync, key: string) {
  const row = db.prepare(`SELECT value FROM app_meta WHERE key = ?`).get(key) as { value: string } | undefined;
  return row?.value;
}

function setMeta(db: DatabaseSync, key: string, value: string) {
  db.prepare(`INSERT OR REPLACE INTO app_meta (key, value) VALUES (?, ?)`).run(key, value);
}

function findAvailableBadge(db: DatabaseSync) {
  const existsByBadge = db.prepare(`SELECT id FROM employees WHERE badge = ? LIMIT 1`);

  for (let value = 100; value <= 999999; value += 1) {
    const badge = String(value).padStart(3, '0');
    const existing = existsByBadge.get(badge) as { id: string } | undefined;
    if (!existing) {
      return badge;
    }
  }

  return `${Date.now()}`.slice(-6);
}

function syncToolsCatalogIfNeeded(db: DatabaseSync) {
  const current = getMeta(db, 'tools_catalog_version');
  if (current === TOOLS_CATALOG_VERSION) {
    return;
  }

  if (!fs.existsSync(LEGACY_DB_PATH)) {
    // No legacy JSON available: keep the existing tools as-is.
    setMeta(db, 'tools_catalog_version', TOOLS_CATALOG_VERSION);
    return;
  }

  const raw = fs.readFileSync(LEGACY_DB_PATH, 'utf-8');
  const legacy = JSON.parse(raw) as Database;

  // Only sync the "seed" tool ids (tool-002..tool-020). Tools created by admins usually have random ids,
  // and we should not overwrite those.
  const catalogTools = legacy.tools.filter((tool) => /^tool-0\d{2}$/.test(tool.id));

  runTransaction(db, () => {
    const selectTool = db.prepare(`SELECT id, code FROM tools WHERE id = ?`);
    const selectCodeOwner = db.prepare(`SELECT id FROM tools WHERE code = ? LIMIT 1`);
    const insertTool = db.prepare(`
      INSERT INTO tools (id, name, category, code, description, available, condition, location, photo_url)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const updateTool = db.prepare(`
      UPDATE tools
      SET name = ?, category = ?, code = ?, description = ?, location = ?
      WHERE id = ?
    `);

    for (const tool of catalogTools) {
      const existing = selectTool.get(tool.id) as { id: string; code: string } | undefined;

      if (!existing) {
        insertTool.run(
          tool.id,
          tool.name,
          tool.category,
          tool.code,
          tool.description,
          tool.available ? 1 : 0,
          tool.condition,
          tool.location,
          tool.photoUrl || null
        );
        continue;
      }

      // Avoid UNIQUE(code) conflicts if a code is already taken by another tool.
      let nextCode = tool.code;
      const codeOwner = selectCodeOwner.get(nextCode) as { id: string } | undefined;
      if (codeOwner && codeOwner.id !== tool.id) {
        nextCode = existing.code;
      }

      updateTool.run(tool.name, tool.category, nextCode, tool.description, tool.location, tool.id);
    }

    setMeta(db, 'tools_catalog_version', TOOLS_CATALOG_VERSION);
  });
}

function syncSupremeAdminIfNeeded(db: DatabaseSync) {
  const current = getMeta(db, 'supreme_admin_version');
  if (current === SUPREME_ADMIN_VERSION) {
    return;
  }

  runTransaction(db, () => {
    const supremeById = db
      .prepare(`SELECT id FROM employees WHERE id = ? LIMIT 1`)
      .get(SUPREME_ADMIN_ID) as { id: string } | undefined;
    const supremeByLegacyBadge = db
      .prepare(`SELECT id FROM employees WHERE badge = '900' LIMIT 1`)
      .get() as { id: string } | undefined;
    const reservedHolder = db
      .prepare(`SELECT id FROM employees WHERE badge = ? LIMIT 1`)
      .get(SUPREME_ADMIN_BADGE) as { id: string } | undefined;

    const promotedId = supremeById?.id || supremeByLegacyBadge?.id;

    if (reservedHolder && promotedId && reservedHolder.id !== promotedId) {
      const nextBadge = findAvailableBadge(db);
      db.prepare(`UPDATE employees SET badge = ? WHERE id = ?`).run(nextBadge, reservedHolder.id);
    }

    const reservedAfterReassign = db
      .prepare(`SELECT id FROM employees WHERE badge = ? LIMIT 1`)
      .get(SUPREME_ADMIN_BADGE) as { id: string } | undefined;

    const fallbackAdmin = db
      .prepare(`SELECT id FROM employees ORDER BY CASE WHEN role = 'admin' THEN 0 ELSE 1 END, name ASC LIMIT 1`)
      .get() as { id: string } | undefined;

    const targetId = promotedId || reservedAfterReassign?.id || fallbackAdmin?.id;

    if (targetId) {
      db.prepare(`
        UPDATE employees
        SET badge = ?, role = 'admin'
        WHERE id = ?
      `).run(SUPREME_ADMIN_BADGE, targetId);
    }

    setMeta(db, 'supreme_admin_version', SUPREME_ADMIN_VERSION);
  });
}

function runTransaction<T>(db: DatabaseSync, callback: () => T) {
  db.exec('BEGIN IMMEDIATE');

  try {
    const result = callback();
    db.exec('COMMIT');
    return result;
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
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
    available: Boolean(row.available),
    condition: row.condition,
    location: row.location,
    photoUrl: row.photo_url || undefined,
  };
}

function mapWithdrawal(row: WithdrawalRow): Withdrawal {
  return {
    id: row.id,
    toolId: row.tool_id,
    employeeId: row.employee_id,
    withdrawnAt: row.withdrawn_at,
    expectedReturnAt: row.expected_return_at || undefined,
    returnedAt: row.returned_at || undefined,
    status: row.status,
    costCenter: row.cost_center || undefined,
    notes: row.notes || '',
  };
}

export function getEmployees() {
  const db = getConnection();
  const rows = db.prepare(`SELECT * FROM employees ORDER BY name ASC`).all() as EmployeeRow[];
  return rows.map(mapEmployee);
}

export function getEmployeeById(id: string) {
  const db = getConnection();
  const row = db.prepare(`SELECT * FROM employees WHERE id = ?`).get(id) as EmployeeRow | undefined;
  return row ? mapEmployee(row) : null;
}

export function getEmployeeByBadgeAndPassword(badge: string, password: string) {
  const db = getConnection();
  const row = db
    .prepare(`SELECT * FROM employees WHERE badge = ? AND password = ? LIMIT 1`)
    .get(normalizeBadge(badge), password) as EmployeeRow | undefined;

  return row ? mapEmployee(row) : null;
}

export function employeeBadgeExists(badge: string, excludeId?: string) {
  const db = getConnection();
  const normalizedBadge = normalizeBadge(badge);

  const row = excludeId
    ? (db
        .prepare(`SELECT id FROM employees WHERE badge = ? AND id != ? LIMIT 1`)
        .get(normalizedBadge, excludeId) as { id: string } | undefined)
    : (db
        .prepare(`SELECT id FROM employees WHERE badge = ? LIMIT 1`)
        .get(normalizedBadge) as { id: string } | undefined);

  return Boolean(row);
}

export function createEmployee(employee: Employee) {
  const db = getConnection();

  db.prepare(`
    INSERT INTO employees (id, name, role, badge, password, department, shift, photo_url)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    employee.id,
    employee.name,
    employee.role,
    employee.badge,
    employee.password,
    employee.department,
    employee.shift,
    employee.photoUrl || null
  );

  return employee;
}

export function updateEmployee(employee: Employee) {
  const db = getConnection();
  const result = db.prepare(`
    UPDATE employees
    SET name = ?, role = ?, badge = ?, password = ?, department = ?, shift = ?, photo_url = ?
    WHERE id = ?
  `).run(
    employee.name,
    employee.role,
    employee.badge,
    employee.password,
    employee.department,
    employee.shift,
    employee.photoUrl || null,
    employee.id
  );

  return result.changes > 0 ? employee : null;
}

export function deleteEmployeeById(id: string) {
  const db = getConnection();
  const result = db.prepare(`DELETE FROM employees WHERE id = ?`).run(id);
  return result.changes > 0;
}

export function deleteWithdrawalsByEmployeeId(employeeId: string) {
  const db = getConnection();
  const result = db.prepare(`DELETE FROM withdrawals WHERE employee_id = ?`).run(employeeId);
  return result.changes;
}

export function hasActiveWithdrawalForEmployee(employeeId: string) {
  const db = getConnection();
  const row = db
    .prepare(`SELECT id FROM withdrawals WHERE employee_id = ? AND status = 'active' LIMIT 1`)
    .get(employeeId) as { id: string } | undefined;

  return Boolean(row);
}

export function getTools() {
  const db = getConnection();
  const rows = db.prepare(`SELECT * FROM tools ORDER BY name ASC`).all() as ToolRow[];
  return rows.map(mapTool);
}

export function getToolById(id: string) {
  const db = getConnection();
  const row = db.prepare(`SELECT * FROM tools WHERE id = ?`).get(id) as ToolRow | undefined;
  return row ? mapTool(row) : null;
}

export function createTool(tool: Tool) {
  const db = getConnection();

  db.prepare(`
    INSERT INTO tools (id, name, category, code, description, available, condition, location, photo_url)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    tool.id,
    tool.name,
    tool.category,
    tool.code,
    tool.description,
    tool.available ? 1 : 0,
    tool.condition,
    tool.location,
    tool.photoUrl || null
  );

  return tool;
}

export function updateTool(tool: Tool) {
  const db = getConnection();
  const result = db.prepare(`
    UPDATE tools
    SET name = ?, category = ?, code = ?, description = ?, available = ?, condition = ?, location = ?, photo_url = ?
    WHERE id = ?
  `).run(
    tool.name,
    tool.category,
    tool.code,
    tool.description,
    tool.available ? 1 : 0,
    tool.condition,
    tool.location,
    tool.photoUrl || null,
    tool.id
  );

  return result.changes > 0 ? tool : null;
}

export function deleteToolById(id: string) {
  const db = getConnection();
  const result = db.prepare(`DELETE FROM tools WHERE id = ?`).run(id);
  return result.changes > 0;
}

export function hasActiveWithdrawalForTool(toolId: string) {
  const db = getConnection();
  const row = db
    .prepare(`SELECT id FROM withdrawals WHERE tool_id = ? AND status = 'active' LIMIT 1`)
    .get(toolId) as { id: string } | undefined;

  return Boolean(row);
}

export function getWithdrawals() {
  const db = getConnection();
  const rows = db
    .prepare(`SELECT * FROM withdrawals ORDER BY withdrawn_at DESC`)
    .all() as WithdrawalRow[];

  return rows.map(mapWithdrawal);
}

export function getWithdrawalById(id: string) {
  const db = getConnection();
  const row = db.prepare(`SELECT * FROM withdrawals WHERE id = ?`).get(id) as WithdrawalRow | undefined;
  return row ? mapWithdrawal(row) : null;
}

export function createWithdrawal(withdrawal: Withdrawal) {
  const db = getConnection();

  return runTransaction(db, () => {
    db.prepare(`
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
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      withdrawal.id,
      withdrawal.toolId,
      withdrawal.employeeId,
      withdrawal.withdrawnAt,
      withdrawal.expectedReturnAt || null,
      withdrawal.returnedAt || null,
      withdrawal.status,
      withdrawal.costCenter || null,
      withdrawal.notes || null
    );

    db.prepare(`UPDATE tools SET available = 0 WHERE id = ?`).run(withdrawal.toolId);
    return withdrawal;
  });
}

export function returnWithdrawal(
  withdrawalId: string,
  updates: { notes?: string; condition?: ToolCondition }
) {
  const db = getConnection();

  return runTransaction(db, () => {
    const existingRow = db
      .prepare(`SELECT * FROM withdrawals WHERE id = ?`)
      .get(withdrawalId) as WithdrawalRow | undefined;

    if (!existingRow) {
      return null;
    }

    const returnedAt = new Date().toISOString();
    const nextNotes = updates.notes !== undefined ? String(updates.notes) : existingRow.notes || '';

    db.prepare(`
      UPDATE withdrawals
      SET status = 'returned', returned_at = ?, notes = ?
      WHERE id = ?
    `).run(returnedAt, nextNotes, withdrawalId);

    if (updates.condition) {
      db.prepare(`
        UPDATE tools
        SET available = 1, condition = ?
        WHERE id = ?
      `).run(updates.condition, existingRow.tool_id);
    } else {
      db.prepare(`
        UPDATE tools
        SET available = 1
        WHERE id = ?
      `).run(existingRow.tool_id);
    }

    const updatedRow = db
      .prepare(`SELECT * FROM withdrawals WHERE id = ?`)
      .get(withdrawalId) as WithdrawalRow;

    return mapWithdrawal(updatedRow);
  });
}

export function getDatabaseSnapshot(): Database {
  return {
    employees: getEmployees(),
    tools: getTools(),
    withdrawals: getWithdrawals(),
  };
}

export function getDatabasePath() {
  return DB_PATH;
}
