'use strict';

const assert = require('assert');
const path = require('path');
const EventKit = require('@nsaky/eventkit');

const STORAGE_PATH = path.resolve(__dirname, '../data/eventkit');

async function testPersistence() {
  console.log('=== TESTING EVENTKIT PERSISTENCE ACROSS RESTARTS ===\n');

  // Step 1: Initialize session 1
  console.log('Session 1: Initializing EventKit');
  await EventKit.initialize({ storagePath: STORAGE_PATH });

  const event = await EventKit.createEvent({
    name: 'Persistent Cloud Forum 2026',
    description: 'Testing survival across server restarts',
    date: '2026-12-25',
    location: 'Chicago, IL',
    capacity: 100
  });
  console.log(`Created event in Session 1: ${event.name} (${event.id})`);

  const attendee = await EventKit.registerAttendee(event.id, {
    name: 'Charlie Davis',
    email: 'charlie.davis@example.com',
    phone: '+1-555-9988'
  });
  const ticketId = attendee.ticket.id;
  console.log(`Registered attendee in Session 1: ${attendee.name} (Ticket: ${ticketId})`);

  // Check in the attendee
  const checkInRes = await EventKit.checkIn(event.id, ticketId);
  console.log(`Checked in attendee in Session 1: ${checkInRes.status} at ${checkInRes.checkedInAt}`);

  // Step 2: Simulate complete server termination and restart
  console.log('\n--- Simulating Server Process Shutdown & Restart ---\n');

  // Re-initialize EventKit pointing to the same storage path
  await EventKit.initialize({ storagePath: STORAGE_PATH });
  console.log('Session 2: EventKit re-initialized with same storage path');

  // Verify event persists
  const reloadedEvent = await EventKit.getEvent(event.id);
  assert.ok(reloadedEvent, 'Event must exist after restart');
  assert.strictEqual(reloadedEvent.name, 'Persistent Cloud Forum 2026');

  // Verify attendee persists
  const reloadedAttendee = await EventKit.getAttendee(attendee.id);
  assert.ok(reloadedAttendee, 'Attendee must exist after restart');
  assert.strictEqual(reloadedAttendee.name, 'Charlie Davis');
  assert.strictEqual(reloadedAttendee.checkedIn, true, 'Check-in state must persist');

  // Verify ticket persists
  const reloadedTicket = await EventKit.getTicket(ticketId);
  assert.ok(reloadedTicket, 'Ticket must exist after restart');
  assert.strictEqual(reloadedTicket.status, 'USED', 'Ticket status must remain USED after restart');
  assert.ok(reloadedTicket.checkedInAt, 'Check-in timestamp must persist');

  // Verify non-destructive validation honors persisted state
  const validation = await EventKit.validateTicket(event.id, ticketId);
  assert.strictEqual(validation.status, 'ALREADY_CHECKED_IN');

  // Verify stats persist
  const stats = await EventKit.getAttendanceStats(event.id);
  assert.strictEqual(stats.totalRegistrations, 1);
  assert.strictEqual(stats.totalCheckedIn, 1);
  assert.strictEqual(stats.attendancePercentage, 100);

  console.log('Verification successful: Event, Attendee, Ticket, Check-in state, and Stats fully survived restart!');

  // Cleanup test event
  await EventKit.deleteEvent(event.id);
  console.log(`Cleaned up test event ${event.id}.\n`);

  console.log('=== PERSISTENCE TEST PASSED SUCCESSFULLY ===\n');
}

testPersistence().catch(err => {
  console.error('PERSISTENCE TEST FAILED:', err);
  process.exit(1);
});
