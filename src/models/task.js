'use strict';

const { randomUUID } = require('crypto');

/**
 * Task status values
 */
const TaskStatus = Object.freeze({
  PENDING: 'PENDING',
  IN_PROGRESS: 'IN_PROGRESS',
  DONE: 'DONE',
});

/**
 * Create a new Task object.
 *
 * @param {Object} params
 * @param {string} params.title
 * @param {string} [params.status]
 * @param {Date|null} [params.completedAt]
 * @param {Date|null} [params.dueAt]
 * @returns {Object} task
 */
function createTask({ title, status = TaskStatus.PENDING, completedAt = null, dueAt = null } = {}) {
  if (!title || typeof title !== 'string' || title.trim() === '') {
    throw new Error('Task title is required');
  }
  return {
    id: randomUUID(),
    title: title.trim(),
    status,
    completedAt,
    dueAt: dueAt ? new Date(dueAt) : null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

module.exports = { TaskStatus, createTask };
