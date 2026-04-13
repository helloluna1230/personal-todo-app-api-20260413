const express = require('express');
const { VALID_CATEGORIES } = require('./category');
const { VALID_STATUSES, VALID_PRIORITIES, isValidTimezone, createTask, updateTask, deleteTask } = require('./taskCommandService');

/**
 * TaskCommandService HTTP routes.
 * These are the ONLY routes permitted to mutate task records.
 */
const router = express.Router();

function validateCategory(category, res) {
  if (category && !VALID_CATEGORIES.includes(category)) {
    res.status(400).json({ error: `Invalid category. Must be one of: ${VALID_CATEGORIES.join(', ')}` });
    return false;
  }
  return true;
}

// POST /tasks
router.post('/', (req, res) => {
  const { title, status, priority, category, dueAt, remindAt, timezone } = req.body;
  if (!title || typeof title !== 'string' || !title.trim()) {
    return res.status(400).json({ error: 'title is required' });
  }
  if (!validateCategory(category, res)) return;
  if (status && !VALID_STATUSES.includes(status)) {
    return res.status(400).json({ error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}` });
  }
  if (priority && !VALID_PRIORITIES.includes(priority)) {
    return res.status(400).json({ error: `Invalid priority. Must be one of: ${VALID_PRIORITIES.join(', ')}` });
  }
  if (timezone && !isValidTimezone(timezone)) {
    return res.status(400).json({ error: `Invalid timezone. Must be a valid IANA timezone identifier (e.g. UTC, Asia/Taipei).` });
  }
  const task = createTask({ title: title.trim(), status, priority, category, dueAt, remindAt, timezone });
  res.status(201).json(task);
});

// PATCH /tasks/:id
router.patch('/:id', (req, res) => {
  const { title, status, priority, category, dueAt, remindAt, timezone } = req.body;
  if (!validateCategory(category, res)) return;
  if (status && !VALID_STATUSES.includes(status)) {
    return res.status(400).json({ error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}` });
  }
  if (priority && !VALID_PRIORITIES.includes(priority)) {
    return res.status(400).json({ error: `Invalid priority. Must be one of: ${VALID_PRIORITIES.join(', ')}` });
  }
  if (timezone && !isValidTimezone(timezone)) {
    return res.status(400).json({ error: `Invalid timezone. Must be a valid IANA timezone identifier (e.g. UTC, Asia/Taipei).` });
  }
  const task = updateTask(Number(req.params.id), { title, status, priority, category, dueAt, remindAt, timezone });
  if (!task) return res.status(404).json({ error: 'Task not found' });
  res.json(task);
});

// DELETE /tasks/:id
router.delete('/:id', (req, res) => {
  const deleted = deleteTask(Number(req.params.id));
  if (!deleted) return res.status(404).json({ error: 'Task not found' });
  res.status(204).send();
});

module.exports = router;
