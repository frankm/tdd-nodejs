const express = require('express');
const router = express.Router();
const UserService = require('./UserService');
const { check, validationResult } = require('express-validator');
const pagination = require('../middleware/pagination');
const basicAuthentication = require('../middleware/basicAuthentication');

const usersUrl = '/api/1.0/users';
const tokenUrl = usersUrl + '/token/';

router.post(
  usersUrl,
  check('username')
    .notEmpty()
    .withMessage('username_null')
    .bail()
    .isLength({ min: 4, max: 32 })
    .withMessage('username_size'),
  check('email')
    .notEmpty()
    .withMessage('email_null')
    .bail()
    .isEmail()
    .withMessage('email_invalid')
    .bail()
    .custom(async (email) => UserService.mustHaveUniqueEmail(email)),
  check('password')
    .notEmpty()
    .withMessage('password_null')
    .bail()
    .isLength({ min: 6 })
    .withMessage('password_size')
    .bail()
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).*$/)
    .withMessage('password_pattern'),
  async (req, res, next) => {
    try {
      await UserService.mustHaveNoErrors(validationResult(req));
      await UserService.save(req.body);
      res.send({ message: req.t('user_create_success') });
    } catch (err) {
      return next(err);
    }
  }
);

router.post(tokenUrl + ':token', async (req, res, next) => {
  const token = req.params.token;
  try {
    await UserService.activate(token);
    return res.send({ message: req.t('account_activation_success') });
  } catch (err) {
    next(err);
  }
});

router.get(usersUrl, pagination, basicAuthentication, async (req, res) => {
  const authenticatedUser = req.authenticatedUser;
  const { page, size } = req.pagination;
  const users = await UserService.getUsers(page, size, authenticatedUser);
  res.send(users);
});

router.get(usersUrl + '/:id', async (req, res, next) => {
  try {
    const user = await UserService.getUser(req.params.id);
    res.send(user);
  } catch (err) {
    next(err);
  }
});

router.put(usersUrl + '/:id', basicAuthentication, async (req, res, next) => {
  try {
    await UserService.mustHaveAuthenticatedForURLId(req.authenticatedUser, req.params.id);
    await UserService.updateUser(req.params.id, req.body);
    return res.send();
  } catch (err) {
    next(err);
  }
});

module.exports = router;
