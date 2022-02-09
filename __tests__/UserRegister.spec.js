const request = require('supertest');
const app = require('../src/app');
const User = require('../src/user/User');
const sequelize = require('../src/config/db');
const SMTPServer = require('smtp-server').SMTPServer;

let lastMail, server;
let simulateSmtpFailure = false;

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

  await server.listen(8587, 'localhost');

  await sequelize.sync();
});

beforeEach(() => {
  simulateSmtpFailure = false;
  User.destroy({ truncate: true });
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
    expect(res.body.message).toBe('User created');
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
  const username_null = 'Username cannot be null';
  const username_size = 'Must have min 4 & max 32 characters';
  const email_null = 'Email cannot be null';
  const email_invalid = 'Email is not valid';
  const password_null = 'Password cannot be null';
  const password_size = 'Password must be at least 6 characters';
  const password_pattern = 'Password must have at least 1 uppercase, 1 lowercase letter, & 1 number';
  const email_notUnique = 'Email already in use';

  it.each`
    field         | value              | expectedMessage
    ${'username'} | ${null}            | ${username_null}
    ${'username'} | ${'usr'}           | ${username_size}
    ${'username'} | ${'a'.repeat(33)}  | ${username_size}
    ${'email'}    | ${null}            | ${email_null}
    ${'email'}    | ${'mail.com'}      | ${email_invalid}
    ${'email'}    | ${'user.mail.com'} | ${email_invalid}
    ${'email'}    | ${'user@mail'}     | ${email_invalid}
    ${'password'} | ${null}            | ${password_null}
    ${'password'} | ${'P4ssw'}         | ${password_size}
    ${'password'} | ${'alllowercase'}  | ${password_pattern}
    ${'password'} | ${'ALLUPPERCASE'}  | ${password_pattern}
    ${'password'} | ${'1234567890'}    | ${password_pattern}
    ${'password'} | ${'lower4nd567'}   | ${password_pattern}
    ${'password'} | ${'lowerandUPPER'} | ${password_pattern}
    ${'password'} | ${'UPPER5555'}     | ${password_pattern}
  `('when $field is $value returns msg: $expectedMessage', async ({ field, expectedMessage, value }) => {
    const user = { ...validUser };
    user[field] = value;
    const response = await postUser(user);
    const body = response.body;
    expect(body.validationErrors[field]).toBe(expectedMessage);
  });

  it('when email is not unique, returns msg: ${email_notUnique}', async () => {
    await User.create({ ...validUser });
    const response = await postUser();
    const body = response.body;
    expect(body.validationErrors.email).toBe(email_notUnique);
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
    expect(response.body.message).toBe('Email Failure');
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
    expect(response.body.message).toBe('Validation Failure');
  });
});

describe('Internationalization', () => {
  const username_null = 'Kullanıcı adı boş olamaz';
  const username_size = 'En az 4 en fazla 32 karakter olmalı';
  const email_null = 'E-Posta boş olamaz';
  const email_invalid = 'E-Posta geçerli değil';
  const password_null = 'Şifre boş olamaz';
  const password_size = 'Şifre en az 6 karakter olmalı';
  const password_pattern = 'Şifrede en az 1 büyük, 1 küçük harf ve 1 sayı bulunmalıdır';
  const email_inuse = 'Bu E-Posta kullanılıyor';
  const user_create_success = 'Kullanıcı oluşturuldu';
  const email_failure = 'E-Posta gönderiminde hata oluştu';
  const validation_failure = 'Girilen değerler uygun değil';

  it.each`
    field         | value              | expectedMessage
    ${'username'} | ${null}            | ${username_null}
    ${'username'} | ${'usr'}           | ${username_size}
    ${'username'} | ${'a'.repeat(33)}  | ${username_size}
    ${'email'}    | ${null}            | ${email_null}
    ${'email'}    | ${'mail.com'}      | ${email_invalid}
    ${'email'}    | ${'user.mail.com'} | ${email_invalid}
    ${'email'}    | ${'user@mail'}     | ${email_invalid}
    ${'password'} | ${null}            | ${password_null}
    ${'password'} | ${'P4ssw'}         | ${password_size}
    ${'password'} | ${'alllowercase'}  | ${password_pattern}
    ${'password'} | ${'ALLUPPERCASE'}  | ${password_pattern}
    ${'password'} | ${'1234567890'}    | ${password_pattern}
    ${'password'} | ${'lower4nd567'}   | ${password_pattern}
    ${'password'} | ${'lowerandUPPER'} | ${password_pattern}
    ${'password'} | ${'UPPER5555'}     | ${password_pattern}
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

  it(`returns ${email_inuse} when email is not unique & language is turkish`, async () => {
    await User.create({ ...validUser });
    const response = await postUser({ ...validUser }, { language: 'tr' });
    expect(response.body.validationErrors.email).toBe(email_inuse);
  });

  it(`returns success message of ${user_create_success} when signup request is valid & language is turkish`, async () => {
    const response = await postUser({ ...validUser }, { language: 'tr' });
    expect(response.body.message).toBe(user_create_success);
  });

  it(`when email fails & language is turkish, returns ${email_failure}`, async () => {
    simulateSmtpFailure = true;
    const response = await postUser({ ...validUser }, { language: 'tr' });
    expect(response.body.message).toBe(email_failure);
  });

  it(`returns ${validation_failure}, when validation fails, `, async () => {
    const invalidUser = { ...validUser, username: null };
    const response = await postUser({ invalidUser }, { language: 'tr' });
    expect(response.body.message).toBe(validation_failure);
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
    ${'tr'}  | ${'wrong'}   | ${'Bu hesap daha önce aktifleştirilmiş olabilir ya da token hatalı'}
    ${'en'}  | ${'wrong'}   | ${'This account is either active or the token is invalid'}
    ${'tr'}  | ${'correct'} | ${'Hesabınız aktifleştirildi'}
    ${'en'}  | ${'correct'} | ${'Account is activated'}
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
