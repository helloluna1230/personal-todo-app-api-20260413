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

describe('Task CRUD with category management', () => {
  let taskId;

  it('POST /tasks — creates a task with default category when none supplied', async () => {
    const res = await request(app).post('/tasks').send({ title: 'Buy groceries' });
    expect(res.status).toBe(201);
    expect(res.body.title).toBe('Buy groceries');
    expect(res.body.category).toBe('WORK');
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

  it('GET /tasks — returns all tasks', async () => {
    const res = await request(app).get('/tasks');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThanOrEqual(3);
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

  it('PATCH /tasks/:id — updates category to STUDY', async () => {
    const res = await request(app).patch(`/tasks/${taskId}`).send({ category: 'STUDY' });
    expect(res.status).toBe(200);
    expect(res.body.category).toBe('STUDY');
  });

  it('PATCH /tasks/:id — rejects invalid category', async () => {
    const res = await request(app).patch(`/tasks/${taskId}`).send({ category: 'NOPE' });
    expect(res.status).toBe(400);
  });

  it('PATCH /tasks/:id — falls back to default when category is null/empty', async () => {
    // First create a task and manually clear its category via a direct DB write
    const createRes = await request(app).post('/tasks').send({ title: 'Legacy task', category: 'LIFE' });
    const id = createRes.body.id;

    // Simulate the legacy empty-category scenario by using the DB directly
    const { getDb } = require('../db');
    getDb().prepare("UPDATE tasks SET category = '' WHERE id = ?").run(id);

    const res = await request(app).get(`/tasks/${id}`);
    expect(res.status).toBe(200);
    // resolveCategory should fall back to 'WORK'
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
