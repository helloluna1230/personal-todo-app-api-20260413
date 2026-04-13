'use strict';

const { Router } = require('express');
const taskService = require('../services/taskService');

const router = Router();

/**
 * PATCH /tasks/:id/complete
 *
 * Mark a task as DONE (idempotent).
 * Returns the updated task with status DONE and completedAt timestamp.
 */
router.patch('/:id/complete', (req, res) => {
  try {
    const task = taskService.completeTask(req.params.id);
    return res.json({ data: task });
  } catch (err) {
    if (err.code === 'TASK_NOT_FOUND') {
      return res.status(404).json({ error: err.message });
    }
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /tasks
 *
 * Create a new task.
 */
router.post('/', (req, res) => {
  try {
    const { title, dueAt } = req.body;
    const task = taskService.addTask({ title, dueAt });
    return res.status(201).json({ data: task });
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
});

/**
 * GET /tasks/:id
 *
 * Retrieve a task by ID, enriched with its time-projection status.
 */
router.get('/:id', (req, res) => {
  try {
    const projection = taskService.getTaskWithProjection(req.params.id);
    return res.json({ data: projection });
  } catch (err) {
    if (err.code === 'TASK_NOT_FOUND') {
      return res.status(404).json({ error: err.message });
    }
    return res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
