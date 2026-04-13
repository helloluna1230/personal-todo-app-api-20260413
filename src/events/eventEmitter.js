'use strict';

const { EventEmitter } = require('events');

/**
 * Application-wide event emitter used to publish domain events.
 * Consumers can subscribe with emitter.on('task.completed', handler).
 */
const emitter = new EventEmitter();

module.exports = emitter;
