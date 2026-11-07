const { readJson } = require('./json-repository');

async function findByToken(token) {
  const users = await readJson('users.json');
  return users.find((user) => user.token === token) || null;
}

module.exports = { findByToken };
