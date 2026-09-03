'use strict';

// Mongoose stub. The real controllers use only:
//   mongoose.startSession() — returns a session whose withTransaction(fn)
//     executes `fn` and accepts the { session } option passed to model
//     methods. Our model stubs already accept and ignore { session }.
//
//   mongoose.Types.ObjectId.isValid(s) — used by the validate util.
//
// Anything else the controllers reach for is just a no-op passthrough so we
// don't crash on import.

const realMongoose = require('mongoose');

const Types = {
  ObjectId: {
    isValid(v) {
      return realMongoose.Types.ObjectId.isValid(v);
    },
  },
};

function startSession() {
  const session = {};
  session.id = 'stub-session';
  session.endSession = async () => undefined;
  session.withTransaction = async (fn) => {
    // Mimic real mongoose behavior: run the transaction body. If it throws,
    // re-throw — the controller re-throws the inner error.
    return fn();
  };
  return session;
}

module.exports = {
  startSession,
  Types,
  // No-op exports that callers might import but not use during tests.
  connect: async () => undefined,
  disconnect: async () => undefined,
  Schema: function () {},
  model: () => ({}),
  connection: { on: () => {}, close: async () => undefined },
};