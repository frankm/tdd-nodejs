const express = require('express');
const router = express.Router();
const UserService = require('./UserService');
const { check, validationResult } = require('express-validator');
const pagination = require('../middleware/pagination');

const usersUrl = '/api/1.0/users';
const tokenUrl = usersUrl + '/token/';
const passwordResetUrl = '/api/1.0/user/password';

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

router.get(usersUrl, pagination, async (req, res) => {
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

router.put(
  usersUrl + '/:id',
  check('username')
    .notEmpty()
    .withMessage('username_null')
    .bail()
    .isLength({ min: 4, max: 32 })
    .withMessage('username_size'),
  check('image').custom((imageAsBase64String) => {
    UserService.mustNotExceedSizeLimit(imageAsBase64String, 2 * 1024 * 1024);
    return true;
  }),
  async (req, res, next) => {
    try {
      await UserService.mustAuthenticateToUpdateById(req.authenticatedUser, req.params.id);
      await UserService.mustHaveNoErrors(validationResult(req));
      const user = await UserService.updateUser(req.params.id, req.body);
      return res.send(user);
    } catch (err) {
      next(err);
    }
  }
);

router.delete(usersUrl + '/:id', async (req, res, next) => {
  try {
    await UserService.mustAuthenticateToDeleteById(req.authenticatedUser, req.params.id);
    await UserService.deleteUser(req.params.id);
    res.send();
  } catch (err) {
    next(err);
  }
});

router.post(passwordResetUrl, check('email').isEmail().withMessage('email_invalid'), async (req, res, next) => {
  try {
    await UserService.mustHaveNoErrors(validationResult(req));
    await UserService.passwordResetRequest(req.body.email);
    return res.send({ message: req.t('password_reset_request_success') });
  } catch (err) {
    next(err);
  }
});

const passwordResetTokenValidator = async (req, res, next) => {
  try {
    await UserService.mustAuthenticateResetToken(req.body.passwordResetToken);
    next();
  } catch (err) {
    next(err);
  }
};

router.put(
  passwordResetUrl,
  passwordResetTokenValidator,
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
      await UserService.updatePassword(req.body);
      return res.send();
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
