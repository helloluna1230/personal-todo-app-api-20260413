const { getDb } = require('./db');
const { resolveCategory } = require('./category');

/**
 * Maps a raw SQLite row to the canonical Task projection used by the
 * task-organization (read-model) layer.
 */
function rowToTask(row) {
  return {
    id: row.id,
    title: row.title,
    status: row.status || 'TODO',
    priority: row.priority || 'MEDIUM',
    category: resolveCategory(row.category),
    dueAt: row.due_at || null,
    remindAt: row.remind_at || null,
    completedAt: row.completed_at || null,
    version: row.version,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ---------------------------------------------------------------------------
// Read-only query functions (task-organization layer)
// ---------------------------------------------------------------------------

function getAllTasks({ category } = {}) {
  const db = getDb();
  if (category) {
    return db.prepare('SELECT * FROM tasks WHERE category = ? ORDER BY id').all(category).map(rowToTask);
  }
  return db.prepare('SELECT * FROM tasks ORDER BY id').all().map(rowToTask);
}

function getTaskById(id) {
  const db = getDb();
  const row = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);
  return row ? rowToTask(row) : null;
}

module.exports = { getAllTasks, getTaskById, rowToTask };
