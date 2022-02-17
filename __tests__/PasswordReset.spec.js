const request = require('supertest');
const app = require('../src/app');
const User = require('../src/user/User');
const sequelize = require('../src/config/db');
const bcrypt = require('bcrypt');
const saltRounds = 10;
const en = require('../locales/en/translation.json');
const tr = require('../locales/tr/translation.json');

beforeAll(async () => {
  await sequelize.sync();
});

beforeEach(async () => {
  await User.destroy({ truncate: { cascade: true } });
});

const passwordResetUrl = '/api/1.0/password-reset';

const activeUser = {
  username: 'user1',
  email: 'user1@mail.com',
  password: 'P4ssword',
  active: true,
};

const addUser = async (user = { ...activeUser }) => {
  const hash = await bcrypt.hash(user.password, saltRounds);
  user.password = hash;
  return await User.create(user);
};

const postPasswordReset = (email = 'user1@mail.com', options = {}) => {
  const agent = request(app).post(passwordResetUrl);
  if (options.language) {
    agent.set('Accept-Language', options.language);
  }
  return agent.send({ email: email });
};

describe('Password Reset Request', () => {
  it('returns 404, when password reset request is for unknown email', async () => {
    const response = await postPasswordReset();
    expect(response.status).toBe(404);
  });

  it.each`
    language | message
    ${'tr'}  | ${tr.email_invalid}
    ${'en'}  | ${en.email_invalid}
  `(
    'returns 400, validation error, and  $message, when invalid email & language is $language',
    async ({ language, message }) => {
      const response = await postPasswordReset(null, { language: language });
      expect(response.body.validationErrors.email).toBe(message);
      expect(response.status).toBe(400);
    }
  );

  it('returns 200, when password reset request is for known email', async () => {
    const user = await addUser();
    const response = await postPasswordReset(user.email);
    expect(response.status).toBe(200);
  });

  it.each`
    language | message
    ${'tr'}  | ${tr.password_reset_request_success}
    ${'en'}  | ${en.password_reset_request_success}
  `(
    'returns success body containing: $message, when password reset request for known email & language is $language',
    async ({ language, message }) => {
      const user = await addUser();
      const response = await postPasswordReset(user.email, { language });
      expect(response.body.message).toBe(message);
    }
  );

  it('creates passwordResetToken, when password reset request for known email', async () => {
    const user = await addUser();
    await postPasswordReset(user.email);
    const userInDB = await User.findOne({ where: { email: user.email } });
    expect(userInDB.passwordResetToken).toBeTruthy();
  });
});
