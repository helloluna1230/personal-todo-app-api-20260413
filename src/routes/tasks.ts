import { Router, Request, Response } from 'express';
import { TaskService } from '../services/taskService';
import { ReminderService, ReminderError } from '../services/reminderService';

export function createTaskRouter(
  taskService: TaskService,
  reminderService: ReminderService,
): Router {
  const router = Router();

  // POST /tasks – create a new task
  router.post('/', (req: Request, res: Response) => {
    const { title, description, dueAt } = req.body as {
      title?: string;
      description?: string;
      dueAt?: string;
    };

    if (!title || typeof title !== 'string' || title.trim() === '') {
      res.status(400).json({ error: 'INVALID_TITLE', message: 'title is required.' });
      return;
    }

    const task = taskService.createTask({
      title: title.trim(),
      description,
      dueAt: dueAt ? new Date(dueAt) : undefined,
    });

    res.status(201).json(task);
  });

  // GET /tasks – list all tasks
  router.get('/', (_req: Request, res: Response) => {
    res.json(taskService.listTasks());
  });

  // GET /tasks/:id – get a single task
  router.get('/:id', (req: Request, res: Response) => {
    const task = taskService.getTask(String(req.params.id));
    if (!task) {
      res.status(404).json({ error: 'TASK_NOT_FOUND', message: '任务不存在。' });
      return;
    }
    res.json(task);
  });

  // PATCH /tasks/:id – update a task (complete / soft-delete / edit fields)
  router.patch('/:id', (req: Request, res: Response) => {
    const { title, description, dueAt, isCompleted, isDeleted } = req.body as {
      title?: string;
      description?: string;
      dueAt?: string;
      isCompleted?: boolean;
      isDeleted?: boolean;
    };

    const updated = taskService.updateTask(String(req.params.id), {
      title,
      description,
      dueAt: dueAt ? new Date(dueAt) : undefined,
      isCompleted,
      isDeleted,
    });

    if (!updated) {
      res.status(404).json({ error: 'TASK_NOT_FOUND', message: '任务不存在。' });
      return;
    }

    res.json(updated);
  });

  // POST /tasks/:id/reminder – set a reminder
  router.post('/:id/reminder', (req: Request, res: Response) => {
    const { remindAt } = req.body as { remindAt?: string };

    if (!remindAt) {
      res
        .status(400)
        .json({ error: 'INVALID_REMIND_AT', message: 'remindAt is required.' });
      return;
    }

    const remindAtDate = new Date(remindAt);
    if (isNaN(remindAtDate.getTime())) {
      res
        .status(400)
        .json({ error: 'INVALID_REMIND_AT', message: 'remindAt must be a valid ISO date.' });
      return;
    }

    try {
      const task = reminderService.setReminder(String(req.params.id), remindAtDate);
      res.status(200).json(task);
    } catch (err) {
      if (err instanceof ReminderError) {
        const status =
          err.code === 'PERMISSION_REQUIRED'
            ? 403
            : err.code === 'TASK_NOT_FOUND'
              ? 404
              : 422;
        res.status(status).json({ error: err.code, message: err.message });
        return;
      }
      throw err;
    }
  });

  // DELETE /tasks/:id/reminder – cancel a reminder
  router.delete('/:id/reminder', (req: Request, res: Response) => {
    try {
      const task = reminderService.cancelReminder(String(req.params.id));
      res.status(200).json(task);
    } catch (err) {
      if (err instanceof ReminderError) {
        res.status(404).json({ error: err.code, message: err.message });
        return;
      }
      throw err;
    }
  });

  return router;
}
