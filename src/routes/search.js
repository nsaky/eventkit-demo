'use strict';

const express = require('express');
const router = express.Router();
const { getEventKit } = require('../eventkit');

// Search attendees
router.get('/attendees', async (req, res, next) => {
  try {
    const kit = await getEventKit();
    const { eventId, query = '', checkedIn, status } = req.query;

    const options = {};
    if (checkedIn !== undefined && checkedIn !== '') {
      options.checkedIn = checkedIn === 'true';
    }
    if (status !== undefined && status !== '') {
      options.status = status;
    }

    let results = [];

    if (eventId) {
      // Use EventKit's native searchAttendees method
      const event = await kit.getEvent(eventId);
      const matches = await kit.searchAttendees(eventId, query, options);
      results = matches.map(m => ({
        ...m,
        eventName: event ? event.name : 'Unknown Event'
      }));
    } else {
      // Search across all events using EventKit's searchAttendees per event
      const events = await kit.getAllEvents();
      for (const event of events) {
        try {
          const matches = await kit.searchAttendees(event.id, query, options);
          const enriched = matches.map(m => ({
            ...m,
            eventName: event.name
          }));
          results.push(...enriched);
        } catch (e) {
          console.error(`Search failed for event ${event.id}:`, e.message);
        }
      }
    }

    res.json({
      success: true,
      message: `Found ${results.length} matching attendees`,
      data: results
    });
  } catch (err) {
    next(err);
  }
});

// Search ticket by ID (with linked attendee and event)
router.get('/tickets/:id', async (req, res, next) => {
  try {
    const kit = await getEventKit();
    const result = await kit.searchTicket(req.params.id);

    if (!result) {
      return res.status(404).json({
        success: false,
        message: `Ticket '${req.params.id}' not found`
      });
    }

    res.json({
      success: true,
      message: 'Ticket found',
      data: result
    });
  } catch (err) {
    next(err);
  }
});

// Search events
router.get('/events', async (req, res, next) => {
  try {
    const kit = await getEventKit();
    const { query = '' } = req.query;
    const cleanQuery = query.trim().toLowerCase();

    const events = await kit.getAllEvents();

    const filtered = cleanQuery
      ? events.filter(e =>
          (e.name && e.name.toLowerCase().includes(cleanQuery)) ||
          (e.description && e.description.toLowerCase().includes(cleanQuery)) ||
          (e.location && e.location.toLowerCase().includes(cleanQuery)) ||
          (e.id && e.id.toLowerCase().includes(cleanQuery))
        )
      : events;

    res.json({
      success: true,
      message: `Found ${filtered.length} events`,
      data: filtered
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
