const request = require('supertest');
const app = require('../src/app');
const User = require('../src/user/User');
const Token = require('../src/auth/Token');
const sequelize = require('../src/config/dbInstance');
const bcrypt = require('bcrypt');
const saltRounds = 10;
const en = require('../locales/en/translation.json');
const tr = require('../locales/tr/translation.json');
const SMTPServer = require('smtp-server').SMTPServer;
const envs = require('../envs');

let lastMail, server;
let simulateSmtpFailure = false;
const DAY_IN_MILLIS = 24 * 60 * 60 * 1000;
const passwordResetUrl = '/api/1.0/user/password';

beforeAll(async () => {
  server = new SMTPServer({
    authOptional: true,
    onData(stream, session, callback) {
      let mailBody;
      stream.on('data', (data) => {
        mailBody += data.toString();
      });
      stream.on('end', () => {
        if (simulateSmtpFailure) {
          const err = new Error('Invalid mailbox');
          err.responseCode = 553;
          return callback(err);
        }
        lastMail = mailBody;
        callback();
      });
    },
  });

  const port = envs[process.env.NODE_ENV].mail;
  await server.listen(port, 'localhost');

  if (process.env.NODE_ENV === 'test') {
    await sequelize.sync();
  }
  jest.setTimeout(20000);
});

beforeEach(async () => {
  simulateSmtpFailure = false;
  await User.destroy({ truncate: { cascade: true } });
});

afterAll(async () => {
  await server.close();
  jest.setTimeout(5000);
});

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

const putPasswordUpdate = (body = {}, options = {}) => {
  const agent = request(app).put(passwordResetUrl);
  if (options.language) {
    agent.set('Accept-Language', options.language);
  }
  return agent.send(body);
};

describe('Password Reset Request', () => {
  it('returns 404, when password reset request is for unknown email', async () => {
    const response = await postPasswordReset();
    expect(response.status).toBe(404);
  });

  it.each`
    language | message
    ${'tr'}  | ${tr.email_not_inuse}
    ${'en'}  | ${en.email_not_inuse}
  `(
    'returns error body with $message for unknown email for password reset request when language is $language',
    async ({ language, message }) => {
      const nowInMillis = new Date().getTime();
      const response = await postPasswordReset(activeUser.email, { language: language });
      expect(response.body.path).toBe(passwordResetUrl);
      expect(response.body.timestamp).toBeGreaterThan(nowInMillis);
      expect(response.body.message).toBe(message);
    }
  );

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

  it('sends password reset email with passwordResetToken', async () => {
    const user = await addUser();
    await postPasswordReset(user.email);
    const userInDB = await User.findOne({ where: { email: user.email } });
    const passwordResetToken = userInDB.passwordResetToken;
    expect(lastMail).toContain(user.email);
    expect(lastMail).toContain(passwordResetToken);
  });

  it('sends 502 Bad Gateway when sending email fails', async () => {
    simulateSmtpFailure = true;
    const user = await addUser();
    const response = await postPasswordReset(user.email);
    expect(response.status).toBe(502);
  });

  it.each`
    language | message
    ${'tr'}  | ${tr.email_failure}
    ${'en'}  | ${en.email_failure}
  `(
    'returns error containing: $message, when password reset email failure & language is $language',
    async ({ language, message }) => {
      simulateSmtpFailure = true;
      const user = await addUser();
      const response = await postPasswordReset(user.email, { language });
      expect(response.body.message).toBe(message);
    }
  );
});

