const express = require('express');
const router = express.Router();
const UserService = require('../user/UserService');
const AuthenticationService = require('../auth/AuthenticationService');
const { check, validationResult } = require('express-validator');
const TokenService = require('../auth/TokenService');

const authUrl = '/api/1.0/auth';
const logoutUrl = '/api/1.0/logout';

router.post(authUrl, check('email').isEmail(), async (req, res, next) => {
  const errors = validationResult(req);

  try {
    await AuthenticationService.mustHaveNoErrors(errors);
    const { email, password } = req.body;
    const user = await UserService.findByEmail(email);
    await AuthenticationService.mustHaveAuthenticatedActiveUser(user, password);
    const token = await TokenService.createToken(user);
    res.send({
      id: user.id,
      username: user.username,
      token,
    });
  } catch (err) {
    next(err);
  }
});

router.post(logoutUrl, async (req, res) => {
  const authorization = req.headers.authorization;
  if (authorization) {
    const removePrefix = 'Bearer '.length;
    const token = authorization.substring(removePrefix);
    await TokenService.deleteToken(token);
  }
  res.send();
});

module.exports = router;
