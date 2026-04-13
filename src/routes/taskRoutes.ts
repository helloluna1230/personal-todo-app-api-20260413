import { Router } from 'express';
import { TaskController } from '../controllers/TaskController';

export function createTaskRouter(controller: TaskController): Router {
  const router = Router();
  router.delete('/:id', controller.deleteTask);
  return router;
}
