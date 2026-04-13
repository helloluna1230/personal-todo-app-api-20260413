'use strict';

const emitter = require('../events/eventEmitter');
const { getTaskProjection } = require('../utils/timeProjection');

/**
 * Shared read model: task_time_projection store.
 *
 * Owned by the deadline-reminder module.  All reads of a task's time-projection
 * status (today-view, homepage summary, reminder panel) must go through this
 * store rather than computing a projection independently.  This guarantees a
 * single authoritative source for `timeStatus` across the whole application.
 *
 * The store maps taskId → the latest task snapshot (plain task object from the
 * write model).  `getProjection` derives `timeStatus` from the snapshot at
 * read time, so that queries always reflect the current wall-clock.  The store
 * is kept in sync with the write model via domain events:
 *
 *   task.created   → record the initial snapshot
 *   task.completed → replace snapshot so future reads return DONE
 *
 * @type {Map<string, Object>}
 */
const store = new Map();

/**
 * Record (or replace) the task snapshot in the store.
 *
 * @param {Object} task - Plain task object from the write model
 */
function putSnapshot(task) {
  if (!task || !task.id) return;
  store.set(task.id, task);
}

/**
 * Return the time-projection for a task.
 *
 * Reads the stored snapshot and computes `timeStatus` against `now`.
 *
 * @param {string} taskId
 * @param {Date}  [now] - Current time; defaults to new Date()
 * @returns {Object|null} task_time_projection, or null when not found
 */
function getProjection(taskId, now = new Date()) {
  const task = store.get(taskId);
  if (!task) return null;
  return getTaskProjection(task, now);
}

/**
 * Return projection objects for every task currently in the store.
 *
 * @param {Date} [now] - Current time; defaults to new Date()
 * @returns {Object[]}
 */
function getAllProjections(now = new Date()) {
  const results = [];
  for (const task of store.values()) {
    results.push(getTaskProjection(task, now));
  }
  return results;
}

/**
 * Clear all entries from the store (used for test isolation).
 */
function clearAll() {
  store.clear();
}

// ---------------------------------------------------------------------------
// Domain-event listeners — keep the read model in sync with the write model
// ---------------------------------------------------------------------------

// When a task is first created, record the initial snapshot.
emitter.on('task.created', ({ task }) => {
  putSnapshot(task);
});

// When a task is completed, replace the snapshot with the updated task so that
// subsequent reads see DONE without needing to recompute from the task store.
emitter.on('task.completed', ({ task }) => {
  putSnapshot(task);
});

module.exports = { store, putSnapshot, getProjection, getAllProjections, clearAll };
