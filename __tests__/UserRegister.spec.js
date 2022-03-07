const request = require('supertest');
const app = require('../src/app');
const User = require('../src/user/User');
const sequelize = require('../src/config/dbinstance');
const SMTPServer = require('smtp-server').SMTPServer;
const en = require('../locales/en/translation.json');
const tr = require('../locales/tr/translation.json');
const envs = require('../envs');

let lastMail, server;
let simulateSmtpFailure = false;
let simulateSmtpAuthenticationFalilure = false;

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
        if (simulateSmtpAuthenticationFalilure) {
          const err = new Error('Invalid mailbox');
          err.responseCode = 530;
          return callback(err);
        }
        lastMail = mailBody;
        callback();
      });
    },
  });

  const port = parseInt(envs[process.env.NODE_ENV].mail.port);
  await server.listen(port, 'localhost');

  if (process.env.NODE_ENV === 'test') {
    await sequelize.sync();
  }
});

beforeEach(async () => {
  simulateSmtpFailure = false;
  simulateSmtpAuthenticationFalilure = false;

  await User.destroy({ truncate: { cascade: true } });
});

afterAll(async () => {
  await server.close();
});

const validUser = {
  username: 'user1',
  email: 'user1@mail.com',
  password: 'P4ssword',
};
const usersUrl = '/api/1.0/users';
const tokenUrl = usersUrl + '/token/';

const postUser = (user = validUser, options = {}) => {
  const agent = request(app).post(usersUrl);
  if (options.language) {
    agent.set('Accept-Language', options.language);
  }
  return agent.send(user);
};

describe('User Registration', () => {
  it('returns 200 OK for valid signup request', async () => {
    const res = await postUser();
    expect(res.status).toBe(200);
  });

  it('returns success message for valid signup request', async () => {
    const res = await postUser();
    expect(res.body.message).toBe(en.user_create_success);
  });

  it('saves user to db', async () => {
    await postUser();

    const userList = await User.findAll();
    expect(userList.length).toBe(1);
  });

  it('saves username & email to db', async () => {
    await postUser();

    const userList = await User.findAll();
    const savedUser = userList[0];
    expect(savedUser.username).toBe(validUser.username);
    expect(savedUser.email).toBe(validUser.email);
  });

  it('hashes password in db', async () => {
    await postUser();

    const userList = await User.findAll();
    const savedUser = userList[0];
    expect(savedUser.password).not.toBe(validUser.password);
  });

  it('returns 400 when username is null', async () => {
    const invalidUser = { ...validUser, username: null };
    const response = await postUser(invalidUser);
    expect(response.status).toBe(400);
  });

  it('returns validationErrors field in response body when validation occurs', async () => {
    const invalidUser = { ...validUser, username: null };
    const response = await postUser(invalidUser);
    const body = response.body;
    expect(body.validationErrors).not.toBeUndefined();
  });

  it('returns errors when both username & email are null', async () => {
    const invalidUser = { ...validUser, username: null, email: null };
    const response = await postUser(invalidUser);
    const body = response.body;
    expect(Object.keys(body.validationErrors)).toEqual(expect.arrayContaining(['username', 'email']));
  });

  it.each`
    field         | value              | expectedMessage
    ${'username'} | ${'a'.repeat(33)}  | ${en.username_size}
    ${'email'}    | ${null}            | ${en.email_null}
    ${'email'}    | ${'mail.com'}      | ${en.email_invalid}
    ${'email'}    | ${'user.mail.com'} | ${en.email_invalid}
    ${'email'}    | ${'user@mail'}     | ${en.email_invalid}
    ${'password'} | ${null}            | ${en.password_null}
    ${'password'} | ${'P4ssw'}         | ${en.password_size}
    ${'password'} | ${'alllowercase'}  | ${en.password_pattern}
    ${'password'} | ${'ALLUPPERCASE'}  | ${en.password_pattern}
    ${'password'} | ${'1234567890'}    | ${en.password_pattern}
    ${'password'} | ${'lower4nd567'}   | ${en.password_pattern}
    ${'password'} | ${'lowerandUPPER'} | ${en.password_pattern}
    ${'password'} | ${'UPPER5555'}     | ${en.password_pattern}
    ${'username'} | ${null}            | ${en.username_null}
    ${'username'} | ${'usr'}           | ${en.username_size}
  `('when $field is $value returns msg: $expectedMessage', async ({ field, expectedMessage, value }) => {
    const user = { ...validUser };
    user[field] = value;
    const response = await postUser(user);
    const body = response.body;
    expect(body.validationErrors[field]).toBe(expectedMessage);
  });

  it('when email is not unique, returns msg: ${en.email_notUnique}', async () => {
    await User.create({ ...validUser });
    const response = await postUser();
    const body = response.body;
    expect(body.validationErrors.email).toBe(en.email_notUnique);
  });

  it('returns error, when username is null & email is not unique', async () => {
    await User.create({ ...validUser });
    const invalidUser = { ...validUser, username: null };
    const response = await postUser(invalidUser);
    const body = response.body;
    expect(Object.keys(body.validationErrors)).toEqual(expect.arrayContaining(['username', 'email']));
  });

  it('creates inactive user', async () => {
    await postUser();
    const users = await User.findAll();
    const savedUser = users[0];
    expect(savedUser.active).toBe(false);
  });

  it('creates inactive user, when post set active to true', async () => {
    const userSetTpActive = { ...validUser, active: true };
    await postUser(userSetTpActive);
    const users = await User.findAll();
    const savedUser = users[0];
    expect(savedUser.active).toBe(false);
  });

  it('creates activationToken for user', async () => {
    await postUser();
    const users = await User.findAll();
    const savedUser = users[0];
    expect(savedUser.activationToken).toBeTruthy();
  });

  it('emails activationToken', async () => {
    await postUser();
    const users = await User.findAll();
    const savedUser = users[0];
    expect(lastMail).toContain(savedUser.email);
    expect(lastMail).toContain(savedUser.activationToken);
  });

  it('returns 502 Bad Gateway, when activation email fails', async () => {
    simulateSmtpFailure = true;
    const response = await postUser();
    expect(response.status).toBe(502);
  });

  it('returns Email Failure Message, when activation email fails', async () => {
    simulateSmtpFailure = true;
    const response = await postUser();
    expect(response.body.message).toBe(en.email_failure);
  });

  it('does not save user to db, when activation email fails', async () => {
    simulateSmtpFailure = true;
    await postUser();
    const users = await User.findAll();
    expect(users.length).toBe(0);
  });

  it('returns Validation Failure message when validation fails', async () => {
    const invalidUser = { ...validUser, username: null };
    const response = await postUser(invalidUser);
    expect(response.body.message).toBe(en.validation_failure);
  });
});

