'use strict';

const request = require('supertest');
const app = require('../src/app');
const taskService = require('../src/services/taskService');
const reminderService = require('../src/services/reminderService');

beforeEach(() => {
  taskService.clearAll();
  reminderService.clearAll();
});

describe('PATCH /tasks/:id/complete — HTTP layer', () => {
  describe('200 — successful completion', () => {
    test('returns 200 with task data when task exists', async () => {
      const task = taskService.addTask({ title: 'Write tests' });

      const res = await request(app).patch(`/tasks/${task.id}/complete`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('data');
    });

    test('response body contains status DONE', async () => {
      const task = taskService.addTask({ title: 'Write tests' });

      const res = await request(app).patch(`/tasks/${task.id}/complete`);

      expect(res.body.data.status).toBe('DONE');
    });

    test('response body contains completedAt as an ISO date string', async () => {
      const task = taskService.addTask({ title: 'Write tests' });

      const res = await request(app).patch(`/tasks/${task.id}/complete`);

      const { completedAt } = res.body.data;
      expect(typeof completedAt).toBe('string');
      expect(new Date(completedAt).toString()).not.toBe('Invalid Date');
    });

    test('response body contains the task id and title', async () => {
      const task = taskService.addTask({ title: 'Write tests' });

      const res = await request(app).patch(`/tasks/${task.id}/complete`);

      expect(res.body.data.id).toBe(task.id);
      expect(res.body.data.title).toBe('Write tests');
    });

    test('is idempotent — second PATCH also returns 200 with DONE', async () => {
      const task = taskService.addTask({ title: 'Idempotent task' });

      await request(app).patch(`/tasks/${task.id}/complete`);
      const res = await request(app).patch(`/tasks/${task.id}/complete`);

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('DONE');
    });
  });

  describe('404 — task not found', () => {
    test('returns 404 when the task ID does not exist', async () => {
      const res = await request(app).patch('/tasks/non-existent-id/complete');

      expect(res.status).toBe(404);
    });

    test('404 response body contains an error message', async () => {
      const res = await request(app).patch('/tasks/non-existent-id/complete');

      expect(res.body).toHaveProperty('error');
      expect(typeof res.body.error).toBe('string');
    });
  });
});
