import express from 'express';
import { TaskRepository } from './repositories/taskRepository';
import { NotificationPermissionRepository } from './repositories/notificationPermissionRepository';
import { NotificationPermissionService } from './services/notificationPermissionService';
import { ReminderService } from './services/reminderService';
import { TaskService } from './services/taskService';
import { createTaskRouter } from './routes/tasks';
import { createNotificationsRouter } from './routes/notifications';

export function createApp(): express.Application {
  const app = express();
  app.use(express.json());

  // Repositories
  const taskRepo = new TaskRepository();
  const permissionRepo = new NotificationPermissionRepository();

  // Services
  const permissionService = new NotificationPermissionService(permissionRepo);
  const reminderService = new ReminderService(taskRepo, permissionService);
  const taskService = new TaskService(taskRepo, reminderService);

  // Routes
  app.use('/tasks', createTaskRouter(taskService, reminderService));
  app.use('/notifications', createNotificationsRouter(permissionService));

  return app;
}
