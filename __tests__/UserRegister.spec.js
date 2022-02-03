const request = require('supertest');
const app = require('../src/app');
const User = require('../src/user/User');
const sequelize = require('../src/config/db');

beforeAll(() => {
  return sequelize.sync();
});

beforeEach(() => {
  User.destroy({ truncate: true });
});

describe('User Registration', () => {
  const validUser = {
    username: 'user1',
    email: 'user1@mail.com',
    password: 'P4ssword',
  };
  const postUser = (user = validUser) => {
    return request(app).post('/api/1.0/users').send(user);
  };

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
    expect(Object.keys(body.validationErrors)).toEqual(
      expect.arrayContaining(['username', 'email'])
    );
  });

  it.each`
    field         | value              | expectedMessage
    ${'username'} | ${null}            | ${'Username cannot be null'}
    ${'username'} | ${'usr'}           | ${'Must have min 4 & max 32 characters'}
    ${'username'} | ${'a'.repeat(33)}  | ${'Must have min 4 & max 32 characters'}
    ${'email'}    | ${null}            | ${'Email cannot be null'}
    ${'email'}    | ${'mail.com'}      | ${'Email is not valid'}
    ${'email'}    | ${'user.mail.com'} | ${'Email is not valid'}
    ${'email'}    | ${'user@mail'}     | ${'Email is not valid'}
    ${'password'} | ${null}            | ${'Password cannot be null'}
    ${'password'} | ${'P4ssw'}         | ${'Password must be at least 6 characters'}
    ${'password'} | ${'alllowercase'}  | ${'Password must be at least 1 uppercase, 1 lowercase letter & 1 number'}
    ${'password'} | ${'ALLUPPERCASE'}  | ${'Password must be at least 1 uppercase, 1 lowercase letter & 1 number'}
    ${'password'} | ${'1234567890'}    | ${'Password must be at least 1 uppercase, 1 lowercase letter & 1 number'}
    ${'password'} | ${'lower4nd567'}   | ${'Password must be at least 1 uppercase, 1 lowercase letter & 1 number'}
    ${'password'} | ${'lowerandUPPER'} | ${'Password must be at least 1 uppercase, 1 lowercase letter & 1 number'}
    ${'password'} | ${'UPPER5555'}     | ${'Password must be at least 1 uppercase, 1 lowercase letter & 1 number'}
  `(
    'when $field is $value returns msg: $expectedMessage',
    async ({ field, expectedMessage, value }) => {
      const user = { ...validUser };
      user[field] = value;
      const response = await postUser(user);
      const body = response.body;
      expect(body.validationErrors[field]).toBe(expectedMessage);
    }
  );

  it('when email is not unique, returns msg: Email already in use', async () => {
    await User.create({ ...validUser });
    const response = await postUser();
    const body = response.body;
    expect(body.validationErrors.email).toBe('Email already in use');
  });

  it('returns error, when username is null & email is not unique', async () => {
    await User.create({ ...validUser });
    const invalidUser = { ...validUser, username: null };
    const response = await postUser(invalidUser);
    const body = response.body;
    expect(Object.keys(body.validationErrors)).toEqual(
      expect.arrayContaining(['username', 'email'])
    );
  });
});
