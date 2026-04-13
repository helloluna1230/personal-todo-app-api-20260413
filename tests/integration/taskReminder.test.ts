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
  // Task model contract
  // -------------------------------------------------------------------------

  describe('POST /tasks – task model shape', () => {
    it('creates a task with status TODO, version 1 and no isCompleted/isDeleted', async () => {
      const res = await request(app)
        .post('/tasks')
        .send({ title: 'Read docs', note: 'important', priority: 'high' })
        .expect(201);

      expect(res.body.status).toBe('TODO');
      expect(res.body.version).toBe(1);
      expect(res.body).not.toHaveProperty('isCompleted');
      expect(res.body).not.toHaveProperty('isDeleted');
      expect(res.body.note).toBe('important');
      expect(res.body.priority).toBe('high');
    });

    it('returns 400 when title is missing', async () => {
      const res = await request(app).post('/tasks').send({}).expect(400);
      expect(res.body.error).toBe('INVALID_TITLE');
    });
  });

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
  // AC-1: Setting a reminder without permission → permission_denied job (not 403)
  // -------------------------------------------------------------------------

  describe('[AC-1] POST /tasks/:id/reminder – permission not granted', () => {
    it('returns 200 with status permission_denied and authorizationHint when permission is undetermined', async () => {
      const task = await createTask();
      const remindAt = '2026-06-01T09:00:00.000Z';

      const res = await request(app)
        .post(`/tasks/${task.id}/reminder`)
        .send({ remindAt })
        .expect(200);

      expect(res.body.status).toBe('permission_denied');
      expect(res.body.taskId).toBe(task.id);
      expect(res.body.remindAt).toBe(remindAt);
      expect(typeof res.body.authorizationHint).toBe('string');
      expect(res.body.authorizationHint.length).toBeGreaterThan(0);
    });

    it('returns 200 with status permission_denied when permission is denied', async () => {
      await request(app)
        .post('/notifications/permission')
        .send({ status: 'denied' })
        .expect(200);

      const task = await createTask();
      const res = await request(app)
        .post(`/tasks/${task.id}/reminder`)
        .send({ remindAt: '2026-06-01T09:00:00.000Z' })
        .expect(200);

      expect(res.body.status).toBe('permission_denied');
    });

    it('permission_denied job is visible via GET /tasks/:id/reminder', async () => {
      const task = await createTask();
      await request(app)
        .post(`/tasks/${task.id}/reminder`)
        .send({ remindAt: '2026-06-01T09:00:00.000Z' })
        .expect(200);

      const res = await request(app).get(`/tasks/${task.id}/reminder`).expect(200);
      expect(res.body.status).toBe('permission_denied');
    });

    it('granting permission and re-setting upgrades job to scheduled', async () => {
      const task = await createTask();
      const remindAt = '2026-06-01T09:00:00.000Z';

      // First set: no permission → permission_denied
      await request(app)
        .post(`/tasks/${task.id}/reminder`)
        .send({ remindAt })
        .expect(200);

      // Grant permission, then re-set the reminder
      await grantPermission();
      const res = await request(app)
        .post(`/tasks/${task.id}/reminder`)
        .send({ remindAt })
        .expect(200);

      expect(res.body.status).toBe('scheduled');
    });

    it('task record must NOT contain remindAt regardless of permission state', async () => {
      const task = await createTask();
      await request(app)
        .post(`/tasks/${task.id}/reminder`)
        .send({ remindAt: '2026-06-01T09:00:00.000Z' })
        .expect(200);

      const taskRes = await request(app).get(`/tasks/${task.id}`).expect(200);
      expect(taskRes.body).not.toHaveProperty('remindAt');
    });
  });

  // -------------------------------------------------------------------------
  // AC-2: remindAt must be <= dueAt
  // -------------------------------------------------------------------------

  describe('[AC-2] POST /tasks/:id/reminder – remindAt vs dueAt validation', () => {
    it('returns 422 REMIND_AFTER_DUE when remindAt is after dueAt (even without permission)', async () => {
      const dueAt = '2026-06-01T12:00:00.000Z';
      const remindAt = '2026-06-01T13:00:00.000Z';
      const task = await createTask(dueAt);

      const res = await request(app)
        .post(`/tasks/${task.id}/reminder`)
        .send({ remindAt })
        .expect(422);

      expect(res.body.error).toBe('REMIND_AFTER_DUE');
    });

    it('succeeds (200) when remindAt equals dueAt and permission is granted', async () => {
      await grantPermission();
      const dueAt = '2026-06-01T12:00:00.000Z';
      const task = await createTask(dueAt);

      const res = await request(app)
        .post(`/tasks/${task.id}/reminder`)
        .send({ remindAt: dueAt })
        .expect(200);

      expect(res.body.status).toBe('scheduled');
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

      expect(res.body.status).toBe('scheduled');
    });

    it('succeeds (200) when task has no dueAt', async () => {
      await grantPermission();
      const task = await createTask();
      const res = await request(app)
        .post(`/tasks/${task.id}/reminder`)
        .send({ remindAt: '2026-06-01T09:00:00.000Z' })
        .expect(200);

      expect(res.body.status).toBe('scheduled');
    });
  });

  // -------------------------------------------------------------------------
  // AC-3: Reminder job cancelled when task is completed (status → DONE)
  // -------------------------------------------------------------------------

  describe('[AC-3] PATCH /tasks/:id – reminder job cancellation on completion', () => {
    it('cancels reminder job when task status is set to DONE', async () => {
      await grantPermission();
      const task = await createTask();

      await request(app)
        .post(`/tasks/${task.id}/reminder`)
        .send({ remindAt: '2026-06-01T09:00:00.000Z' })
        .expect(200);

      const updated = await request(app)
        .patch(`/tasks/${task.id}`)
        .send({ status: 'DONE' })
        .expect(200);

      expect(updated.body.status).toBe('DONE');
      expect(updated.body.completedAt).toBeTruthy();
      // Reminder job should be gone.
      await request(app).get(`/tasks/${task.id}/reminder`).expect(404);
    });

    it('also cancels permission_denied jobs on DONE', async () => {
      const task = await createTask();
      // No permission → permission_denied job
      await request(app)
        .post(`/tasks/${task.id}/reminder`)
        .send({ remindAt: '2026-06-01T09:00:00.000Z' })
        .expect(200);

      await request(app).patch(`/tasks/${task.id}`).send({ status: 'DONE' }).expect(200);

      await request(app).get(`/tasks/${task.id}/reminder`).expect(404);
    });
  });

  // -------------------------------------------------------------------------
  // Physical delete – DELETE /tasks/:id
  // -------------------------------------------------------------------------

  describe('DELETE /tasks/:id – physical delete', () => {
    it('removes the task permanently and returns 204', async () => {
      const task = await createTask();

      await request(app).delete(`/tasks/${task.id}`).expect(204);

      // Task is gone.
      await request(app).get(`/tasks/${task.id}`).expect(404);
    });

    it('no longer appears in GET /tasks after deletion', async () => {
      const task = await createTask();
      await request(app).delete(`/tasks/${task.id}`).expect(204);

      const res = await request(app).get('/tasks').expect(200);
      const ids = (res.body as Array<{ id: string }>).map((t) => t.id);
      expect(ids).not.toContain(task.id);
    });

    it('cancels reminder jobs when a task is physically deleted', async () => {
      await grantPermission();
      const task = await createTask();

      await request(app)
        .post(`/tasks/${task.id}/reminder`)
        .send({ remindAt: '2026-06-01T09:00:00.000Z' })
        .expect(200);

      await request(app).delete(`/tasks/${task.id}`).expect(204);

      // Task is gone; the reminder endpoint should 404 on the task check.
      await request(app).get(`/tasks/${task.id}/reminder`).expect(404);
    });

    it('returns 404 for a non-existent task', async () => {
      const res = await request(app).delete('/tasks/ghost-id').expect(404);
      expect(res.body.error).toBe('TASK_NOT_FOUND');
    });
  });

  // -------------------------------------------------------------------------
  // GET /tasks/:id/reminder – query the active reminder job
  // -------------------------------------------------------------------------

  describe('GET /tasks/:id/reminder', () => {
    it('returns 404 when no reminder has been set', async () => {
      const task = await createTask();
      await request(app).get(`/tasks/${task.id}/reminder`).expect(404);
    });

    it('returns a scheduled ReminderJob when permission is granted', async () => {
      await grantPermission();
      const task = await createTask();
      const remindAt = '2026-06-01T09:00:00.000Z';

      await request(app)
        .post(`/tasks/${task.id}/reminder`)
        .send({ remindAt })
        .expect(200);

      const res = await request(app).get(`/tasks/${task.id}/reminder`).expect(200);
      expect(res.body.taskId).toBe(task.id);
      expect(res.body.remindAt).toBe(remindAt);
      expect(res.body.status).toBe('scheduled');
    });
  });

  // -------------------------------------------------------------------------
  // DELETE /tasks/:id/reminder – explicit cancellation
  // -------------------------------------------------------------------------

  describe('DELETE /tasks/:id/reminder', () => {
    it('cancels an existing reminder and returns 204', async () => {
      await grantPermission();
      const task = await createTask();

      await request(app)
        .post(`/tasks/${task.id}/reminder`)
        .send({ remindAt: '2026-06-01T09:00:00.000Z' })
        .expect(200);

      await request(app).delete(`/tasks/${task.id}/reminder`).expect(204);
      await request(app).get(`/tasks/${task.id}/reminder`).expect(404);
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
