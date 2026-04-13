import express from 'express';
import { TaskRepository } from './repositories/TaskRepository';
import { ReminderConfigRepository } from './repositories/ReminderConfigRepository';
import { TaskCommandService } from './services/TaskCommandService';
import { TaskController } from './controllers/TaskController';
import { createTaskRouter } from './routes/taskRoutes';

const taskRepo = new TaskRepository();
const reminderRepo = new ReminderConfigRepository();
const taskCommandService = new TaskCommandService(taskRepo, reminderRepo);
const taskController = new TaskController(taskCommandService);

const app = express();
app.use(express.json());
app.use('/api/tasks', createTaskRouter(taskController));

export { app, taskRepo, reminderRepo };
