const express = require('express');
const organizationRouter = require('./routes');
const commandRouter = require('./commandRoutes');

function createApp() {
  const app = express();
  app.use(express.json());

  app.get('/health', (_req, res) => res.json({ status: 'ok' }));

  // task-organization read-model (GET only)
  app.use('/tasks', organizationRouter);

  // TaskCommandService write routes (POST / PATCH / DELETE)
  app.use('/tasks', commandRouter);

  return app;
}

module.exports = { createApp };