describe('Internationalization', () => {
  it.each`
    field         | value              | expectedMessage
    ${'username'} | ${null}            | ${tr.username_null}
    ${'username'} | ${'usr'}           | ${tr.username_size}
    ${'username'} | ${'a'.repeat(33)}  | ${tr.username_size}
    ${'email'}    | ${null}            | ${tr.email_null}
    ${'email'}    | ${'mail.com'}      | ${tr.email_invalid}
    ${'email'}    | ${'user.mail.com'} | ${tr.email_invalid}
    ${'email'}    | ${'user@mail'}     | ${tr.email_invalid}
    ${'password'} | ${null}            | ${tr.password_null}
    ${'password'} | ${'P4ssw'}         | ${tr.password_size}
    ${'password'} | ${'alllowercase'}  | ${tr.password_pattern}
    ${'password'} | ${'ALLUPPERCASE'}  | ${tr.password_pattern}
    ${'password'} | ${'1234567890'}    | ${tr.password_pattern}
    ${'password'} | ${'lower4nd567'}   | ${tr.password_pattern}
    ${'password'} | ${'lowerandUPPER'} | ${tr.password_pattern}
    ${'password'} | ${'UPPER5555'}     | ${tr.password_pattern}
  `(
    'when $field is $value & language is turkish, returns msg: $expectedMessage',
    async ({ field, expectedMessage, value }) => {
      const user = { ...validUser };
      user[field] = value;
      const response = await postUser(user, { language: 'tr' });
      const body = response.body;
      expect(body.validationErrors[field]).toBe(expectedMessage);
    }
  );

  it(`returns ${tr.email_notUnique} when email is not unique & language is turkish`, async () => {
    await User.create({ ...validUser });
    const response = await postUser({ ...validUser }, { language: 'tr' });
    expect(response.body.validationErrors.email).toBe(tr.email_notUnique);
  });

  it(`returns success message of ${tr.user_create_success} when signup request is valid & language is turkish`, async () => {
    const response = await postUser({ ...validUser }, { language: 'tr' });
    expect(response.body.message).toBe(tr.user_create_success);
  });

  it(`when email fails & language is turkish, returns ${tr.email_failure}`, async () => {
    simulateSmtpFailure = true;
    const response = await postUser({ ...validUser }, { language: 'tr' });
    expect(response.body.message).toBe(tr.email_failure);
  });

  it(`returns ${tr.validation_failure}, when validation fails, `, async () => {
    const invalidUser = { ...validUser, username: null };
    const response = await postUser({ invalidUser }, { language: 'tr' });
    expect(response.body.message).toBe(tr.validation_failure);
  });
});

