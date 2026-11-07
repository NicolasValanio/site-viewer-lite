const { createHash } = require('node:crypto');

function createEtag(representation) {
  const digest = createHash('sha256').update(JSON.stringify(representation)).digest('base64url');
  return `"${digest}"`;
}

function ifNoneMatchMatches(header, etag) {
  if (!header) {
    return false;
  }

  return header.split(',').map((value) => value.trim()).some((value) => value === '*' || value === etag);
}

module.exports = { createEtag, ifNoneMatchMatches };
