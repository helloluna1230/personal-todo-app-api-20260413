const express = require('express');
const { VALID_CATEGORIES, DEFAULT_CATEGORY } = require('./category');
const { getAllTasks, getTaskById } = require('./tasks');

/**
 * task-organization read-model routes.
 * This router is intentionally READ-ONLY.  All state mutations go through
 * TaskCommandService (see commandRoutes.js).
 */
const router = express.Router();

// GET /tasks/meta/categories — list fixed category enum (must be before /:id)
router.get('/meta/categories', (req, res) => {
  res.json({ categories: VALID_CATEGORIES, default: DEFAULT_CATEGORY });
});

// GET /tasks?category=WORK|LIFE|STUDY
router.get('/', (req, res) => {
  const { category } = req.query;
  if (category && !VALID_CATEGORIES.includes(category)) {
    return res.status(400).json({ error: `Invalid category. Must be one of: ${VALID_CATEGORIES.join(', ')}` });
  }
  res.json(getAllTasks({ category }));
});

// GET /tasks/:id
router.get('/:id', (req, res) => {
  const task = getTaskById(Number(req.params.id));
  if (!task) return res.status(404).json({ error: 'Task not found' });
  res.json(task);
});

module.exports = router;
