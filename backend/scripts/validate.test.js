'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const {
  HttpError,
  isNonEmptyString,
  asTrimmedString,
  requireString,
  requireFiniteNumber,
  requireInt,
  requireObjectId,
  rethrowAsConflict,
  rethrowAsBadRequest,
} = require('../middleware/validate');

test('isNonEmptyString', () => {
  assert.equal(isNonEmptyString('hi'), true);
  assert.equal(isNonEmptyString('   '), false);
  assert.equal(isNonEmptyString(''), false);
  assert.equal(isNonEmptyString(0), false);
  assert.equal(isNonEmptyString(null), false);
  assert.equal(isNonEmptyString(undefined), false);
});

test('asTrimmedString trims a string', () => {
  assert.equal(asTrimmedString('  hi  '), 'hi');
  // Non-strings are returned untouched so the validator can throw a 400.
  assert.equal(asTrimmedString(123), 123);
});

test('requireString throws HttpError(400) on bad input', () => {
  for (const bad of [undefined, null, '', '   ', 0, 123, {}, []]) {
    assert.throws(
      () => requireString('foo', bad),
      (err) => err instanceof HttpError && err.status === 400
    );
  }
});

test('requireString trims a valid string', () => {
  assert.equal(requireString('foo', '  hello  '), 'hello');
});

test('requireFiniteNumber accepts numeric strings and numbers', () => {
  assert.equal(requireFiniteNumber('x', 5), 5);
  assert.equal(requireFiniteNumber('x', '5'), 5);
  assert.equal(requireFiniteNumber('x', -3), -3);
  assert.equal(requireFiniteNumber('x', 0), 0);
});

test('requireFiniteNumber rejects NaN, Infinity, and non-numeric strings', () => {
  for (const bad of [NaN, Infinity, -Infinity, 'abc', '', null, undefined, {}, []]) {
    assert.throws(
      () => requireFiniteNumber('x', bad),
      (err) => err instanceof HttpError && err.status === 400
    );
  }
});

test('requireFiniteNumber enforces min / max', () => {
  assert.throws(
    () => requireFiniteNumber('q', -1, { min: 0 }),
    (err) => err.status === 400
  );
  assert.throws(
    () => requireFiniteNumber('q', 101, { max: 100 }),
    (err) => err.status === 400
  );
  assert.equal(requireFiniteNumber('q', 0, { min: 0 }), 0);
  assert.equal(requireFiniteNumber('q', 100, { max: 100 }), 100);
});

test('requireInt rejects non-integers', () => {
  assert.throws(
    () => requireInt('q', 1.5),
    (err) => err.status === 400
  );
  assert.equal(requireInt('q', 3), 3);
});

test('requireObjectId rejects malformed ids', () => {
  assert.throws(
    () => requireObjectId('id', 'not-an-id'),
    (err) => err.status === 400
  );
  // 24-char hex is a valid ObjectId.
  assert.equal(requireObjectId('id', '507f1f77bcf86cd799439011'), '507f1f77bcf86cd799439011');
});

test('rethrowAsConflict translates E11000 → 409', () => {
  const dup = Object.assign(new Error('dup'), { code: 11000 });
  assert.throws(
    () => rethrowAsConflict(dup, 'dup!'),
    (err) => err.status === 409 && err.message === 'dup!'
  );
});

test('rethrowAsConflict rethrows unknown errors', () => {
  const other = new Error('boom');
  assert.throws(() => rethrowAsConflict(other, 'dup!'), /boom/);
});

test('rethrowAsBadRequest translates CastError → 400', () => {
  const cast = Object.assign(new Error('bad cast'), { name: 'CastError' });
  assert.throws(
    () => rethrowAsBadRequest(cast, 'bad id'),
    (err) => err.status === 400 && err.message === 'bad id'
  );
});

test('rethrowAsBadRequest rethrows unknown errors', () => {
  const other = new Error('boom');
  assert.throws(() => rethrowAsBadRequest(other, 'x'), /boom/);
});