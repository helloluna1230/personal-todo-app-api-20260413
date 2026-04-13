const express = require('express');
const { VALID_CATEGORIES, DEFAULT_CATEGORY } = require('./category');
const { getAllTasks, getTaskById, createTask, updateTask, deleteTask } = require('./tasks');

const router = express.Router();

// GET /categories — list all valid category values (must be before /:id)
router.get('/meta/categories', (req, res) => {
  res.json({ categories: VALID_CATEGORIES, default: DEFAULT_CATEGORY });
});

// GET /tasks?category=WORK
router.get('/', (req, res) => {
  const { category } = req.query;
  if (category && !VALID_CATEGORIES.includes(category)) {
    return res.status(400).json({ error: `Invalid category. Must be one of: ${VALID_CATEGORIES.join(', ')}` });
  }
  const tasks = getAllTasks({ category });
  res.json(tasks);
});

// GET /tasks/:id
router.get('/:id', (req, res) => {
  const task = getTaskById(Number(req.params.id));
  if (!task) return res.status(404).json({ error: 'Task not found' });
  res.json(task);
});

// POST /tasks
router.post('/', (req, res) => {
  const { title, completed, category } = req.body;
  if (!title || typeof title !== 'string' || !title.trim()) {
    return res.status(400).json({ error: 'title is required' });
  }
  if (category && !VALID_CATEGORIES.includes(category)) {
    return res.status(400).json({ error: `Invalid category. Must be one of: ${VALID_CATEGORIES.join(', ')}` });
  }
  const task = createTask({ title: title.trim(), completed, category });
  res.status(201).json(task);
});

// PATCH /tasks/:id
router.patch('/:id', (req, res) => {
  const { title, completed, category } = req.body;
  if (category && !VALID_CATEGORIES.includes(category)) {
    return res.status(400).json({ error: `Invalid category. Must be one of: ${VALID_CATEGORIES.join(', ')}` });
  }
  const task = updateTask(Number(req.params.id), { title, completed, category });
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
