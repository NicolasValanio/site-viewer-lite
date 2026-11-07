const fs = require('node:fs/promises');
const { cloudPath, readJson } = require('./json-repository');

async function list() {
  return readJson('projects.json');
}

async function findById(id) {
  const projects = await list();
  return projects.find((project) => project.id === id) || null;
}

async function findSpacesByProjectId(id) {
  return readJson('spaces', `${id}.json`);
}

async function findCloudByFilename(filename) {
  const filePath = cloudPath(filename);

  if (!filePath) {
    return null;
  }

  try {
    await fs.access(filePath);
    return filePath;
  } catch {
    return null;
  }
}

module.exports = { findById, findCloudByFilename, findSpacesByProjectId, list };
