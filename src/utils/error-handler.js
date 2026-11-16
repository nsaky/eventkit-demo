'use strict';

const EventKit = require('@nsaky/eventkit');
const {
  EventNotFoundError,
  AttendeeNotFoundError,
  TicketNotFoundError,
  InvalidEventDataError,
  InvalidAttendeeDataError,
  InvalidEmailError,
  DuplicateRegistrationError,
  EventCapacityReachedError,
  InvalidEventIdError,
  InvalidTicketIdError,
  TicketAlreadyExistsError,
  TicketAlreadyUsedError,
  TicketCancelledError,
  WrongEventError,
  AlreadyCheckedInError,
  InvalidQRFormatError,
  UnsupportedExportFormatError,
  FileAlreadyExistsError,
  StorageCorruptedError,
  StorageError,
  NotInitializedError
} = EventKit.errors;

function getStatusCode(err) {
  if (
    err instanceof EventNotFoundError ||
    err instanceof AttendeeNotFoundError ||
    err instanceof TicketNotFoundError
  ) {
    return 404;
  }

  if (
    err instanceof DuplicateRegistrationError ||
    err instanceof EventCapacityReachedError ||
    err instanceof TicketAlreadyExistsError ||
    err instanceof TicketAlreadyUsedError ||
    err instanceof AlreadyCheckedInError ||
    err instanceof TicketCancelledError ||
    err instanceof FileAlreadyExistsError
  ) {
    return 409;
  }

  if (
    err instanceof InvalidEventDataError ||
    err instanceof InvalidAttendeeDataError ||
    err instanceof InvalidEmailError ||
    err instanceof InvalidEventIdError ||
    err instanceof InvalidTicketIdError ||
    err instanceof WrongEventError ||
    err instanceof InvalidQRFormatError ||
    err instanceof UnsupportedExportFormatError
  ) {
    return 400;
  }

  if (err instanceof StorageCorruptedError || err instanceof StorageError || err instanceof NotInitializedError) {
    return 500;
  }

  return 500;
}

function errorHandler(err, req, res, next) {
  const status = getStatusCode(err);

  // Avoid exposing raw stack traces to the client, but log in backend
  console.error(`[API Error] ${err.name || 'Error'} (${status}): ${err.message}`);

  res.status(status).json({
    success: false,
    message: err.message || 'An unexpected error occurred.',
    error: {
      code: err.code || 'INTERNAL_ERROR',
      name: err.name || 'Error',
      context: err.context || null
    }
  });
}

module.exports = {
  errorHandler,
  getStatusCode
};
