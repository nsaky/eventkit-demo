'use strict';

const path = require('path');
const EventKit = require('@nsaky/eventkit');

const STORAGE_PATH = process.env.STORAGE_PATH
  ? (path.isAbsolute(process.env.STORAGE_PATH)
      ? path.normalize(process.env.STORAGE_PATH)
      : path.resolve(process.cwd(), process.env.STORAGE_PATH))
  : path.resolve(__dirname, '../data/eventkit');

let initialized = false;

async function getEventKit() {
  if (!initialized) {
    await EventKit.initialize({
      storagePath: STORAGE_PATH
    });
    initialized = true;
  }
  return EventKit;
}

module.exports = {
  getEventKit,
  EventKit,
  STORAGE_PATH
};
