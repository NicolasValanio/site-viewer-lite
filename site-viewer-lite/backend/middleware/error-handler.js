function errorHandler(error, _request, response, next) {
  if (response.headersSent) {
    return next(error);
  }

  if (error.type === 'entity.parse.failed') {
    return response.status(400).json({
      error: { code: 'INVALID_JSON', message: 'Request body must contain valid JSON.' }
    });
  }

  if (error.type === 'entity.too.large') {
    return response.status(413).json({
      error: { code: 'PAYLOAD_TOO_LARGE', message: 'Request body is too large.' }
    });
  }

  const status = Number.isInteger(error.status) && error.status >= 400 && error.status < 600 ? error.status : 500;
  const code = error.code || (status === 400 ? 'BAD_REQUEST' : 'INTERNAL_ERROR');
  const message = status >= 500 ? 'An unexpected error occurred.' : error.message;

  return response.status(status).json({ error: { code, message } });
}

module.exports = errorHandler;
