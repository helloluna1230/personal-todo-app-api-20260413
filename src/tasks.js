const { getDb } = require('./db');
const { resolveCategory, DEFAULT_CATEGORY } = require('./category');

function rowToTask(row) {
  return {
    id: row.id,
    title: row.title,
    completed: row.completed === 1,
    category: resolveCategory(row.category),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

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

function createTask({ title, completed = false, category }) {
  const db = getDb();
  const resolvedCategory = resolveCategory(category);
  const result = db
    .prepare(
      `INSERT INTO tasks (title, completed, category, created_at, updated_at)
       VALUES (?, ?, ?, datetime('now'), datetime('now'))`
    )
    .run(title, completed ? 1 : 0, resolvedCategory);
  return getTaskById(result.lastInsertRowid);
}

function updateTask(id, { title, completed, category }) {
  const db = getDb();
  const existing = getTaskById(id);
  if (!existing) return null;

  const newTitle = title !== undefined ? title : existing.title;
  const newCompleted = completed !== undefined ? completed : existing.completed;
  const newCategory = category !== undefined ? resolveCategory(category) : existing.category;

  db.prepare(
    `UPDATE tasks SET title = ?, completed = ?, category = ?, updated_at = datetime('now') WHERE id = ?`
  ).run(newTitle, newCompleted ? 1 : 0, newCategory, id);

  return getTaskById(id);
}

function deleteTask(id) {
  const db = getDb();
  const result = db.prepare('DELETE FROM tasks WHERE id = ?').run(id);
  return result.changes > 0;
}

module.exports = { getAllTasks, getTaskById, createTask, updateTask, deleteTask };
