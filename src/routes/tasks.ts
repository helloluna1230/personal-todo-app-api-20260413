import { Router, Request, Response } from 'express';
import {
  createTask,
  updateTask,
  getTask,
  listTasks,
  completeTask,
  deleteTask,
  TaskNotFoundError,
  TaskValidationError,
} from '../services/TaskCommandService';

const router = Router();

// GET /tasks — list all tasks
router.get('/', (_req: Request, res: Response) => {
  const tasks = listTasks();
  res.json(tasks);
});

// GET /tasks/:id — get task detail
router.get('/:id', (req: Request, res: Response) => {
  try {
    const task = getTask(req.params['id'] as string);
    res.json(task);
  } catch (err) {
    if (err instanceof TaskNotFoundError) {
      res.status(404).json({ message: err.message });
    } else {
      res.status(500).json({ message: 'Internal server error' });
    }
  }
});

// POST /tasks — create a new task
router.post('/', (req: Request, res: Response) => {
  try {
    const task = createTask(req.body);
    res.status(201).json(task);
  } catch (err) {
    if (err instanceof TaskValidationError) {
      res.status(400).json({ message: err.message });
    } else {
      res.status(500).json({ message: 'Internal server error' });
    }
  }
});

// PUT /tasks/:id — update a task
router.put('/:id', (req: Request, res: Response) => {
  try {
    const task = updateTask(req.params['id'] as string, req.body);
    res.json(task);
  } catch (err) {
    if (err instanceof TaskNotFoundError) {
      res.status(404).json({ message: err.message });
    } else if (err instanceof TaskValidationError) {
      res.status(400).json({ message: err.message });
    } else {
      res.status(500).json({ message: 'Internal server error' });
    }
  }
});

// PATCH /tasks/:id/complete — mark task as done
router.patch('/:id/complete', (req: Request, res: Response) => {
  try {
    const task = completeTask(req.params['id'] as string);
    res.json(task);
  } catch (err) {
    if (err instanceof TaskNotFoundError) {
      res.status(404).json({ message: err.message });
    } else {
      res.status(500).json({ message: 'Internal server error' });
    }
  }
});

// DELETE /tasks/:id — delete a task
router.delete('/:id', (req: Request, res: Response) => {
  try {
    deleteTask(req.params['id'] as string);
    res.status(204).send();
  } catch (err) {
    if (err instanceof TaskNotFoundError) {
      res.status(404).json({ message: err.message });
    } else {
      res.status(500).json({ message: 'Internal server error' });
    }
  }
});

export default router;
