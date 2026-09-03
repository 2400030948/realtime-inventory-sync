// Small validation helpers shared across controllers.
// Designed for MongoDB / Express + express-async-handler — failures set the
// response status code and throw an Error which the async handler converts
// to a JSON error response via middleware/errorHandler.js.

const mongoose = require('mongoose');

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

const isNonEmptyString = (v) => typeof v === 'string' && v.trim().length > 0;
const asTrimmedString = (v) => (typeof v === 'string' ? v.trim() : v);

const requireString = (name, value) => {
  if (!isNonEmptyString(value)) {
    throw new HttpError(400, `${name} is required and must be a non-empty string`);
  }
  return asTrimmedString(value);
};

const requireFiniteNumber = (name, value, { min = -Infinity, max = Infinity } = {}) => {
  // Accept numbers and numeric strings only. We deliberately *reject* null,
  // empty strings, arrays, booleans, and objects even though `Number(value)`
  // would coerce them (Number(null) → 0, Number('') → 0, etc.) — those are
  // almost always programmer bugs in client code and silently coercing them
  // to 0 hides them.
  if (typeof value === 'string') {
    if (value.trim() === '') {
      throw new HttpError(400, `${name} is required and must be a finite number`);
    }
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) {
      throw new HttpError(400, `${name} is required and must be a finite number`);
    }
    return clamp(name, parsed, min, max);
  }
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new HttpError(400, `${name} is required and must be a finite number`);
  }
  return clamp(name, value, min, max);
};

function clamp(name, n, min, max) {
  if (n < min) {
    throw new HttpError(400, `${name} must be ≥ ${min}`);
  }
  if (n > max) {
    throw new HttpError(400, `${name} must be ≤ ${max}`);
  }
  return n;
}

const requireInt = (name, value, opts = {}) => {
  const n = requireFiniteNumber(name, value, opts);
  if (!Number.isInteger(n)) {
    throw new HttpError(400, `${name} must be an integer`);
  }
  return n;
};

const requireObjectId = (name, value) => {
  if (!isNonEmptyString(value) || !mongoose.Types.ObjectId.isValid(value)) {
    throw new HttpError(400, `${name} is not a valid id`);
  }
  return value;
};

// Mongo duplicate-key error (e.g. unique index on `sku`) → 409 with a clean
// message. Anything else is rethrown.
const rethrowAsConflict = (err, friendlyMessage) => {
  if (err && err.code === 11000) {
    throw new HttpError(409, friendlyMessage);
  }
  throw err;
};

// Mongo CastError (e.g. malformed id passed to findById) → 400 with a clean
// message.
const rethrowAsBadRequest = (err, friendlyMessage) => {
  if (err && err.name === 'CastError') {
    throw new HttpError(400, friendlyMessage);
  }
  throw err;
};

module.exports = {
  HttpError,
  isNonEmptyString,
  asTrimmedString,
  requireString,
  requireFiniteNumber,
  requireInt,
  requireObjectId,
  rethrowAsConflict,
  rethrowAsBadRequest,
};