'use strict';

const path = require('path');
const EventKit = require('@nsaky/eventkit');

const customPath = process.env.EVENTKIT_STORAGE_PATH || process.env.STORAGE_PATH;
const STORAGE_PATH = customPath
  ? (path.isAbsolute(customPath)
      ? path.normalize(customPath)
      : path.resolve(process.cwd(), customPath))
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
