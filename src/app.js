'use strict';

const express = require('express');
const taskRoutes = require('./routes/tasks');

const app = express();

app.use(express.json());

app.use('/tasks', taskRoutes);

module.exports = app;
