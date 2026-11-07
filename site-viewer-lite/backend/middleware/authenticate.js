const userRepository = require('../repositories/user-repository');

async function authenticate(request, response, next) {
  const authorization = request.get('authorization');
  const match = /^Bearer\s+(.+)$/.exec(authorization || '');

  if (!match) {
    return response.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Authentication required.' } });
  }

  try {
    const user = await userRepository.findByToken(match[1]);

    if (!user) {
      return response.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Authentication required.' } });
    }

    request.user = user;
    return next();
  } catch (error) {
    return next(error);
  }
}

module.exports = authenticate;