describe('Account activation', () => {
  it('activates account, when correct token is sent', async () => {
    await postUser();
    let users = await User.findAll();
    const token = users[0].activationToken;

    await request(app)
      .post(tokenUrl + token)
      .send();
    users = await User.findAll();
    expect(users[0].active).toBe(true);
  });

  it('removes token from user table, after successful activation', async () => {
    await postUser();
    let users = await User.findAll();
    const token = users[0].activationToken;

    await request(app)
      .post(tokenUrl + token)
      .send();
    users = await User.findAll();
    expect(users[0].activationToken).toBeFalsy();
  });

  it('does not activate account, when token is wrong', async () => {
    await postUser();
    let users = await User.findAll();
    const token = 'this-token-does-not-exist';

    await request(app)
      .post(tokenUrl + token)
      .send();
    users = await User.findAll();
    expect(users[0].active).toBe(false);
  });

  it('returns bad request, when token is wrong', async () => {
    await postUser();
    const token = 'this-token-does-not-exist';
    const response = await request(app)
      .post(tokenUrl + token)
      .send();
    expect(response.status).toBe(400);
  });

  it.each`
    language | tokenStatus  | message
    ${'tr'}  | ${'wrong'}   | ${tr.account_activation_failure}
    ${'en'}  | ${'wrong'}   | ${en.account_activation_failure}
    ${'tr'}  | ${'correct'} | ${tr.account_activation_success}
    ${'en'}  | ${'correct'} | ${en.account_activation_success}
  `(
    'returns $message when token is $tokenStatus sent and language is $language',
    async ({ language, tokenStatus, message }) => {
      await postUser();
      let token = 'this-token-does-not-exist';
      if (tokenStatus === 'correct') {
        let users = await User.findAll();
        token = users[0].activationToken;
      }
      const response = await request(app)
        .post(tokenUrl + token)
        .set('Accept-Language', language)
        .send();
      expect(response.body.message).toBe(message);
    }
  );
});

describe('Error Model', () => {
  it('returns path, timestamp, message, and validationErrors, when vaildation fails', async () => {
    const invalidUser = { ...validUser, username: null };
    const response = await postUser(invalidUser);
    const body = response.body;
    expect(Object.keys(body)).toEqual(['path', 'timestamp', 'message', 'validationErrors']);
  });

  it('returns path, timestamp, and message, when no vaildation failure', async () => {
    const invalidToken = 'this-token-does-not-exist';
    const response = await request(app)
      .post(tokenUrl + invalidToken)
      .send();
    const body = response.body;
    expect(Object.keys(body)).toEqual(expect.arrayContaining(['timestamp', 'path', 'message']));
  });

  it('returns path in error body', async () => {
    const invalidToken = 'this-token-does-not-exist';
    const response = await request(app)
      .post(tokenUrl + invalidToken)
      .send();
    const body = response.body;
    expect(body.path).toEqual(tokenUrl + invalidToken);
  });

  it('returns timestamp in ms within 5 seconds in error body', async () => {
    const nowInMillis = new Date().getTime();
    const fiveSecondsLater = nowInMillis + 5 * 1000;
    const invalidToken = 'this-token-does-not-exist';
    const response = await request(app)
      .post(tokenUrl + invalidToken)
      .send();
    const body = response.body;
    expect(body.timestamp).toBeGreaterThan(nowInMillis);
    expect(body.timestamp).toBeLessThan(fiveSecondsLater);
  });
});
