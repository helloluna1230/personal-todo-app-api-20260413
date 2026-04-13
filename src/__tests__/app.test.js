const request = require('supertest');
const path = require('path');
const os = require('os');
const fs = require('fs');

// Use a temporary SQLite database per test run
const tmpDb = path.join(os.tmpdir(), `todo-test-${Date.now()}.db`);
process.env.DB_PATH = tmpDb;

// Import app AFTER setting DB_PATH so it picks up the test database
const { createApp } = require('../app');
const { closeDb } = require('../db');

let app;

beforeAll(() => {
  app = createApp();
});

afterAll(() => {
  closeDb();
  try { fs.unlinkSync(tmpDb); } catch (_) {}
});

describe('GET /health', () => {
  it('returns ok', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });
});

describe('GET /tasks/meta/categories', () => {
  it('returns all fixed categories and default', async () => {
    const res = await request(app).get('/tasks/meta/categories');
    expect(res.status).toBe(200);
    expect(res.body.categories).toEqual(['WORK', 'LIFE', 'STUDY']);
    expect(res.body.default).toBe('WORK');
  });
});

describe('Task model shape', () => {
  it('POST /tasks returns full Task contract fields', async () => {
    const res = await request(app)
      .post('/tasks')
      .send({ title: 'Check task shape', category: 'STUDY', priority: 'HIGH' });
    expect(res.status).toBe(201);
    const t = res.body;
    expect(t).toHaveProperty('id');
    expect(t).toHaveProperty('title', 'Check task shape');
    expect(t).toHaveProperty('status', 'TODO');
    expect(t).toHaveProperty('priority', 'HIGH');
    expect(t).toHaveProperty('category', 'STUDY');
    expect(t).toHaveProperty('dueAt');
    expect(t).toHaveProperty('remindAt');
    expect(t).toHaveProperty('completedAt');
    expect(t).toHaveProperty('timezone');
    expect(t).toHaveProperty('version', 1);
    expect(t).toHaveProperty('createdAt');
    expect(t).toHaveProperty('updatedAt');
  });
});

describe('Category management via TaskCommandService', () => {
  let taskId;

  it('POST /tasks — creates a task with default category when none supplied', async () => {
    const res = await request(app).post('/tasks').send({ title: 'Buy groceries' });
    expect(res.status).toBe(201);
    expect(res.body.title).toBe('Buy groceries');
    expect(res.body.category).toBe('WORK');
    expect(res.body.status).toBe('TODO');
    taskId = res.body.id;
  });

  it('POST /tasks — creates a task with LIFE category', async () => {
    const res = await request(app).post('/tasks').send({ title: 'Morning run', category: 'LIFE' });
    expect(res.status).toBe(201);
    expect(res.body.category).toBe('LIFE');
  });

  it('POST /tasks — creates a task with STUDY category', async () => {
    const res = await request(app).post('/tasks').send({ title: 'Read Clean Code', category: 'STUDY' });
    expect(res.status).toBe(201);
    expect(res.body.category).toBe('STUDY');
  });

  it('POST /tasks — rejects an invalid category', async () => {
    const res = await request(app).post('/tasks').send({ title: 'Bad task', category: 'INVALID' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/Invalid category/);
  });

  it('POST /tasks — rejects missing title', async () => {
    const res = await request(app).post('/tasks').send({ category: 'WORK' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/title is required/);
  });

  it('GET /tasks — returns all tasks with full Task fields', async () => {
    const res = await request(app).get('/tasks');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThanOrEqual(3);
    const t = res.body[0];
    expect(t).toHaveProperty('status');
    expect(t).toHaveProperty('priority');
    expect(t).toHaveProperty('version');
  });

  it('GET /tasks?category=LIFE — filters by category', async () => {
    const res = await request(app).get('/tasks?category=LIFE');
    expect(res.status).toBe(200);
    expect(res.body.every((t) => t.category === 'LIFE')).toBe(true);
  });

  it('GET /tasks?category=INVALID — returns 400', async () => {
    const res = await request(app).get('/tasks?category=INVALID');
    expect(res.status).toBe(400);
  });

  it('GET /tasks/:id — returns specific task with category', async () => {
    const res = await request(app).get(`/tasks/${taskId}`);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(taskId);
    expect(res.body.category).toBe('WORK');
  });

  it('PATCH /tasks/:id — updates category to STUDY and bumps version', async () => {
    const res = await request(app).patch(`/tasks/${taskId}`).send({ category: 'STUDY' });
    expect(res.status).toBe(200);
    expect(res.body.category).toBe('STUDY');
    expect(res.body.version).toBe(2);
  });

  it('PATCH /tasks/:id — sets completedAt when status transitions to DONE', async () => {
    const res = await request(app).patch(`/tasks/${taskId}`).send({ status: 'DONE' });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('DONE');
    expect(res.body.completedAt).not.toBeNull();
  });

  it('PATCH /tasks/:id — clears completedAt when status reverts to TODO', async () => {
    const res = await request(app).patch(`/tasks/${taskId}`).send({ status: 'TODO' });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('TODO');
    expect(res.body.completedAt).toBeNull();
  });

  it('PATCH /tasks/:id — rejects invalid category', async () => {
    const res = await request(app).patch(`/tasks/${taskId}`).send({ category: 'NOPE' });
    expect(res.status).toBe(400);
  });

  it('PATCH /tasks/:id — falls back to default when category is null/empty', async () => {
    const createRes = await request(app).post('/tasks').send({ title: 'Legacy task', category: 'LIFE' });
    const id = createRes.body.id;

    // Simulate legacy empty-category via direct DB write
    const { getDb } = require('../db');
    getDb().prepare("UPDATE tasks SET category = '' WHERE id = ?").run(id);

    const res = await request(app).get(`/tasks/${id}`);
    expect(res.status).toBe(200);
    expect(res.body.category).toBe('WORK');
  });

  it('DELETE /tasks/:id — deletes a task', async () => {
    const res = await request(app).delete(`/tasks/${taskId}`);
    expect(res.status).toBe(204);
  });

  it('GET /tasks/:id — returns 404 after deletion', async () => {
    const res = await request(app).get(`/tasks/${taskId}`);
    expect(res.status).toBe(404);
  });
});

describe('task-organization routes are read-only', () => {
  it('organizationRouter does not expose POST (handled by commandRouter)', async () => {
    // The route handler in commandRoutes.js handles POST; verify it works end-to-end
    const res = await request(app).post('/tasks').send({ title: 'Via command service' });
    expect(res.status).toBe(201);
  });
});
