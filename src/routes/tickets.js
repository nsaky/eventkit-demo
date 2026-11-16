'use strict';

const express = require('express');
const router = express.Router();
const { getEventKit } = require('../eventkit');

// List tickets (optionally filtered by eventId)
router.get('/', async (req, res, next) => {
  try {
    const kit = await getEventKit();
    const { eventId } = req.query;

    const tickets = eventId
      ? await kit.getTickets(eventId)
      : await kit.getAllTickets();

    // Enrich tickets with attendee and event names
    const enriched = await Promise.all(
      tickets.map(async (t) => {
        let attendeeName = 'Unknown Attendee';
        let attendeeEmail = '';
        let eventName = 'Unknown Event';

        try {
          const attendee = await kit.getAttendee(t.attendeeId);
          if (attendee) {
            attendeeName = attendee.name;
            attendeeEmail = attendee.email;
          }
        } catch {}

        try {
          const event = await kit.getEvent(t.eventId);
          if (event) {
            eventName = event.name;
          }
        } catch {}

        return {
          ...t,
          attendeeName,
          attendeeEmail,
          eventName
        };
      })
    );

    res.json({
      success: true,
      message: 'Tickets retrieved successfully',
      data: enriched
    });
  } catch (err) {
    next(err);
  }
});

// Standalone ticket generation
router.post('/generate', async (req, res, next) => {
  try {
    const kit = await getEventKit();
    const { attendeeId, returnExisting } = req.body;

    const ticket = await kit.generateTicket(attendeeId, {
      returnExisting: Boolean(returnExisting)
    });

    res.status(201).json({
      success: true,
      message: `Ticket '${ticket.id}' generated successfully`,
      data: ticket
    });
  } catch (err) {
    next(err);
  }
});

// Validate ticket (read-only)
router.post('/validate', async (req, res, next) => {
  try {
    const kit = await getEventKit();
    const { eventId, ticketId } = req.body;

    if (!eventId || !ticketId) {
      return res.status(400).json({
        success: false,
        message: 'Both Event ID and Ticket ID are required for validation.'
      });
    }

    const result = await kit.validateTicket(eventId, ticketId);

    res.json({
      success: true,
      message: result.message,
      data: result
    });
  } catch (err) {
    next(err);
  }
});

// Check-in ticket (stateful check-in)
router.post('/check-in', async (req, res, next) => {
  try {
    const kit = await getEventKit();
    const { eventId, ticketId } = req.body;

    if (!eventId || !ticketId) {
      return res.status(400).json({
        success: false,
        message: 'Both Event ID and Ticket ID are required for check-in.'
      });
    }

    const result = await kit.checkIn(eventId, ticketId);

    res.json({
      success: true,
      message: result.message,
      data: result
    });
  } catch (err) {
    next(err);
  }
});

// Get single ticket by ID
router.get('/:id', async (req, res, next) => {
  try {
    const kit = await getEventKit();
    const ticket = await kit.getTicket(req.params.id);

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: `Ticket '${req.params.id}' not found`
      });
    }

    let attendee = null;
    let event = null;

    try {
      attendee = await kit.getAttendee(ticket.attendeeId);
    } catch {}

    try {
      event = await kit.getEvent(ticket.eventId);
    } catch {}

    res.json({
      success: true,
      message: 'Ticket details retrieved successfully',
      data: {
        ...ticket,
        attendee,
        event
      }
    });
  } catch (err) {
    next(err);
  }
});

// Cancel ticket
router.post('/:id/cancel', async (req, res, next) => {
  try {
    const kit = await getEventKit();
    const updatedTicket = await kit.cancelTicket(req.params.id);

    res.json({
      success: true,
      message: `Ticket '${updatedTicket.id}' cancelled successfully`,
      data: updatedTicket
    });
  } catch (err) {
    next(err);
  }
});

// Check-in status of ticket
router.get('/:id/check-in-status', async (req, res, next) => {
  try {
    const kit = await getEventKit();
    const status = await kit.getCheckInStatus(req.params.id);

    res.json({
      success: true,
      message: 'Check-in status retrieved successfully',
      data: status
    });
  } catch (err) {
    next(err);
  }
});

// Generate QR Code for ticket (PNG or SVG)
router.get('/:id/qr', async (req, res, next) => {
  try {
    const kit = await getEventKit();
    const { format = 'png', width, margin, errorCorrectionLevel, download } = req.query;

    const qrResult = await kit.generateQRCode(req.params.id, {
      format: format.toLowerCase() === 'svg' ? 'svg' : 'png',
      width: width ? Number(width) : 300,
      margin: margin ? Number(margin) : 2,
      errorCorrectionLevel: errorCorrectionLevel || 'M'
    });

    if (download === 'true') {
      const ext = qrResult.format === 'svg' ? 'svg' : 'png';
      res.setHeader('Content-Disposition', `attachment; filename="ticket-${req.params.id}-qr.${ext}"`);
    }

    res.setHeader('Content-Type', qrResult.mimeType);

    if (qrResult.format === 'png') {
      return res.send(qrResult.data);
    } else {
      return res.send(qrResult.data);
    }
  } catch (err) {
    next(err);
  }
});

module.exports = router;
