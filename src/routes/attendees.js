'use strict';

const express = require('express');
const router = express.Router();
const { getEventKit } = require('../eventkit');

// List attendees (optionally filtered by eventId)
router.get('/', async (req, res, next) => {
  try {
    const kit = await getEventKit();
    const { eventId } = req.query;

    let attendees = [];

    if (eventId) {
      attendees = await kit.getAttendees(eventId);
      // Map ticket details
      const attendeesWithTickets = await Promise.all(
        attendees.map(async (a) => {
          const full = await kit.getAttendee(a.id);
          return full;
        })
      );
      attendees = attendeesWithTickets;
    } else {
      // Aggregate across all events
      const events = await kit.getAllEvents();
      for (const event of events) {
        const evAttendees = await kit.getAttendees(event.id);
        const detailed = await Promise.all(
          evAttendees.map(async (a) => {
            const full = await kit.getAttendee(a.id);
            return {
              ...full,
              eventName: event.name
            };
          })
        );
        attendees.push(...detailed);
      }
    }

    res.json({
      success: true,
      message: 'Attendees retrieved successfully',
      data: attendees
    });
  } catch (err) {
    next(err);
  }
});

// Register attendee
router.post('/', async (req, res, next) => {
  try {
    const kit = await getEventKit();
    const { eventId, name, email, phone } = req.body;

    if (!eventId) {
      return res.status(400).json({
        success: false,
        message: 'Event ID is required'
      });
    }

    const attendee = await kit.registerAttendee(eventId, {
      name,
      email,
      phone: phone || undefined
    });

    res.status(201).json({
      success: true,
      message: `Attendee '${attendee.name}' registered successfully with ticket '${attendee.ticket ? attendee.ticket.id : ''}'`,
      data: attendee
    });
  } catch (err) {
    next(err);
  }
});

// Get attendee details by ID
router.get('/:id', async (req, res, next) => {
  try {
    const kit = await getEventKit();
    const attendee = await kit.getAttendee(req.params.id);

    if (!attendee) {
      return res.status(404).json({
        success: false,
        message: `Attendee '${req.params.id}' not found`
      });
    }

    // Attach event details
    let event = null;
    try {
      event = await kit.getEvent(attendee.eventId);
    } catch {}

    res.json({
      success: true,
      message: 'Attendee retrieved successfully',
      data: {
        ...attendee,
        event
      }
    });
  } catch (err) {
    next(err);
  }
});

// Remove attendee
router.delete('/:id', async (req, res, next) => {
  try {
    const kit = await getEventKit();
    const removed = await kit.removeAttendee(req.params.id);

    res.json({
      success: true,
      message: `Attendee '${removed.name}' removed successfully`,
      data: removed
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
