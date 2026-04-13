const { getDb } = require('./db');
const { resolveCategory } = require('./category');
const { getTaskById } = require('./tasks');

const VALID_STATUSES = ['TODO', 'DONE'];
const VALID_PRIORITIES = ['LOW', 'MEDIUM', 'HIGH'];

/**
 * Returns true if the given string is a recognised IANA timezone identifier.
 * Uses Intl.DateTimeFormat construction which accepts all valid IANA identifiers
 * (including 'UTC') and throws a RangeError for invalid ones.
 */
function isValidTimezone(tz) {
  if (!tz || typeof tz !== 'string') return false;
  try {
    Intl.DateTimeFormat(undefined, { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/**
 * TaskCommandService — the single-writer entry point for the Task aggregate.
 * All state-mutating operations on tasks MUST go through this service to
 * preserve the single-writer boundary defined in the main architecture.
 */

function createTask({ title, status, priority, category, dueAt, remindAt, timezone }) {
  const db = getDb();
  const resolvedCategory = resolveCategory(category);
  const resolvedStatus = VALID_STATUSES.includes(status) ? status : 'TODO';
  const resolvedPriority = VALID_PRIORITIES.includes(priority) ? priority : 'MEDIUM';
  const resolvedTimezone = timezone || 'UTC';
  if (!isValidTimezone(resolvedTimezone)) {
    throw new Error(`Invalid timezone: "${resolvedTimezone}". Must be a valid IANA timezone identifier (e.g. UTC, Asia/Taipei).`);
  }

  const result = db
    .prepare(
      `INSERT INTO tasks (title, status, priority, category, due_at, remind_at, timezone, version, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 1, datetime('now'), datetime('now'))`
    )
    .run(title, resolvedStatus, resolvedPriority, resolvedCategory, dueAt || null, remindAt || null, resolvedTimezone);

  return getTaskById(result.lastInsertRowid);
}

function updateTask(id, { title, status, priority, category, dueAt, remindAt, timezone }) {
  const db = getDb();
  const existing = getTaskById(id);
  if (!existing) return null;

  const newTitle = title !== undefined ? title : existing.title;
  const newStatus = status !== undefined && VALID_STATUSES.includes(status) ? status : existing.status;
  const newPriority =
    priority !== undefined && VALID_PRIORITIES.includes(priority) ? priority : existing.priority;
  const newCategory = category !== undefined ? resolveCategory(category) : existing.category;
  const newDueAt = dueAt !== undefined ? dueAt || null : existing.dueAt;
  const newRemindAt = remindAt !== undefined ? remindAt || null : existing.remindAt;
  const newTimezone = timezone !== undefined ? timezone || 'UTC' : existing.timezone;
  if (timezone !== undefined && !isValidTimezone(newTimezone)) {
    throw new Error(`Invalid timezone: "${newTimezone}". Must be a valid IANA timezone identifier (e.g. UTC, Asia/Taipei).`);
  }

  // Set completedAt when transitioning to DONE; clear it when reverting to TODO
  let completedAt = existing.completedAt;
  if (newStatus === 'DONE' && existing.status !== 'DONE') {
    completedAt = new Date().toISOString();
  } else if (newStatus === 'TODO' && existing.status === 'DONE') {
    completedAt = null;
  }

  db.prepare(
    `UPDATE tasks
     SET title = ?, status = ?, priority = ?, category = ?,
         due_at = ?, remind_at = ?, completed_at = ?, timezone = ?,
         version = version + 1,
         updated_at = datetime('now')
     WHERE id = ?`
  ).run(newTitle, newStatus, newPriority, newCategory, newDueAt, newRemindAt, completedAt, newTimezone, id);

  return getTaskById(id);
}

function deleteTask(id) {
  const db = getDb();
  const result = db.prepare('DELETE FROM tasks WHERE id = ?').run(id);
  return result.changes > 0;
}

module.exports = { createTask, updateTask, deleteTask, VALID_STATUSES, VALID_PRIORITIES, isValidTimezone };
