const fs = require('node:fs');
const { randomUUID } = require('node:crypto');
const HttpError = require('../middleware/http-error');
const projectRepository = require('../repositories/project-repository');
const { serializeProjectDetail, serializeProjectSummary } = require('../serializers/project-serializer');
const { serializeSpace } = require('../serializers/space-serializer');
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
  response.json({ project: serializeProjectDetail(project, request.user) });
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

  response.type('application/octet-stream');
  fs.createReadStream(cloudFile).on('error', (error) => response.destroy(error)).pipe(response);
}

async function createIssue(request, response) {
  await getProjectOrNotFound(request.params.id, request.user);
  response.status(201).json({ id: randomUUID() });
}

module.exports = { createIssue, getCloud, getProject, getSpaces, listProjects };
