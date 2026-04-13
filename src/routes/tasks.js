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

module.exports = router;
