const fs = require('node:fs');
const fsPromises = require('node:fs/promises');
const { randomUUID } = require('node:crypto');
const HttpError = require('../middleware/http-error');
const projectRepository = require('../repositories/project-repository');
const { serializeProjectDetail, serializeProjectSummary } = require('../serializers/project-serializer');
const { serializeSpace } = require('../serializers/space-serializer');
const { createEtag, ifNoneMatchMatches } = require('../services/etag-service');
const { validateIssue } = require('../services/issue-service');
const projectService = require('../services/project-service');

async function getProjectOrNotFound(id, user) {
  const project = await projectService.getAuthorizedProject(id, user);

  if (!project) {
    throw new HttpError(404, 'NOT_FOUND', 'Project not found.');
  }

  return project;
}

async function listProjects(request, response) {
  const projects = await projectService.listAuthorizedProjects(request.user);
  response.json({ projects: projects.map(serializeProjectSummary) });
}

async function getProject(request, response) {
  const project = await getProjectOrNotFound(request.params.id, request.user);
  const representation = { project: serializeProjectDetail(project, request.user) };
  const etag = createEtag(representation);

  response.set({
    'Cache-Control': 'private, max-age=0, must-revalidate',
    ETag: etag,
    Vary: 'Authorization'
  });

  if (ifNoneMatchMatches(request.get('if-none-match'), etag)) {
    return response.status(304).end();
  }

  return response.json(representation);
}

async function getSpaces(request, response) {
  const project = await getProjectOrNotFound(request.params.id, request.user);
  const spaces = await projectRepository.findSpacesByProjectId(project.id);
  response.json({ spaces: spaces.map(serializeSpace) });
}

async function getCloud(request, response) {
  const project = await getProjectOrNotFound(request.params.id, request.user);
  const cloudFile = await projectRepository.findCloudByFilename(project.cloud);

  if (!cloudFile) {
    throw new HttpError(404, 'NOT_FOUND', 'Point cloud not found.');
  }

  const { size } = await fsPromises.stat(cloudFile);
  const range = parseRange(request.get('range'), size);

  if (range.error) {
    response.set({
      'Accept-Ranges': 'bytes',
      'Content-Range': `bytes */${size}`
    });
    throw new HttpError(416, 'RANGE_NOT_SATISFIABLE', 'Requested range cannot be served.');
  }

  const length = range.end - range.start + 1;
  const headers = {
    'Accept-Ranges': 'bytes',
    'Content-Length': String(length),
    'Content-Type': 'application/octet-stream'
  };

  if (range.partial) {
    headers['Content-Range'] = `bytes ${range.start}-${range.end}/${size}`;
  }

  response.status(range.partial ? 206 : 200).set(headers);
  const stream = fs.createReadStream(cloudFile, { start: range.start, end: range.end });

  stream.on('error', (error) => response.destroy(error));
  stream.pipe(response);
}

async function createIssue(request, response) {
  const project = await getProjectOrNotFound(request.params.id, request.user);
  await validateIssue(request.body, project);
  response.status(201).json({ id: randomUUID() });
}

function parseByteValue(value) {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : null;
}

function parseRange(header, size) {
  if (!header) {
    return { partial: false, start: 0, end: Math.max(0, size - 1) };
  }

  const match = /^bytes=(\d*)-(\d*)$/.exec(header);

  if (!match || size === 0 || (!match[1] && !match[2])) {
    return { error: true };
  }

  const [, startValue, endValue] = match;

  if (!startValue) {
    const suffixLength = parseByteValue(endValue);

    if (!suffixLength) {
      return { error: true };
    }

    return {
      partial: true,
      start: Math.max(0, size - suffixLength),
      end: size - 1
    };
  }

  const start = parseByteValue(startValue);
  const requestedEnd = endValue ? parseByteValue(endValue) : size - 1;

  if (start === null || requestedEnd === null || start >= size || requestedEnd < start) {
    return { error: true };
  }

  return {
    partial: true,
    start,
    end: Math.min(requestedEnd, size - 1)
  };
}

module.exports = { createIssue, getCloud, getProject, getSpaces, listProjects };
