# EventKit Demo — Demonstration Application

A practical, full-stack demonstration application for the **[@nsaky/eventkit](https://www.npmjs.com/package/@nsaky/eventkit)** npm package.

This application showcases the real-world usage, capabilities, reliability, and functionality of EventKit as an event-management and digital ticketing engine with zero external database dependencies.

[![npm version](https://img.shields.io/npm/v/@nsaky/eventkit.svg)](https://www.npmjs.com/package/@nsaky/eventkit)
[![GitHub repository](https://img.shields.io/badge/GitHub-nsaky%2Feventkit--demo-blue.svg)](https://github.com/nsaky/eventkit-demo)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

---

## 1. Project Overview

**EventKit** is a lightweight, zero-database Node.js toolkit for event registration, digital ticket management, QR code generation, ticket validation, attendee arrival check-in, attendance analytics, roster search, and data export.

This demonstration application implements a modern web interface on top of `@nsaky/eventkit`. It uses the published package as its backend domain engine, demonstrating how easily EventKit can be integrated into production Node.js and Express services.

### Key Capabilities Demonstrated
- **Persistent Event Lifecycle**: Create, view, update, and cascade-delete events with capacity limits.
- **Attendee Registration**: Normalizes email addresses, prevents duplicate registrations per event, and enforces capacity ceilings.
- **Cryptographic Digital Tickets**: Automatically generates unique `EK-<10-HEX>` identifiers for every registration.
- **Scannable QR Codes**: Renders high-resolution QR codes in both **PNG** (binary image) and **SVG** (vector XML) encoding non-PII ticket references (`{ ticketId, eventId }`).
- **Non-Destructive Validation**: Inspects ticket validity, cancellation status, wrong-event mismatch, and prior check-in without mutating records.
- **Gate Check-in Admission**: Admits attendees at the gate, transitions ticket status to `USED`, marks attendance, records arrival timestamps, and prevents duplicate check-ins.
- **Ticket Cancellation**: Cancels tickets and enforces cancellation barriers across validation and check-in workflows.
- **Real-time Analytics**: Calculates attendance percentages, headcounts (registered, checked in, pending), and capacity fill ratios.
- **Participant Search**: Searches attendees by name, email, or ticket ID, with check-in state filtering.
- **Data Export**: Generates RFC 4180 compliant CSV participant rosters and full JSON event snapshots.
- **Persistent JSON Storage**: Demonstrates crash-resilient persistence across server restarts using atomic temporary file renaming and process-level mutex locks.

---

## 2. Technology Stack

- **Backend**: Node.js, Express.js (CommonJS)
- **Engine**: `@nsaky/eventkit` (installed from npm)
- **Frontend**: Vanilla JavaScript (ES6+), HTML5, CSS3 (zero frontend framework overhead)
- **Storage**: EventKit's built-in atomic JSON persistence (`data/eventkit/`)
- **QR Codes**: Native EventKit QR generator (`PNG` & `SVG`)

---

## 3. Architecture & Project Structure

```text
eventkit-demo/
│
├── public/                     # Static frontend client
│   ├── index.html              # Single-page dashboard application
│   ├── css/
│   │   └── styles.css          # Professional navy/blue UI styling
│   └── js/
│       └── app.js              # Client-side state, API calls, and modals
│
├── src/                        # Backend Express application
│   ├── server.js               # Express application entry point & routes
│   ├── eventkit.js             # EventKit initialization & storage config
│   ├── routes/
│   │   ├── events.js           # Event CRUD endpoints
│   │   ├── attendees.js        # Attendee registration & directory endpoints
│   │   ├── tickets.js          # Ticket inspection, validation, QR, & cancellation
│   │   ├── analytics.js        # Global & per-event statistics endpoints
│   │   ├── search.js           # Attendee, ticket, and event search endpoints
│   │   └── exports.js          # CSV and JSON export endpoints
│   └── utils/
│       └── error-handler.js    # EventKit error mapping & HTTP status handler
│
├── test/                       # Automated test suites
│   ├── test-e2e.js             # 17-step end-to-end API test suite
│   └── test-persistence.js     # Server restart persistence test
│
├── data/
│   └── eventkit/               # Persistent JSON files (events.json, attendees.json, tickets.json)
│
├── .gitignore                  # Git exclusions (preserves data and reference docs)
├── package.json
├── package-lock.json
└── DEMO_README.md              # Demonstration documentation
```

---

## 4. Prerequisites

- **Node.js**: `v20.0.0` or higher (`v22+` recommended)
- **npm**: `v10.0.0` or higher

---

## 5. Installation & Setup

1. **Clone the repository**:
   ```bash
   git clone https://github.com/nsaky/eventkit-demo.git
   cd eventkit-demo
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Start the application**:
   ```bash
   npm start
   ```

4. **Access the application**:
   Open your browser and navigate to:
   ```text
   http://localhost:3000
   ```

---

## 5.1 Deploying to Render

This application includes a ready-to-use `render.yaml` configuration.

### Option A: Blueprints (Recommended)
1. Push your repository to GitHub.
2. Log in to [Render Dashboard](https://dashboard.render.com).
3. Click **New +** &rarr; **Blueprint**.
4. Select `nsaky/eventkit-demo`.
5. Render will automatically detect `render.yaml`, configure Node.js 22, run `npm install`, and launch the service via `npm start`.

### Option B: Manual Web Service
1. On Render, click **New +** &rarr; **Web Service**.
2. Connect your GitHub repository.
3. Configure the following settings:
   - **Environment**: `Node`
   - **Node Version**: `22.12.0` (set environment variable `NODE_VERSION: 22.12.0`)
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Plan**: `Free` (or `Starter` with an attached Persistent Disk at `/var/data` and `EVENTKIT_STORAGE_PATH=/var/data/eventkit`)
4. Click **Deploy Web Service**. Render will assign an HTTPS URL (e.g., `https://eventkit-demo.onrender.com`).

---

## 6. How to Use the Application

### 1. Overview Dashboard
- View aggregate metrics: Total Events, Total Attendees, Total Tickets, Checked In, Active Tickets, and Overall Attendance Rate.
- Quick action buttons to create events, register attendees, validate tickets, and open the gate.
- Real-time recent activity feeds showing latest registrations and admissions.

### 2. Event Management (`/events`)
- Click **Create Event** to configure an event with a name, date, venue location, description, and optional capacity limit.
- Click **View** on any event to see registered attendees, attendance rate, and capacity utilization.
- Click **Edit** to update event details.
- Click **Delete** to trigger a cascading deletion of the event and its associated attendees and tickets.

### 3. Attendee Registration (`/attendees`)
- Click **Register Attendee** and choose an event.
- Enter participant name, email, and phone number.
- When submitted, EventKit automatically validates inputs, normalizes email to lowercase, checks for duplicates, verifies capacity, and issues a linked `EK-` digital ticket.
- Use the search bar to filter attendees by name, email, or ticket ID in real time.

### 4. Digital Tickets & QR Codes (`/tickets`)
- View all issued tickets with their current lifecycle status (`ACTIVE`, `USED`, `CANCELLED`).
- Click **Inspect & QR** on any ticket to:
  - View ticket metadata and linked participant.
  - Preview the generated QR code in **PNG** or **SVG** format.
  - Download the QR code file directly to your computer.
  - Cancel the ticket with organizers' confirmation.

### 5. Gate Check-in (`/checkin`)
- Select the event from the dropdown.
- Enter or paste the Ticket ID (or click any ticket from the "Active Tickets" quick-pick list).
- Click **Check In Attendee**:
  - EventKit atomically marks the ticket status as `USED`.
  - Marks the attendee as admitted with an arrival timestamp.
  - Prevents duplicate check-in if the same ticket is submitted again.

### 6. Non-Destructive Validation (`/validation`)
- Test a ticket against an event without admitting the attendee or altering records.
- Returns explicit outcomes:
  - `VALID`: Ticket is authentic, active, and belongs to the event.
  - `INVALID`: Ticket ID does not exist.
  - `WRONG_EVENT`: Ticket was issued for a different event.
  - `ALREADY_CHECKED_IN`: Attendee was already admitted at the gate.
  - `CANCELLED`: Ticket was cancelled by an organizer.

### 7. Attendance Analytics (`/analytics`)
- Select any event to view calculated headcounts, attendance percentage, and capacity fill progress bars.
- Inspect comparative performance across all hosted events.

### 8. Data Export (`/export`)
- **Export Participant Roster**: Select an event and download an RFC 4180 compliant CSV spreadsheet or JSON array.
- **Export Event Snapshot**: Export full event metadata, participant records, and summary statistics.
- View live syntax-highlighted previews directly in the browser before downloading.

---

## 7. EventKit Integration Details

The application directly imports and executes `@nsaky/eventkit` methods:

| Feature | EventKit Method | Backend Endpoint |
|---|---|---|
| Initialization | `EventKit.initialize({ storagePath })` | Startup (`src/server.js`) |
| Create Event | `EventKit.createEvent(data)` | `POST /api/events` |
| List Events | `EventKit.getAllEvents()` | `GET /api/events` |
| Get Event | `EventKit.getEvent(eventId)` | `GET /api/events/:id` |
| Update Event | `EventKit.updateEvent(eventId, updates)` | `PUT /api/events/:id` |
| Delete Event | `EventKit.deleteEvent(eventId)` | `DELETE /api/events/:id` |
| Register Attendee | `EventKit.registerAttendee(eventId, data)` | `POST /api/attendees` |
| Get Attendee | `EventKit.getAttendee(attendeeId)` | `GET /api/attendees/:id` |
| Get Event Attendees | `EventKit.getAttendees(eventId)` | `GET /api/events/:id/attendees` |
| Remove Attendee | `EventKit.removeAttendee(attendeeId)` | `DELETE /api/attendees/:id` |
| Issue Ticket | `EventKit.generateTicket(attendeeId, options)` | `POST /api/tickets/generate` |
| Get Ticket | `EventKit.getTicket(ticketId)` | `GET /api/tickets/:id` |
| List All Tickets | `EventKit.getAllTickets()` | `GET /api/tickets` |
| List Event Tickets | `EventKit.getTickets(eventId)` | `GET /api/tickets?eventId=...` |
| Validate Ticket | `EventKit.validateTicket(eventId, ticketId)` | `POST /api/tickets/validate` |
| Check-in Attendee | `EventKit.checkIn(eventId, ticketId)` | `POST /api/tickets/check-in` |
| Check-in Status | `EventKit.getCheckInStatus(ticketId)` | `GET /api/tickets/:id/check-in-status` |
| Admitted Attendees | `EventKit.getCheckedInAttendees(eventId)` | `GET /api/events/:id/checked-in` |
| Cancel Ticket | `EventKit.cancelTicket(ticketId)` | `POST /api/tickets/:id/cancel` |
| Generate QR Code | `EventKit.generateQRCode(ticketId, options)` | `GET /api/tickets/:id/qr` |
| Attendance Stats | `EventKit.getAttendanceStats(eventId)` | `GET /api/analytics/events/:id` |
| Search Attendees | `EventKit.searchAttendees(eventId, query, options)` | `GET /api/search/attendees` |
| Search Ticket | `EventKit.searchTicket(ticketId)` | `GET /api/search/tickets/:id` |
| Export Attendees | `EventKit.exportAttendees(eventId, format)` | `GET /api/export/attendees` |
| Export Event Snapshot | `EventKit.exportEvent(eventId, format)` | `GET /api/export/event` |

---

## 8. Running Automated Tests

Run the complete test suite including persistence verification and all 17 end-to-end API tests:

```bash
npm test
```

### Test Coverage Summary:
- Server startup and health check verification
- Event creation and metadata retrieval
- Event updates and capacity configuration
- Attendee registration with automatic ticket issuing
- Duplicate registration rejection (`DUPLICATE_REGISTRATION` -> 409)
- Event capacity enforcement (`EVENT_CAPACITY_REACHED` -> 409)
- QR code generation in PNG buffer and SVG vector formats
- Non-destructive ticket validation (`VALID`, `INVALID`, `WRONG_EVENT`)
- Gate check-in execution and state transition to `USED`
- Duplicate check-in rejection (`ALREADY_CHECKED_IN` -> 409)
- Ticket cancellation and rejection of cancelled tickets at check-in
- Roster search by attendee name, email, and ticket identifier
- Attendance percentage and headcount analytics
- RFC 4180 CSV export and full JSON snapshot export
- Persistent JSON storage verification across process restarts
- Cascading deletion of events and associated records

---

## 9. Links & Reference

- **EventKit on npm**: [https://www.npmjs.com/package/@nsaky/eventkit](https://www.npmjs.com/package/@nsaky/eventkit)
- **EventKit Source Repository**: [https://github.com/nsaky/eventkit.git](https://github.com/nsaky/eventkit.git)
- **Demonstration Repository**: [https://github.com/nsaky/eventkit-demo.git](https://github.com/nsaky/eventkit-demo.git)

---

## 10. License

This demonstration application is open-source software licensed under the [MIT License](LICENSE).
