const HttpError = require('../middleware/http-error');
const projectRepository = require('../repositories/project-repository');

const allowedFields = new Set(['title', 'level', 'spaceId']);

function validationError(message) {
  return new HttpError(400, 'VALIDATION_ERROR', message);
}

async function validateIssue(body, project) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw validationError('Issue body must be a JSON object.');
  }

  const unknownField = Object.keys(body).find((field) => !allowedFields.has(field));

  if (unknownField) {
    throw validationError(`Unexpected issue field: ${unknownField}.`);
  }

  if (typeof body.title !== 'string' || body.title.trim().length < 1 || body.title.trim().length > 120) {
    throw validationError('Issue title must contain between 1 and 120 characters.');
  }

  if (typeof body.level !== 'string' || !project.levels.includes(body.level)) {
    throw validationError('Issue level must exist in the project.');
  }

  if (Object.hasOwn(body, 'spaceId')) {
    if (typeof body.spaceId !== 'string') {
      throw validationError('Issue spaceId must be a string.');
    }

    const spaces = await projectRepository.findSpacesByProjectId(project.id);

    if (!spaces.some((space) => space.id === body.spaceId)) {
      throw validationError('Issue spaceId must belong to the project.');
    }
  }
}

module.exports = { validateIssue };
