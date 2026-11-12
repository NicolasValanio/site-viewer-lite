const fs = require('node:fs/promises');
const path = require('node:path');

const dataDirectory = process.env.SITE_VIEWER_DATA_DIRECTORY || path.resolve(__dirname, '../../data');

async function readJson(...segments) {
  const filePath = path.resolve(dataDirectory, ...segments);
  const expectedPrefix = `${dataDirectory}${path.sep}`;

  if (!filePath.startsWith(expectedPrefix)) {
    throw new Error('Attempted to read outside the data directory.');
  }

  return JSON.parse(await fs.readFile(filePath, 'utf8'));
}

function cloudPath(filename) {
  if (!filename) {
    return null;
  }

  const cloudDirectory = path.resolve(dataDirectory, 'clouds');
  const filePath = path.resolve(cloudDirectory, filename);

  return filePath.startsWith(`${cloudDirectory}${path.sep}`) ? filePath : null;
}

module.exports = { cloudPath, readJson };
