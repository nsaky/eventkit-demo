'use strict';

const express = require('express');
const router = express.Router();
const { getEventKit } = require('../eventkit');

// Global analytics & dashboard overview
router.get('/', async (req, res, next) => {
  try {
    const kit = await getEventKit();

    const [events, allTickets] = await Promise.all([
      kit.getAllEvents(),
      kit.getAllTickets()
    ]);

    let totalRegistrations = 0;
    let totalCheckedIn = 0;
    let totalFiniteCapacity = 0;
    let finiteCapacityEventsCount = 0;

    const eventSummaries = [];
    const allAttendees = [];

    for (const event of events) {
      try {
        const stats = await kit.getAttendanceStats(event.id);
        const attendees = await kit.getAttendees(event.id);

        totalRegistrations += stats.totalRegistrations;
        totalCheckedIn += stats.totalCheckedIn;

        if (event.capacity !== null && event.capacity > 0) {
          totalFiniteCapacity += event.capacity;
          finiteCapacityEventsCount++;
        }

        eventSummaries.push({
          id: event.id,
          name: event.name,
          date: event.date,
          location: event.location,
          capacity: event.capacity,
          stats
        });

        // Collect attendees for recent activity
        attendees.forEach(a => {
          allAttendees.push({
            ...a,
            eventName: event.name
          });
        });
      } catch (e) {
        console.error(`Failed to load stats for event ${event.id}:`, e.message);
      }
    }

    const activeTickets = allTickets.filter(t => t.status === 'ACTIVE').length;
    const usedTickets = allTickets.filter(t => t.status === 'USED').length;
    const cancelledTickets = allTickets.filter(t => t.status === 'CANCELLED').length;

    const overallAttendanceRate = totalRegistrations > 0
      ? Number(((totalCheckedIn / totalRegistrations) * 100).toFixed(1))
      : 0;

    const remainingFiniteCapacity = totalFiniteCapacity > totalRegistrations
      ? totalFiniteCapacity - totalRegistrations
      : 0;

    // Recent events (sorted newest first by createdAt)
    const recentEvents = [...events]
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 5);

    // Recent registrations (sorted newest first)
    const recentAttendees = [...allAttendees]
      .sort((a, b) => new Date(b.registeredAt) - new Date(a.registeredAt))
      .slice(0, 5);

    // Recent check-ins (sorted newest check-in first)
    const recentCheckIns = allAttendees
      .filter(a => a.checkedIn && a.checkedInAt)
      .sort((a, b) => new Date(b.checkedInAt) - new Date(a.checkedInAt))
      .slice(0, 5);

    res.json({
      success: true,
      message: 'Global analytics retrieved successfully',
      data: {
        summary: {
          totalEvents: events.length,
          totalAttendees: totalRegistrations,
          totalTickets: allTickets.length,
          totalCheckedIn,
          activeTickets,
          usedTickets,
          cancelledTickets,
          attendanceRate: overallAttendanceRate,
          totalCapacity: totalFiniteCapacity || null,
          remainingCapacity: finiteCapacityEventsCount > 0 ? remainingFiniteCapacity : null
        },
        eventSummaries,
        recentActivity: {
          recentEvents,
          recentAttendees,
          recentCheckIns
        }
      }
    });
  } catch (err) {
    next(err);
  }
});

// Event-specific analytics
router.get('/events/:id', async (req, res, next) => {
  try {
    const kit = await getEventKit();
    const stats = await kit.getAttendanceStats(req.params.id);

    res.json({
      success: true,
      message: 'Event analytics retrieved successfully',
      data: stats
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
