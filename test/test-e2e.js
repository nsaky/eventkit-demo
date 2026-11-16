'use strict';

const assert = require('assert');
const path = require('path');
const fs = require('fs');
const http = require('http');

const { app, startServer } = require('../src/server');
const { getEventKit, STORAGE_PATH } = require('../src/eventkit');

async function runTests() {
  console.log('=== STARTING COMPLETE EVENTKIT DEMO E2E TESTS ===\n');

  // Start app on ephemeral port for test
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}`;
  console.log(`Test server running at ${baseUrl}`);

  function makeRequest(method, urlPath, body = null) {
    return new Promise((resolve, reject) => {
      const url = new URL(urlPath, baseUrl);
      const options = {
        method,
        hostname: url.hostname,
        port: url.port,
        path: url.pathname + url.search,
        headers: {}
      };

      let reqBody = null;
      if (body) {
        reqBody = JSON.stringify(body);
        options.headers['Content-Type'] = 'application/json';
        options.headers['Content-Length'] = Buffer.byteLength(reqBody);
      }

      const req = http.request(options, (res) => {
        const chunks = [];
        res.on('data', chunk => chunks.push(chunk));
        res.on('end', () => {
          const raw = Buffer.concat(chunks);
          const contentType = res.headers['content-type'] || '';
          let data = raw.toString('utf8');
          if (contentType.includes('application/json')) {
            try {
              data = JSON.parse(data);
            } catch {}
          }
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: data,
            raw
          });
        });
      });

      req.on('error', reject);
      if (reqBody) {
        req.write(reqBody);
      }
      req.end();
    });
  }

  try {
    // 1. Health check
    console.log('Test 1: Health check');
    const health = await makeRequest('GET', '/api/health');
    assert.strictEqual(health.status, 200);
    assert.strictEqual(health.body.success, true);
    assert.strictEqual(health.body.package.name, '@nsaky/eventkit');
    assert.strictEqual(health.body.package.version, '1.0.0');
    console.log('  PASSED: Health check returned healthy and identified @nsaky/eventkit v1.0.0\n');

    // 2. Create Event
    console.log('Test 2: Event creation');
    const createEv1 = await makeRequest('POST', '/api/events', {
      name: 'Global Developer Conclave 2026',
      description: 'Flagship engineering conference',
      date: '2026-12-10',
      location: 'San Francisco, CA',
      capacity: 50
    });
    assert.strictEqual(createEv1.status, 201);
    assert.strictEqual(createEv1.body.success, true);
    const event1 = createEv1.body.data;
    assert.ok(event1.id.startsWith('evt_'));
    assert.strictEqual(event1.name, 'Global Developer Conclave 2026');
    assert.strictEqual(event1.capacity, 50);
    console.log(`  PASSED: Created event '${event1.name}' (ID: ${event1.id})\n`);

    // Create a limited event with capacity 1 for capacity testing
    const createEv2 = await makeRequest('POST', '/api/events', {
      name: 'Exclusive VIP Workshop',
      description: 'Single seat workshop',
      date: '2026-11-30',
      location: 'New York, NY',
      capacity: 1
    });
    assert.strictEqual(createEv2.status, 201);
    const event2 = createEv2.body.data;
    console.log(`  PASSED: Created capacity-limited event '${event2.name}' (ID: ${event2.id})\n`);

    // 3. List Events & Get Event Details
    console.log('Test 3: Event listing and details retrieval');
    const listEvents = await makeRequest('GET', '/api/events');
    assert.strictEqual(listEvents.status, 200);
    assert.ok(Array.isArray(listEvents.body.data));
    assert.ok(listEvents.body.data.some(e => e.id === event1.id));

    const getEv1 = await makeRequest('GET', `/api/events/${event1.id}`);
    assert.strictEqual(getEv1.status, 200);
    assert.strictEqual(getEv1.body.data.name, 'Global Developer Conclave 2026');
    console.log('  PASSED: Events listed and event details retrieved successfully.\n');

    // 4. Update Event
    console.log('Test 4: Update event');
    const updateRes = await makeRequest('PUT', `/api/events/${event1.id}`, {
      description: 'Updated description for annual summit'
    });
    assert.strictEqual(updateRes.status, 200);
    assert.strictEqual(updateRes.body.data.description, 'Updated description for annual summit');
    console.log('  PASSED: Event updated successfully.\n');

    // 5. Attendee Registration & Automatic Ticket Generation
    console.log('Test 5: Attendee registration with automatic ticket creation');
    const regRes1 = await makeRequest('POST', '/api/attendees', {
      eventId: event1.id,
      name: 'Alice Johnson',
      email: 'Alice.Johnson@Example.com',
      phone: '+1-555-0101'
    });
    assert.strictEqual(regRes1.status, 201);
    assert.strictEqual(regRes1.body.success, true);
    const attendee1 = regRes1.body.data;
    assert.ok(attendee1.id.startsWith('att_'));
    assert.strictEqual(attendee1.email, 'alice.johnson@example.com', 'Email must be normalized to lowercase');
    assert.ok(attendee1.ticket, 'Registration must automatically issue ticket');
    assert.ok(attendee1.ticket.id.startsWith('EK-'));
    assert.strictEqual(attendee1.ticket.status, 'ACTIVE');
    const ticket1 = attendee1.ticket;
    console.log(`  PASSED: Registered '${attendee1.name}', automatically issued ticket '${ticket1.id}'\n`);

    // Register second attendee for event1
    const regRes2 = await makeRequest('POST', '/api/attendees', {
      eventId: event1.id,
      name: 'Bob Smith',
      email: 'bob.smith@example.com',
      phone: '+1-555-0102'
    });
    assert.strictEqual(regRes2.status, 201);
    const attendee2 = regRes2.body.data;
    const ticket2 = attendee2.ticket;
    console.log(`  PASSED: Registered second attendee '${attendee2.name}' (Ticket: ${ticket2.id})\n`);

    // 6. Duplicate Registration Prevention
    console.log('Test 6: Duplicate registration prevention');
    const dupRes = await makeRequest('POST', '/api/attendees', {
      eventId: event1.id,
      name: 'Alice Duplicate',
      email: 'ALICE.johnson@example.com' // same normalized email
    });
    assert.strictEqual(dupRes.status, 409);
    assert.strictEqual(dupRes.body.success, false);
    assert.strictEqual(dupRes.body.error.code, 'DUPLICATE_REGISTRATION');
    console.log('  PASSED: Duplicate registration was rejected by EventKit with DUPLICATE_REGISTRATION.\n');

    // 7. Event Capacity Enforcement
    console.log('Test 7: Event capacity enforcement');
    // First seat on event2 (capacity 1)
    const capReg1 = await makeRequest('POST', '/api/attendees', {
      eventId: event2.id,
      name: 'VIP Guest',
      email: 'vip@example.com'
    });
    assert.strictEqual(capReg1.status, 201);

    // Second seat should exceed capacity
    const capReg2 = await makeRequest('POST', '/api/attendees', {
      eventId: event2.id,
      name: 'Overflow Guest',
      email: 'overflow@example.com'
    });
    assert.strictEqual(capReg2.status, 409);
    assert.strictEqual(capReg2.body.error.code, 'EVENT_CAPACITY_REACHED');
    console.log('  PASSED: EventKit rejected registration over capacity with EVENT_CAPACITY_REACHED.\n');

    // 8. Ticket Retrieval
    console.log('Test 8: Ticket retrieval by ID and event');
    const getTicketRes = await makeRequest('GET', `/api/tickets/${ticket1.id}`);
    assert.strictEqual(getTicketRes.status, 200);
    assert.strictEqual(getTicketRes.body.data.id, ticket1.id);
    assert.strictEqual(getTicketRes.body.data.attendee.name, 'Alice Johnson');

    const getEvTickets = await makeRequest('GET', `/api/tickets?eventId=${event1.id}`);
    assert.strictEqual(getEvTickets.status, 200);
    assert.strictEqual(getEvTickets.body.data.length, 2);
    console.log('  PASSED: Tickets retrieved and enriched with attendee details.\n');

    // 9. QR Code Generation (PNG and SVG)
    console.log('Test 9: QR Code Generation (PNG buffer and SVG string)');
    const qrPng = await makeRequest('GET', `/api/tickets/${ticket1.id}/qr?format=png`);
    assert.strictEqual(qrPng.status, 200);
    assert.strictEqual(qrPng.headers['content-type'], 'image/png');
    assert.ok(qrPng.raw.length > 100, 'PNG buffer must have image data');

    const qrSvg = await makeRequest('GET', `/api/tickets/${ticket1.id}/qr?format=svg`);
    assert.strictEqual(qrSvg.status, 200);
    assert.ok(qrSvg.headers['content-type'].includes('svg'));
    assert.ok(qrSvg.raw.toString('utf8').includes('<svg'), 'SVG must include <svg tag');
    console.log('  PASSED: Both PNG buffer and SVG vector QR codes generated cleanly.\n');

    // 10. Non-Destructive Ticket Validation
    console.log('Test 10: Non-destructive ticket validation');
    // Valid ticket
    const valValid = await makeRequest('POST', '/api/tickets/validate', {
      eventId: event1.id,
      ticketId: ticket1.id
    });
    assert.strictEqual(valValid.status, 200);
    assert.strictEqual(valValid.body.data.valid, true);
    assert.strictEqual(valValid.body.data.status, 'VALID');

    // Nonexistent ticket
    const valInvalid = await makeRequest('POST', '/api/tickets/validate', {
      eventId: event1.id,
      ticketId: 'EK-0000000000'
    });
    assert.strictEqual(valInvalid.status, 200);
    assert.strictEqual(valInvalid.body.data.valid, false);
    assert.strictEqual(valInvalid.body.data.status, 'INVALID');

    // Wrong event
    const valWrongEv = await makeRequest('POST', '/api/tickets/validate', {
      eventId: event2.id,
      ticketId: ticket1.id
    });
    assert.strictEqual(valWrongEv.status, 200);
    assert.strictEqual(valWrongEv.body.data.valid, false);
    assert.strictEqual(valWrongEv.body.data.status, 'WRONG_EVENT');

    // Verify ticket1 status was NOT modified by validation (still ACTIVE)
    const checkStillActive = await makeRequest('GET', `/api/tickets/${ticket1.id}`);
    assert.strictEqual(checkStillActive.body.data.status, 'ACTIVE');
    console.log('  PASSED: Validation returned VALID, INVALID, WRONG_EVENT and remained read-only.\n');

    // 11. Attendee Check-In & Duplicate Prevention
    console.log('Test 11: Gate Check-in & Duplicate check-in rejection');
    const checkIn1 = await makeRequest('POST', '/api/tickets/check-in', {
      eventId: event1.id,
      ticketId: ticket1.id
    });
    assert.strictEqual(checkIn1.status, 200);
    assert.strictEqual(checkIn1.body.data.status, 'CHECKED_IN');
    assert.strictEqual(checkIn1.body.data.attendeeName, 'Alice Johnson');
    assert.ok(checkIn1.body.data.checkedInAt);

    // Verify ticket is now USED
    const checkUsed = await makeRequest('GET', `/api/tickets/${ticket1.id}`);
    assert.strictEqual(checkUsed.body.data.status, 'USED');
    assert.ok(checkUsed.body.data.checkedInAt);

    // Duplicate check-in attempt
    const dupCheckIn = await makeRequest('POST', '/api/tickets/check-in', {
      eventId: event1.id,
      ticketId: ticket1.id
    });
    assert.strictEqual(dupCheckIn.status, 409);
    assert.strictEqual(dupCheckIn.body.error.code, 'ALREADY_CHECKED_IN');

    // Validate already checked-in ticket
    const valAlreadyUsed = await makeRequest('POST', '/api/tickets/validate', {
      eventId: event1.id,
      ticketId: ticket1.id
    });
    assert.strictEqual(valAlreadyUsed.body.data.valid, false);
    assert.strictEqual(valAlreadyUsed.body.data.status, 'ALREADY_CHECKED_IN');
    console.log('  PASSED: Check-in admitted attendee, updated ticket to USED, and rejected duplicate check-in.\n');

    // 12. Ticket Cancellation
    console.log('Test 12: Ticket cancellation');
    const cancelRes = await makeRequest('POST', `/api/tickets/${ticket2.id}/cancel`);
    assert.strictEqual(cancelRes.status, 200);
    assert.strictEqual(cancelRes.body.data.status, 'CANCELLED');

    // Validate cancelled ticket
    const valCancelled = await makeRequest('POST', '/api/tickets/validate', {
      eventId: event1.id,
      ticketId: ticket2.id
    });
    assert.strictEqual(valCancelled.body.data.valid, false);
    assert.strictEqual(valCancelled.body.data.status, 'CANCELLED');

    // Attempt check-in on cancelled ticket
    const checkCancelled = await makeRequest('POST', '/api/tickets/check-in', {
      eventId: event1.id,
      ticketId: ticket2.id
    });
    assert.strictEqual(checkCancelled.status, 409);
    assert.strictEqual(checkCancelled.body.error.code, 'TICKET_CANCELLED');
    console.log('  PASSED: Ticket cancelled; validation returned CANCELLED and check-in was rejected.\n');

    // 13. Search Functionality
    console.log('Test 13: Search attendees, tickets, and events');
    const searchByName = await makeRequest('GET', `/api/search/attendees?eventId=${event1.id}&query=Alice`);
    assert.strictEqual(searchByName.status, 200);
    assert.strictEqual(searchByName.body.data.length, 1);
    assert.strictEqual(searchByName.body.data[0].name, 'Alice Johnson');

    const searchByTicket = await makeRequest('GET', `/api/search/attendees?eventId=${event1.id}&query=${ticket1.id}`);
    assert.strictEqual(searchByTicket.status, 200);
    assert.strictEqual(searchByTicket.body.data.length, 1);

    const searchTicketObj = await makeRequest('GET', `/api/search/tickets/${ticket1.id}`);
    assert.strictEqual(searchTicketObj.status, 200);
    assert.strictEqual(searchTicketObj.body.data.ticket.id, ticket1.id);
    assert.strictEqual(searchTicketObj.body.data.attendee.name, 'Alice Johnson');

    const searchEvents = await makeRequest('GET', '/api/search/events?query=Developer');
    assert.strictEqual(searchEvents.status, 200);
    assert.ok(searchEvents.body.data.length >= 1);
    console.log('  PASSED: Search by name, ticket ID, and event query succeeded.\n');

    // 14. Attendance Analytics
    console.log('Test 14: Attendance statistics');
    const statsRes = await makeRequest('GET', `/api/analytics/events/${event1.id}`);
    assert.strictEqual(statsRes.status, 200);
    const stats = statsRes.body.data;
    assert.strictEqual(stats.totalRegistrations, 2);
    assert.strictEqual(stats.totalCheckedIn, 1);
    assert.strictEqual(stats.totalPending, 1);
    assert.strictEqual(stats.attendancePercentage, 50); // 1 out of 2 = 50%
    console.log(`  PASSED: Attendance stats calculated accurately: 1/2 checked in = ${stats.attendancePercentage}%\n`);

    // 15. Data Export
    console.log('Test 15: Data export (CSV and JSON)');
    const exportCsv = await makeRequest('GET', `/api/export/attendees?eventId=${event1.id}&format=csv&download=false`);
    assert.strictEqual(exportCsv.status, 200);
    assert.ok(exportCsv.headers['content-type'].includes('text/csv'));
    assert.ok(exportCsv.raw.toString('utf8').includes('Attendee ID,Attendee Name,Email Address'));
    assert.ok(exportCsv.raw.toString('utf8').includes('Alice Johnson'));

    const exportJson = await makeRequest('GET', `/api/export/attendees?eventId=${event1.id}&format=json&download=false`);
    assert.strictEqual(exportJson.status, 200);
    assert.ok(exportJson.headers['content-type'].includes('application/json'));
    assert.ok(Array.isArray(exportJson.body));

    const exportSnapshot = await makeRequest('GET', `/api/export/event?eventId=${event1.id}&format=json&download=false`);
    assert.strictEqual(exportSnapshot.status, 200);
    assert.strictEqual(exportSnapshot.body.event.id, event1.id);
    assert.ok(exportSnapshot.body.summary);
    console.log('  PASSED: RFC 4180 CSV and JSON exports generated and verified.\n');

    // 16. Persistent JSON Storage Verification
    console.log('Test 16: Verify persistent JSON storage files on disk');
    const eventsFile = path.join(STORAGE_PATH, 'events.json');
    const attendeesFile = path.join(STORAGE_PATH, 'attendees.json');
    const ticketsFile = path.join(STORAGE_PATH, 'tickets.json');

    assert.ok(fs.existsSync(eventsFile), 'events.json must exist in data/eventkit');
    assert.ok(fs.existsSync(attendeesFile), 'attendees.json must exist in data/eventkit');
    assert.ok(fs.existsSync(ticketsFile), 'tickets.json must exist in data/eventkit');

    const storedEvents = JSON.parse(fs.readFileSync(eventsFile, 'utf8'));
    const storedAttendees = JSON.parse(fs.readFileSync(attendeesFile, 'utf8'));
    const storedTickets = JSON.parse(fs.readFileSync(ticketsFile, 'utf8'));

    assert.ok(storedEvents.some(e => e.id === event1.id));
    assert.ok(storedAttendees.some(a => a.id === attendee1.id));
    assert.ok(storedTickets.some(t => t.id === ticket1.id));
    console.log(`  PASSED: Storage files verified on disk in ${STORAGE_PATH}\n`);

    // 17. Cascade Deletion
    console.log('Test 17: Cascade deletion of event and linked records');
    const delRes = await makeRequest('DELETE', `/api/events/${event1.id}`);
    assert.strictEqual(delRes.status, 200);

    const getEvAfterDel = await makeRequest('GET', `/api/events/${event1.id}`);
    assert.strictEqual(getEvAfterDel.status, 404);

    const getAttAfterDel = await makeRequest('GET', `/api/attendees/${attendee1.id}`);
    assert.strictEqual(getAttAfterDel.status, 404);

    const getTicketAfterDel = await makeRequest('GET', `/api/tickets/${ticket1.id}`);
    assert.strictEqual(getTicketAfterDel.status, 404);
    console.log('  PASSED: Cascade deletion verified for event, attendees, and tickets.\n');

    console.log('====================================================');
    console.log('ALL 17 END-TO-END TESTS COMPLETED SUCCESSFULLY!');
    console.log('====================================================\n');
  } finally {
    server.close();
  }
}

if (require.main === module) {
  runTests().catch(err => {
    console.error('TEST SUITE FAILED:', err);
    process.exit(1);
  });
}

module.exports = { runTests };
