const errorHandler = (err, req, res, next) => {
  // HttpError instances carry their own status; everything else is a 500.
  const statusCode = err.status || (res.statusCode !== 200 ? res.statusCode : 500);

  // Stacks are never sent by default. They are only included if the operator
  // explicitly opts in with EXPOSE_STACKS=1 (e.g. during local debugging).
  const exposeStack =
    process.env.NODE_ENV !== 'production' && process.env.EXPOSE_STACKS === '1';

  const body = { message: err.message || 'Server error' };
  if (exposeStack && err.stack) body.stack = err.stack;

  if (statusCode >= 500) {
    // eslint-disable-next-line no-console
    console.error('[errorHandler]', statusCode, err.message);
  }

  res.status(statusCode).json(body);
};

module.exports = errorHandler;
