'use strict';

const express = require('express');
const router = express.Router();
const { getEventKit } = require('../eventkit');

// Export attendees for an event
router.get('/attendees', async (req, res, next) => {
  try {
    const kit = await getEventKit();
    const { eventId, format = 'csv', download } = req.query;

    if (!eventId) {
      return res.status(400).json({
        success: false,
        message: 'Event ID is required for export.'
      });
    }

    const cleanFormat = format.toLowerCase() === 'json' ? 'json' : 'csv';
    const content = await kit.exportAttendees(eventId, cleanFormat);

    const event = await kit.getEvent(eventId);
    const safeEventName = (event ? event.name : eventId).replace(/[^a-zA-Z0-9_-]/g, '_');
    const filename = `attendees-${safeEventName}.${cleanFormat}`;

    if (cleanFormat === 'csv') {
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    } else {
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
    }

    if (download !== 'false') {
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    }

    res.send(typeof content === 'string' ? content : (content.content || String(content)));
  } catch (err) {
    next(err);
  }
});

// Export complete event snapshot
router.get('/event', async (req, res, next) => {
  try {
    const kit = await getEventKit();
    const { eventId, format = 'json', download } = req.query;

    if (!eventId) {
      return res.status(400).json({
        success: false,
        message: 'Event ID is required for export.'
      });
    }

    const cleanFormat = format.toLowerCase() === 'csv' ? 'csv' : 'json';
    const content = await kit.exportEvent(eventId, cleanFormat);

    const event = await kit.getEvent(eventId);
    const safeEventName = (event ? event.name : eventId).replace(/[^a-zA-Z0-9_-]/g, '_');
    const filename = `event-snapshot-${safeEventName}.${cleanFormat}`;

    if (cleanFormat === 'csv') {
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    } else {
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
    }

    if (download !== 'false') {
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    }

    res.send(typeof content === 'string' ? content : (content.content || String(content)));
  } catch (err) {
    next(err);
  }
});

module.exports = router;
