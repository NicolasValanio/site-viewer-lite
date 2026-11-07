function errorHandler(error, _request, response, _next) {
  const status = error.status || (error.type === 'entity.parse.failed' ? 400 : 500);
  const code = error.code || (status === 400 ? 'BAD_REQUEST' : 'INTERNAL_ERROR');
  const message = status >= 500 ? 'An unexpected error occurred.' : error.message;

  response.status(status).json({ error: { code, message } });
}

module.exports = errorHandler;
