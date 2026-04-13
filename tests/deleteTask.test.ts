import request from 'supertest';
import { app, taskRepo, reminderRepo } from '../src/app';
import { Task, Priority, Category, TaskStatus } from '../src/models/Task';
import { ReminderConfig } from '../src/models/ReminderConfig';

const makeTask = (id: string): Task => ({
  id,
  title: 'Test Task',
  priority: Priority.MEDIUM,
  category: Category.WORK,
  status: TaskStatus.TODO,
  createdAt: new Date(),
  updatedAt: new Date(),
  version: 1,
});

const makeReminder = (id: string, taskId: string): ReminderConfig => ({
  id,
  taskId,
  remindAt: new Date(),
  createdAt: new Date(),
});

beforeEach(() => {
  taskRepo.clear();
  reminderRepo.clear();
});

describe('DELETE /api/tasks/:id', () => {
  it('returns 409 when X-Confirm-Delete header is missing', async () => {
    const res = await request(app).delete('/api/tasks/task-1');
    expect(res.status).toBe(409);
  });

  it('returns 409 when X-Confirm-Delete header is not "true"', async () => {
    const res = await request(app)
      .delete('/api/tasks/task-1')
      .set('X-Confirm-Delete', 'false');
    expect(res.status).toBe(409);
  });

  it('returns 404 when task does not exist', async () => {
    const res = await request(app)
      .delete('/api/tasks/nonexistent')
      .set('X-Confirm-Delete', 'true');
    expect(res.status).toBe(404);
  });

  it('returns 204 and removes task on successful deletion', async () => {
    taskRepo.save(makeTask('task-1'));

    const res = await request(app)
      .delete('/api/tasks/task-1')
      .set('X-Confirm-Delete', 'true');

    expect(res.status).toBe(204);
    expect(taskRepo.findById('task-1')).toBeUndefined();
  });

  it('removes associated reminder configs atomically on deletion', async () => {
    taskRepo.save(makeTask('task-2'));
    reminderRepo.save(makeReminder('reminder-1', 'task-2'));
    reminderRepo.save(makeReminder('reminder-2', 'task-2'));

    const res = await request(app)
      .delete('/api/tasks/task-2')
      .set('X-Confirm-Delete', 'true');

    expect(res.status).toBe(204);
    expect(taskRepo.findById('task-2')).toBeUndefined();
    expect(reminderRepo.findByTaskId('task-2')).toHaveLength(0);
  });

  it('deletion is non-recoverable (task cannot be found after deletion)', async () => {
    taskRepo.save(makeTask('task-3'));

    await request(app)
      .delete('/api/tasks/task-3')
      .set('X-Confirm-Delete', 'true');

    // Attempting to delete again confirms it's truly gone
    const res = await request(app)
      .delete('/api/tasks/task-3')
      .set('X-Confirm-Delete', 'true');

    expect(res.status).toBe(404);
    expect(taskRepo.findById('task-3')).toBeUndefined();
  });

  it('does not remove reminder configs for other tasks', async () => {
    taskRepo.save(makeTask('task-4'));
    taskRepo.save(makeTask('task-5'));
    reminderRepo.save(makeReminder('reminder-3', 'task-4'));
    reminderRepo.save(makeReminder('reminder-4', 'task-5'));

    await request(app)
      .delete('/api/tasks/task-4')
      .set('X-Confirm-Delete', 'true');

    expect(reminderRepo.findByTaskId('task-4')).toHaveLength(0);
    expect(reminderRepo.findByTaskId('task-5')).toHaveLength(1);
  });
});
