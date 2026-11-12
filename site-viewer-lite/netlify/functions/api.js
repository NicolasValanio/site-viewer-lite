const path = require('node:path');
const fs = require('node:fs');
const serverless = require('serverless-http');

const bundleRoot = process.env.LAMBDA_TASK_ROOT || path.resolve(__dirname, '../..');
const dataDirectory = [
  path.join(bundleRoot, 'data'),
  path.join(bundleRoot, 'site-viewer-lite', 'data')
].find((directory) => fs.existsSync(path.join(directory, 'projects.json')));

if (dataDirectory) process.env.SITE_VIEWER_DATA_DIRECTORY = dataDirectory;

const app = require('../../backend/app');
const handle = serverless(app, { binary: ['application/octet-stream'] });

exports.handler = (event, context) => {
  const pathname = event.path.replace(/^\/\.netlify\/functions\/api(?=\/|$)/, '');
  const apiPath = /^\/api(?:\/|$)/.test(pathname) ? pathname : `/api${pathname}`;
  return handle({ ...event, path: apiPath, rawPath: apiPath }, context);
};
