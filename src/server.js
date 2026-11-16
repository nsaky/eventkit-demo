'use strict';

const express = require('express');
const path = require('path');
const { getEventKit, STORAGE_PATH } = require('./eventkit');
const { errorHandler } = require('./utils/error-handler');

const eventsRouter = require('./routes/events');
const attendeesRouter = require('./routes/attendees');
const ticketsRouter = require('./routes/tickets');
const analyticsRouter = require('./routes/analytics');
const searchRouter = require('./routes/search');
const exportsRouter = require('./routes/exports');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static frontend files
app.use(express.static(path.join(__dirname, '../public')));

// Health check endpoint
app.get('/api/health', async (req, res) => {
  try {
    const kit = await getEventKit();
    const pkg = require('@nsaky/eventkit/package.json');

    res.json({
      success: true,
      status: 'healthy',
      package: {
        name: pkg.name,
        version: pkg.version
      },
      storage: {
        path: STORAGE_PATH,
        type: 'persistent-json'
      },
      uptime: process.uptime()
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      status: 'unhealthy',
      error: err.message
    });
  }
});

// API Routes
app.use('/api/events', eventsRouter);
app.use('/api/attendees', attendeesRouter);
app.use('/api/tickets', ticketsRouter);
app.use('/api/analytics', analyticsRouter);
app.use('/api/search', searchRouter);
app.use('/api/export', exportsRouter);

// Fallback for HTML5 client-side navigation (serve index.html)
app.use((req, res, next) => {
  if (req.method === 'GET' && !req.path.startsWith('/api')) {
    return res.sendFile(path.join(__dirname, '../public/index.html'));
  }
  next();
});

// Global Error Handler
app.use(errorHandler);

// Start server
async function startServer() {
  try {
    console.log('Initializing EventKit with persistent storage at:', STORAGE_PATH);
    await getEventKit();
    console.log('EventKit successfully initialized.');

    const server = app.listen(PORT, '0.0.0.0', () => {
      console.log(`EventKit Demo server is running on port ${PORT}`);
    });

    return server;
  } catch (err) {
    console.error('Failed to start EventKit Demo server:', err);
    process.exit(1);
  }
}

if (require.main === module) {
  startServer();
}

module.exports = { app, startServer };
