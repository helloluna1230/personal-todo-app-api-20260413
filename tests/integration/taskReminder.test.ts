import request from 'supertest';
import { createApp } from '../../src/app';

describe('[Integration] Task Reminder API', () => {
  let app: ReturnType<typeof createApp>;

  beforeEach(() => {
    // Each test gets a fresh in-memory application instance.
    app = createApp();
  });

  // -------------------------------------------------------------------------
  // Helpers
  // -------------------------------------------------------------------------

  async function grantPermission() {
    await request(app)
      .post('/notifications/permission')
      .send({ status: 'granted' })
      .expect(200);
  }

  async function createTask(dueAt?: string) {
    const body: Record<string, string> = { title: 'Test task' };
    if (dueAt) body.dueAt = dueAt;
    const res = await request(app).post('/tasks').send(body).expect(201);
    return res.body as { id: string };
  }

  // -------------------------------------------------------------------------
  // Notification permission endpoint
  // -------------------------------------------------------------------------

  describe('GET /notifications/permission', () => {
    it('returns undetermined by default', async () => {
      const res = await request(app).get('/notifications/permission').expect(200);
      expect(res.body.status).toBe('undetermined');
    });
  });

  describe('POST /notifications/permission', () => {
    it('updates permission to granted', async () => {
      const res = await request(app)
        .post('/notifications/permission')
        .send({ status: 'granted' })
        .expect(200);
      expect(res.body.status).toBe('granted');
    });

    it('returns 400 for invalid status values', async () => {
      const res = await request(app)
        .post('/notifications/permission')
        .send({ status: 'maybe' })
        .expect(400);
      expect(res.body.error).toBe('INVALID_STATUS');
    });
  });

  // -------------------------------------------------------------------------
  // AC-1: Setting a reminder without notification permission returns 403
  // -------------------------------------------------------------------------

  describe('[AC-1] POST /tasks/:id/reminder – permission not granted', () => {
    it('returns 403 PERMISSION_REQUIRED when permission is undetermined', async () => {
      const task = await createTask();
      const remindAt = new Date(Date.now() + 3_600_000).toISOString();

      const res = await request(app)
        .post(`/tasks/${task.id}/reminder`)
        .send({ remindAt })
        .expect(403);

      expect(res.body.error).toBe('PERMISSION_REQUIRED');
    });

    it('returns 403 PERMISSION_REQUIRED when permission is denied', async () => {
      await request(app)
        .post('/notifications/permission')
        .send({ status: 'denied' })
        .expect(200);

      const task = await createTask();
      const remindAt = new Date(Date.now() + 3_600_000).toISOString();

      const res = await request(app)
        .post(`/tasks/${task.id}/reminder`)
        .send({ remindAt })
        .expect(403);

      expect(res.body.error).toBe('PERMISSION_REQUIRED');
    });
  });

  // -------------------------------------------------------------------------
  // AC-2: remindAt must be <= dueAt
  // -------------------------------------------------------------------------

  describe('[AC-2] POST /tasks/:id/reminder – remindAt vs dueAt validation', () => {
    it('returns 422 REMIND_AFTER_DUE when remindAt is after dueAt', async () => {
      await grantPermission();
      const dueAt = '2026-06-01T12:00:00.000Z';
      const remindAt = '2026-06-01T13:00:00.000Z'; // 1 h after dueAt
      const task = await createTask(dueAt);

      const res = await request(app)
        .post(`/tasks/${task.id}/reminder`)
        .send({ remindAt })
        .expect(422);

      expect(res.body.error).toBe('REMIND_AFTER_DUE');
    });

    it('succeeds (200) when remindAt equals dueAt', async () => {
      await grantPermission();
      const dueAt = '2026-06-01T12:00:00.000Z';
      const task = await createTask(dueAt);

      const res = await request(app)
        .post(`/tasks/${task.id}/reminder`)
        .send({ remindAt: dueAt })
        .expect(200);

      expect(res.body.remindAt).toBe(dueAt);
    });

    it('succeeds (200) when remindAt is before dueAt', async () => {
      await grantPermission();
      const dueAt = '2026-06-01T12:00:00.000Z';
      const remindAt = '2026-06-01T11:00:00.000Z';
      const task = await createTask(dueAt);

      const res = await request(app)
        .post(`/tasks/${task.id}/reminder`)
        .send({ remindAt })
        .expect(200);

      expect(res.body.remindAt).toBe(remindAt);
    });

    it('succeeds (200) when task has no dueAt', async () => {
      await grantPermission();
      const task = await createTask(); // no dueAt
      const remindAt = '2026-06-01T09:00:00.000Z';

      const res = await request(app)
        .post(`/tasks/${task.id}/reminder`)
        .send({ remindAt })
        .expect(200);

      expect(res.body.remindAt).toBe(remindAt);
    });
  });

  // -------------------------------------------------------------------------
  // AC-3: Reminder is cancelled when task is completed or deleted
  // -------------------------------------------------------------------------

  describe('[AC-3] PATCH /tasks/:id – reminder cancellation on state change', () => {
    it('clears remindAt when task is marked as completed', async () => {
      await grantPermission();
      const task = await createTask();
      const remindAt = '2026-06-01T09:00:00.000Z';

      await request(app)
        .post(`/tasks/${task.id}/reminder`)
        .send({ remindAt })
        .expect(200);

      const res = await request(app)
        .patch(`/tasks/${task.id}`)
        .send({ isCompleted: true })
        .expect(200);

      expect(res.body.isCompleted).toBe(true);
      expect(res.body.remindAt).toBeUndefined();
    });

    it('clears remindAt when task is soft-deleted', async () => {
      await grantPermission();
      const task = await createTask();
      const remindAt = '2026-06-01T09:00:00.000Z';

      await request(app)
        .post(`/tasks/${task.id}/reminder`)
        .send({ remindAt })
        .expect(200);

      const res = await request(app)
        .patch(`/tasks/${task.id}`)
        .send({ isDeleted: true })
        .expect(200);

      expect(res.body.isDeleted).toBe(true);
      expect(res.body.remindAt).toBeUndefined();
    });
  });

  // -------------------------------------------------------------------------
  // DELETE /tasks/:id/reminder – explicit cancellation
  // -------------------------------------------------------------------------

  describe('DELETE /tasks/:id/reminder', () => {
    it('cancels an existing reminder', async () => {
      await grantPermission();
      const task = await createTask();
      const remindAt = '2026-06-01T09:00:00.000Z';

      await request(app)
        .post(`/tasks/${task.id}/reminder`)
        .send({ remindAt })
        .expect(200);

      const res = await request(app)
        .delete(`/tasks/${task.id}/reminder`)
        .expect(200);

      expect(res.body.remindAt).toBeUndefined();
    });

    it('returns 404 for a non-existent task', async () => {
      const res = await request(app)
        .delete('/tasks/ghost-id/reminder')
        .expect(404);

      expect(res.body.error).toBe('TASK_NOT_FOUND');
    });
  });

  // -------------------------------------------------------------------------
  // General task CRUD
  // -------------------------------------------------------------------------

  describe('POST /tasks – input validation', () => {
    it('returns 400 when title is missing', async () => {
      const res = await request(app).post('/tasks').send({}).expect(400);
      expect(res.body.error).toBe('INVALID_TITLE');
    });
  });

  describe('GET /tasks/:id', () => {
    it('returns 404 for a non-existent task', async () => {
      await request(app).get('/tasks/does-not-exist').expect(404);
    });

    it('returns the task when it exists', async () => {
      const task = await createTask();
      const res = await request(app).get(`/tasks/${task.id}`).expect(200);
      expect(res.body.id).toBe(task.id);
    });
  });
});
