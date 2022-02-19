const User = require('./User');
const bcrypt = require('bcrypt');
const saltRounds = 10;
const EmailService = require('../email/EmailService');
const Sequelize = require('sequelize');
const sequelize = require('../config/db');
const EmailException = require('../email/EmailException');
const InvalidTokenException = require('./InvalidTokenException');
const ValidationException = require('../error/ValidationException');
const NotFoundException = require('../error/NotFoundException');
const ForbiddenException = require('../error/ForbiddenException');
const { randomString } = require('../shared/generator');
const TokenService = require('../auth/TokenService');

const save = async (body) => {
  const { username, email, password } = body;
  const hash = await bcrypt.hash(password, saltRounds);
  const user = { username, email, password: hash, activationToken: randomString(16) };
  const transaction = await sequelize.transaction();
  await User.create(user, { transaction });
  try {
    await EmailService.sendAccountActivation(email, user.activationToken);
    await transaction.commit();
  } catch (err) {
    await transaction.rollback();
    throw new EmailException();
  }
};

const findByEmail = async (email) => {
  return await User.findOne({ where: { email: email } });
};

const findByPasswordResetToken = async (token) => {
  return await User.findOne({ where: { passwordResetToken: token } });
};

const mustHaveUniqueEmail = async (email) => {
  const user = await findByEmail(email);
  if (user) {
    throw new Error('email_notUnique');
  }
};

const mustHaveNoErrors = async (errors) => {
  if (!errors.isEmpty()) {
    throw new ValidationException(errors.array());
  }
};

const activate = async (token) => {
  const user = await User.findOne({ where: { activationToken: token } });
  if (!user) {
    throw new InvalidTokenException();
  }
  user.active = true;
  user.activationToken = null;
  await user.save();
};

const getUsers = async (pageIndex, size, authenticatedUser) => {
  const usersWithCount = await User.findAndCountAll({
    where: {
      active: true,
      id: {
        [Sequelize.Op.not]: authenticatedUser ? authenticatedUser.id : 0,
      },
    },
    attributes: ['id', 'username', 'email'],
    limit: size,
    offset: pageIndex * size,
  });
  return {
    content: usersWithCount.rows,
    page: pageIndex,
    size,
    totalPages: Math.ceil(usersWithCount.count / size),
  };
};

const getUser = async (id) => {
  const user = await User.findOne({
    where: {
      id: id,
      active: true,
    },
    attributes: ['id', 'username', 'email'],
  });
  if (!user) {
    throw new NotFoundException('user_not_found');
  }
  return user;
};

const updateUser = async (id, updatedBody) => {
  const user = await User.findOne({ where: { id: id } });
  user.username = updatedBody.username;
  user.image = updatedBody.image;
  await user.save();
};

const deleteUser = async (id) => {
  await User.destroy({ where: { id: id } });
};

const mustAuthenticateToUpdateById = async (authenticatedUser, id) => {
  // eslint-disable-next-line eqeqeq
  if (!authenticatedUser || authenticatedUser.id != id) {
    throw new ForbiddenException('unauthorized_user_update');
  }
};
const mustAuthenticateToDeleteById = async (authenticatedUser, id) => {
  // eslint-disable-next-line eqeqeq
  if (!authenticatedUser || authenticatedUser.id != id) {
    throw new ForbiddenException('unauthorized_user_delete');
  }
};

const passwordResetRequest = async (email) => {
  const user = await findByEmail(email);
  if (!user) {
    throw new NotFoundException('email_not_inuse');
  }
  user.passwordResetToken = randomString(16);
  await user.save();
  try {
    await EmailService.sendPasswordReset(email, user.passwordResetToken);
  } catch (err) {
    throw new EmailException();
  }
};

const mustAuthenticateResetToken = async (token) => {
  const user = await findByPasswordResetToken(token);
  if (!user) {
    throw new ForbiddenException('unauthorized_password_reset');
  }
};

const updatePassword = async (updateRequest) => {
  const user = await findByPasswordResetToken(updateRequest.passwordResetToken);
  const hash = await bcrypt.hash(updateRequest.password, saltRounds);
  user.password = hash;
  user.passwordResetToken = null;
  user.activationToken = null;
  user.active = true;
  await user.save();
  await TokenService.clearTokens(user.id);
};

module.exports = {
  save,
  findByEmail,
  findByPasswordResetToken,
  activate,
  mustHaveUniqueEmail,
  mustHaveNoErrors,
  getUsers,
  getUser,
  updateUser,
  deleteUser,
  mustAuthenticateToUpdateById,
  mustAuthenticateToDeleteById,
  passwordResetRequest,
  mustAuthenticateResetToken,
  updatePassword,
};