describe('Password Update', () => {
  it('returns 403, when password reset request has invalid password reset token', async () => {
    const response = await putPasswordUpdate({
      password: activeUser.email,
      passwordResetToken: 'invalid-token',
    });
    expect(response.status).toBe(403);
  });

  it.each`
    language | message
    ${'tr'}  | ${tr.unauthorized_password_reset}
    ${'en'}  | ${en.unauthorized_password_reset}
  `(
    'returns error containing: $message, when updating password with invalid token & language is $language',
    async ({ language, message }) => {
      const nowInMillis = new Date().getTime();
      const response = await putPasswordUpdate(
        {
          password: activeUser.email,
          passwordResetToken: 'invalid-token',
        },
        { language }
      );
      expect(response.body.path).toBe(passwordResetUrl);
      expect(response.body.timestamp).toBeGreaterThan(nowInMillis);
      expect(response.body.message).toBe(message);
    }
  );

  it('returns 403, when password update request has invalid password format and invalid token', async () => {
    const response = await putPasswordUpdate({
      password: 'not-valid',
      passwordResetToken: 'invalid-token',
    });
    expect(response.status).toBe(403);
  });

  it('returns 403, when update request has invalid password format and valid token', async () => {
    const user = await addUser();
    user.passwordResetToken = 'valid-token';
    await user.save();
    const response = await putPasswordUpdate({
      password: 'not-valid',
      passwordResetToken: user.passwordResetToken,
    });
    expect(response.status).toBe(400);
  });

  it.each`
    language | value              | message
    ${'en'}  | ${null}            | ${en.password_null}
    ${'en'}  | ${'P4ssw'}         | ${en.password_size}
    ${'en'}  | ${'alllowercase'}  | ${en.password_pattern}
    ${'en'}  | ${'ALLUPPERCASE'}  | ${en.password_pattern}
    ${'en'}  | ${'1234567890'}    | ${en.password_pattern}
    ${'en'}  | ${'lower4nd567'}   | ${en.password_pattern}
    ${'en'}  | ${'lowerandUPPER'} | ${en.password_pattern}
    ${'en'}  | ${'UPPER5555'}     | ${en.password_pattern}
    ${'tr'}  | ${null}            | ${tr.password_null}
    ${'tr'}  | ${'P4ssw'}         | ${tr.password_size}
    ${'tr'}  | ${'alllowercase'}  | ${tr.password_pattern}
    ${'tr'}  | ${'ALLUPPERCASE'}  | ${tr.password_pattern}
    ${'tr'}  | ${'1234567890'}    | ${tr.password_pattern}
    ${'tr'}  | ${'lower4nd567'}   | ${tr.password_pattern}
    ${'tr'}  | ${'lowerandUPPER'} | ${tr.password_pattern}
    ${'tr'}  | ${'UPPER5555'}     | ${tr.password_pattern}
  `(
    'returns password validation msg: $message, when language is $language, and value is $value',
    async ({ message, language, value }) => {
      const user = await addUser();
      user.passwordResetToken = 'valid-token';
      await user.save();
      const response = await putPasswordUpdate(
        {
          password: value,
          passwordResetToken: user.passwordResetToken,
        },
        { language: language }
      );
      expect(response.body.validationErrors.password).toBe(message);
    }
  );

  it('returns 200, when valid password & valid token', async () => {
    const user = await addUser();
    user.passwordResetToken = 'valid-Tok3n';
    await user.save();
    const response = await putPasswordUpdate({
      password: 'N3w-password',
      passwordResetToken: user.passwordResetToken,
    });
    expect(response.status).toBe(200);
  });

  it('returns 200, when valid password & valid token', async () => {
    const user = await addUser();
    user.passwordResetToken = 'valid-Tok3n';
    await user.save();
    await putPasswordUpdate({
      password: 'N3w-password',
      passwordResetToken: user.passwordResetToken,
    });
    const userInDB = await User.findOne({ where: { email: user.email } });
    expect(userInDB.password).not.toEqual(user.password);
  });

  it('clears reset token, when valid request', async () => {
    const user = await addUser();
    user.passwordResetToken = 'valid-Tok3n';
    await user.save();
    await putPasswordUpdate({
      password: 'N3w-password',
      passwordResetToken: user.passwordResetToken,
    });
    const userInDB = await User.findOne({ where: { email: user.email } });
    expect(userInDB.passwordResetToken).toBeFalsy();
  });

  it('clears & resets activation token, when account inactive & valid password reset', async () => {
    const user = await addUser();
    user.passwordResetToken = 'valid-Tok3n';
    user.activationToken = 'activation-token';
    user.active = false;
    await user.save();
    await putPasswordUpdate({
      password: 'N3w-password',
      passwordResetToken: user.passwordResetToken,
    });
    const userInDB = await User.findOne({ where: { email: user.email } });
    expect(userInDB.activationToken).toBeFalsy();
    expect(userInDB.active).toBe(true);
  });

  it('clears all tokens of user, when valid password reset', async () => {
    const user = await addUser();
    user.passwordResetToken = 'valid-Tok3n';
    await user.save();
    await Token.create({
      token: 'token-1',
      userId: user.id,
      lastUsedAt: Date.now(),
    });

    const threeDaysAgo = new Date(Date.now() - 3 * DAY_IN_MILLIS);
    await Token.create({
      token: 'token-2',
      userId: user.id,
      lastUsedAt: threeDaysAgo,
    });
    await putPasswordUpdate({
      password: 'N3w-password',
      passwordResetToken: user.passwordResetToken,
    });
    const tokens = await Token.findAll({ where: { userId: user.id } });
    expect((await tokens).length).toBe(0);
  });
});
