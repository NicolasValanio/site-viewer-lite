const HttpError = require('./http-error');

const projectIdPattern = /^\d{4}-\d{5}$/;

function validateProjectId(_request, _response, next, id) {
  if (!projectIdPattern.test(id)) {
    return next(new HttpError(400, 'VALIDATION_ERROR', 'Project id must use the format NNNN-NNNNN.'));
  }

  return next();
}

module.exports = validateProjectId;
