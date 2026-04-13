import { Request, Response } from 'express';
import { TaskCommandService, NotFoundError } from '../services/TaskCommandService';

export class TaskController {
  constructor(private readonly taskCommandService: TaskCommandService) {}

  deleteTask = (req: Request, res: Response): void => {
    const confirmHeader = req.headers['x-confirm-delete'];
    if (confirmHeader !== 'true') {
      res.status(409).json({ error: 'Deletion requires X-Confirm-Delete: true header' });
      return;
    }

    try {
      this.taskCommandService.deleteTask(String(req.params.id));
      res.status(204).send();
    } catch (err) {
      if (err instanceof NotFoundError) {
        res.status(404).json({ error: err.message });
      } else {
        res.status(500).json({ error: 'Internal server error' });
      }
    }
  };
}
