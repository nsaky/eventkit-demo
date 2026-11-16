'use strict';

const express = require('express');
const router = express.Router();
const { getEventKit } = require('../eventkit');

// List all events
router.get('/', async (req, res, next) => {
  try {
    const kit = await getEventKit();
    const events = await kit.getAllEvents();

    // Attach registration count and stats for convenience
    const eventsWithStats = await Promise.all(
      events.map(async (event) => {
        try {
          const stats = await kit.getAttendanceStats(event.id);
          return {
            ...event,
            stats
          };
        } catch {
          return {
            ...event,
            stats: null
          };
        }
      })
    );

    res.json({
      success: true,
      message: 'Events retrieved successfully',
      data: eventsWithStats
    });
  } catch (err) {
    next(err);
  }
});

// Create new event
router.post('/', async (req, res, next) => {
  try {
    const kit = await getEventKit();
    const { name, description, date, location, capacity } = req.body;

    const event = await kit.createEvent({
      name,
      description,
      date,
      location,
      capacity: capacity === '' || capacity === undefined || capacity === null ? null : Number(capacity)
    });

    res.status(201).json({
      success: true,
      message: `Event '${event.name}' created successfully`,
      data: event
    });
  } catch (err) {
    next(err);
  }
});

// Get single event by ID
router.get('/:id', async (req, res, next) => {
  try {
    const kit = await getEventKit();
    const event = await kit.getEvent(req.params.id);

    if (!event) {
      return res.status(404).json({
        success: false,
        message: `Event '${req.params.id}' not found`
      });
    }

    const [attendees, tickets, stats] = await Promise.all([
      kit.getAttendees(req.params.id).catch(() => []),
      kit.getTickets(req.params.id).catch(() => []),
      kit.getAttendanceStats(req.params.id).catch(() => null)
    ]);

    res.json({
      success: true,
      message: 'Event details retrieved successfully',
      data: {
        ...event,
        attendees,
        tickets,
        stats
      }
    });
  } catch (err) {
    next(err);
  }
});

// Update event
router.put('/:id', async (req, res, next) => {
  try {
    const kit = await getEventKit();
    const { name, description, date, location, capacity } = req.body;

    const updates = {};
    if (name !== undefined) updates.name = name;
    if (description !== undefined) updates.description = description;
    if (date !== undefined) updates.date = date;
    if (location !== undefined) updates.location = location;
    if (capacity !== undefined) {
      updates.capacity = capacity === null || capacity === '' ? null : Number(capacity);
    }

    const updated = await kit.updateEvent(req.params.id, updates);

    res.json({
      success: true,
      message: `Event '${updated.name}' updated successfully`,
      data: updated
    });
  } catch (err) {
    next(err);
  }
});

// Delete event (cascades to attendees & tickets)
router.delete('/:id', async (req, res, next) => {
  try {
    const kit = await getEventKit();
    const deleted = await kit.deleteEvent(req.params.id);

    res.json({
      success: true,
      message: `Event '${deleted.name}' deleted successfully`,
      data: deleted
    });
  } catch (err) {
    next(err);
  }
});

// Get attendees for event
router.get('/:id/attendees', async (req, res, next) => {
  try {
    const kit = await getEventKit();
    const attendees = await kit.getAttendees(req.params.id);

    res.json({
      success: true,
      message: 'Attendees retrieved successfully',
      data: attendees
    });
  } catch (err) {
    next(err);
  }
});

// Get tickets for event
router.get('/:id/tickets', async (req, res, next) => {
  try {
    const kit = await getEventKit();
    const tickets = await kit.getTickets(req.params.id);

    res.json({
      success: true,
      message: 'Tickets retrieved successfully',
      data: tickets
    });
  } catch (err) {
    next(err);
  }
});

// Get checked-in attendees for event
router.get('/:id/checked-in', async (req, res, next) => {
  try {
    const kit = await getEventKit();
    const checkedIn = await kit.getCheckedInAttendees(req.params.id);

    res.json({
      success: true,
      message: 'Checked-in attendees retrieved successfully',
      data: checkedIn
    });
  } catch (err) {
    next(err);
  }
});

// Get attendance stats for event
router.get('/:id/stats', async (req, res, next) => {
  try {
    const kit = await getEventKit();
    const stats = await kit.getAttendanceStats(req.params.id);

    res.json({
      success: true,
      message: 'Attendance statistics retrieved successfully',
      data: stats
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
