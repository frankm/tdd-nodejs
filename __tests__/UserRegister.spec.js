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
    field         | expectedMessage
    ${'username'} | ${'Username cannot be null'}
    ${'email'}    | ${'Email cannot be null'}
    ${'password'} | ${'Password cannot be null'}
  `(
    'when $field is null returns msg: $expectedMessage',
    async ({ field, expectedMessage }) => {
      const user = { ...validUser };
      user[field] = null;
      const response = await postUser(user);
      const body = response.body;
      expect(body.validationErrors[field]).toBe(expectedMessage);
    }
  );
});
