const User = require('./User');
const bcrypt = require('bcrypt');
const saltRounds = 10;
const crypto = require('crypto');
const EmailService = require('../email/EmailService');
const sequelize = require('../config/db');
const EmailException = require('../email/EmailException');
const InvalidTokenException = require('./InvalidTokenException');
const ValidationException = require('../error/ValidationException');

const generateToken = (length) => {
  return crypto.randomBytes(length).toString('hex').substring(0, length);
};

const save = async (body) => {
  const { username, email, password } = body;
  const hash = await bcrypt.hash(password, saltRounds);
  const user = { username, email, password: hash, activationToken: generateToken(16) };
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

const checkEmailIsUnique = async (email) => {
  const user = await findByEmail(email);
  if (user) {
    throw new Error('email_notUnique');
  }
};

const checkNoErrors = async (errors) => {
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

const getUsers = async (pageIndex, size) => {
  const usersWithCount = await User.findAndCountAll({
    where: { active: true },
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

module.exports = { save, findByEmail, activate, checkEmailIsUnique, checkNoErrors, getUsers };
