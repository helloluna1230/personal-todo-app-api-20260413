const express = require('express');
const tasksRouter = require('./routes');

function createApp() {
  const app = express();
  app.use(express.json());

  app.get('/health', (_req, res) => res.json({ status: 'ok' }));
  app.use('/tasks', tasksRouter);

  return app;
}

module.exports = { createApp };
