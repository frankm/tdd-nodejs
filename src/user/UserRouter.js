const express = require('express');
const UserService = require('./UserService');
const router = express.Router();
const { check, validationResult } = require('express-validator');

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
    .custom(async (email) => UserService.checkEmailIsUnique(email)),
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
      await UserService.checkNoErrors(validationResult(req));
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

router.get(usersUrl, async (req, res) => {
  let page = req.query.page ? Number.parseInt(req.query.page) : 0;
  if (page < 0) {
    page = 0;
  }
  res.send(await UserService.getUsers(page));
});

module.exports = router;
