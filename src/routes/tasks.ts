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
    const { title, note, priority, category, timezone, dueAt } = req.body as {
      title?: string;
      note?: string;
      priority?: string;
      category?: string;
      timezone?: string;
      dueAt?: string;
    };

    if (!title || typeof title !== 'string' || title.trim() === '') {
      res.status(400).json({ error: 'INVALID_TITLE', message: 'title is required.' });
      return;
    }

    const task = taskService.createTask({
      title: title.trim(),
      note,
      priority: priority as 'low' | 'medium' | 'high' | undefined,
      category,
      timezone,
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

  // PATCH /tasks/:id – update a task (edit fields / mark as done)
  router.patch('/:id', (req: Request, res: Response) => {
    const { title, note, priority, category, timezone, dueAt, status } = req.body as {
      title?: string;
      note?: string;
      priority?: string;
      category?: string;
      timezone?: string;
      dueAt?: string;
      status?: string;
    };

    const updated = taskService.updateTask(String(req.params.id), {
      title,
      note,
      priority: priority as 'low' | 'medium' | 'high' | undefined,
      category,
      timezone,
      dueAt: dueAt ? new Date(dueAt) : undefined,
      status: status as 'TODO' | 'DONE' | undefined,
    });

    if (!updated) {
      res.status(404).json({ error: 'TASK_NOT_FOUND', message: '任务不存在。' });
      return;
    }

    res.json(updated);
  });

  // DELETE /tasks/:id – physically delete a task and its reminder jobs
  router.delete('/:id', (req: Request, res: Response) => {
    const deleted = taskService.deleteTask(String(req.params.id));
    if (!deleted) {
      res.status(404).json({ error: 'TASK_NOT_FOUND', message: '任务不存在。' });
      return;
    }
    res.status(204).send();
  });

  // GET /tasks/:id/reminder – get the active reminder job for a task
  router.get('/:id/reminder', (req: Request, res: Response) => {
    const task = taskService.getTask(String(req.params.id));
    if (!task) {
      res.status(404).json({ error: 'TASK_NOT_FOUND', message: '任务不存在。' });
      return;
    }

    const job = reminderService.getReminderForTask(String(req.params.id));
    if (!job) {
      res.status(404).json({ error: 'REMINDER_NOT_FOUND', message: '该任务暂无提醒。' });
      return;
    }

    res.json(job);
  });

  // POST /tasks/:id/reminder – register a reminder job for a task
  //
  // When notification permission is not yet granted the reminder is saved with
  // status 'permission_denied' (instead of being rejected outright), so the
  // client can surface a "pending authorization" state and prompt the user to
  // grant permission.  The caller should check `job.status` in the response.
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
      const job = reminderService.setReminder(String(req.params.id), remindAtDate);

      if (job.status === 'permission_denied') {
        // The reminder intent has been recorded; the client must request OS
        // notification permission and then re-POST to activate it.
        res.status(200).json({
          ...job,
          authorizationHint: '通知权限未开启。请前往系统设置授权后，重新设置提醒以激活。',
        });
        return;
      }

      res.status(200).json(job);
    } catch (err) {
      if (err instanceof ReminderError) {
        const status = err.code === 'TASK_NOT_FOUND' ? 404 : 422;
        res.status(status).json({ error: err.code, message: err.message });
        return;
      }
      throw err;
    }
  });

  // DELETE /tasks/:id/reminder – cancel the active reminder job for a task
  router.delete('/:id/reminder', (req: Request, res: Response) => {
    try {
      reminderService.cancelReminderForTask(String(req.params.id));
      res.status(204).send();
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
