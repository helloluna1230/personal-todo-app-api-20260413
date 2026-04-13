const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', 'todo.db');

let db;

function getDb() {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    migrate(db);
  }
  return db;
}

function migrate(database) {
  database.exec(`
    CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'TODO',
      priority TEXT NOT NULL DEFAULT 'MEDIUM',
      category TEXT NOT NULL DEFAULT 'WORK',
      due_at TEXT,
      remind_at TEXT,
      completed_at TEXT,
      version INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  // Idempotent column additions for databases created before this schema version
  const columns = database.pragma('table_info(tasks)').map((c) => c.name);
  if (!columns.includes('category')) {
    database.exec(`ALTER TABLE tasks ADD COLUMN category TEXT NOT NULL DEFAULT 'WORK'`);
  }
  if (!columns.includes('status')) {
    database.exec(`ALTER TABLE tasks ADD COLUMN status TEXT NOT NULL DEFAULT 'TODO'`);
  }
  if (!columns.includes('priority')) {
    database.exec(`ALTER TABLE tasks ADD COLUMN priority TEXT NOT NULL DEFAULT 'MEDIUM'`);
  }
  if (!columns.includes('due_at')) {
    database.exec(`ALTER TABLE tasks ADD COLUMN due_at TEXT`);
  }
  if (!columns.includes('remind_at')) {
    database.exec(`ALTER TABLE tasks ADD COLUMN remind_at TEXT`);
  }
  if (!columns.includes('completed_at')) {
    database.exec(`ALTER TABLE tasks ADD COLUMN completed_at TEXT`);
  }
  if (!columns.includes('version')) {
    database.exec(`ALTER TABLE tasks ADD COLUMN version INTEGER NOT NULL DEFAULT 1`);
  }
}

function closeDb() {
  if (db) {
    db.close();
    db = null;
  }
}

module.exports = { getDb, closeDb };
