const AuthenticationException = require('./AuthenticationException');
const ForbiddenException = require('../error/ForbiddenException');
const bcrypt = require('bcrypt');

const mustHaveNoErrors = async (errors) => {
  if (!errors.isEmpty()) {
    throw new AuthenticationException();
  }
};

const mustAuthenticateActiveUser = async (user, password) => {
  if (!user) {
    throw new AuthenticationException();
  }

  const match = await bcrypt.compare(password, user.password);
  if (!match) {
    throw new AuthenticationException();
  }

  if (!user.active) {
    throw new ForbiddenException();
  }
};

module.exports = { mustHaveNoErrors, mustAuthenticateActiveUser };
