const TokenService = require('../auth/TokenService');

const tokenAuthentication = async (req, res, next) => {
  const authorization = req.headers.authorization;
  if (authorization) {
    const removePrefix = 'Bearer '.length;
    const token = authorization.substring(removePrefix);
    try {
      const user = await TokenService.verify(token);
      req.authenticatedUser = user;
    } catch (err) {
      // eslint-disable-next-line no-empty
    }
  }
  next();
};

module.exports = tokenAuthentication;
