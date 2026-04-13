'use strict';

const emitter = require('../events/eventEmitter');

/**
 * In-memory store of scheduled reminder timer IDs, keyed by task ID.
 * Each value is an array of timer IDs (from setTimeout/setInterval).
 * @type {Map<string, NodeJS.Timeout[]>}
 */
const scheduledReminders = new Map();

/**
 * Schedule a reminder for a task.
 *
 * @param {string} taskId
 * @param {NodeJS.Timeout} timerId - The timer handle returned by setTimeout/setInterval
 */
function scheduleReminder(taskId, timerId) {
  if (!scheduledReminders.has(taskId)) {
    scheduledReminders.set(taskId, []);
  }
  scheduledReminders.get(taskId).push(timerId);
}

/**
 * Cancel all future reminders for a task.
 * Called when a task is marked as DONE.
 *
 * @param {string} taskId
 */
function cancelReminders(taskId) {
  const timers = scheduledReminders.get(taskId);
  if (timers) {
    timers.forEach((t) => clearTimeout(t));
    scheduledReminders.delete(taskId);
  }
}

/**
 * Return whether a task currently has any scheduled reminders.
 *
 * @param {string} taskId
 * @returns {boolean}
 */
function hasReminders(taskId) {
  return scheduledReminders.has(taskId) && scheduledReminders.get(taskId).length > 0;
}

// Listen for task.completed events and cancel reminders automatically
emitter.on('task.completed', ({ taskId }) => {
  cancelReminders(taskId);
});

module.exports = { scheduleReminder, cancelReminders, hasReminders, scheduledReminders };
