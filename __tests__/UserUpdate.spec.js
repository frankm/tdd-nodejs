const request = require('supertest');
const app = require('../src/app');
const User = require('../src/user/User');
const sequelize = require('../src/config/dbinstance');
const bcrypt = require('bcrypt');
const saltRounds = 10;
const en = require('../locales/en/translation.json');
const tr = require('../locales/tr/translation.json');
const fs = require('fs');
const path = require('path');
const appConfig = require('../src/config/configFactory');

const { uploadDir, profileDir } = appConfig.folders;
const profileDirectory = path.join('.', uploadDir, profileDir);

beforeAll(async () => {
  if (process.env.NODE_ENV === 'test') {
    await sequelize.sync();
  }
});

beforeEach(async () => {
  await User.destroy({ truncate: { cascade: true } });
});

const usersUrl = '/api/1.0/users';
const authUrl = '/api/1.0/auth';

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

const putUser = async (id = 5, body = null, options = {}) => {
  let agent = request(app);
  let token;
  if (options.auth) {
    const response = await agent.post(authUrl).send(options.auth);
    token = response.body.token;
  }

  agent = request(app).put(usersUrl + '/' + id);
  if (options.language) {
    agent.set('Accept-Language', options.language);
  }
  if (token) {
    agent.set('Authorization', `Bearer ${token}`);
  }
  if (options.token) {
    agent.set('Authorization', `Bearer ${options.token}`);
  }
  return agent.send(body);
};

const readFileAsBase64 = (file = 'test-png.png') => {
  const filePath = path.join('.', '__tests__', 'resources', file);
  return fs.readFileSync(filePath, { encoding: 'base64' });
};

describe('User Update', () => {
  it('returns forbidden, when update request without basic authorization', async () => {
    const response = await putUser();
    expect(response.status).toBe(403);
  });

  it.each`
    language | message
    ${'tr'}  | ${tr.unauthorized_user_update}
    ${'en'}  | ${en.unauthorized_user_update}
  `(
    'returns error body with $message for unauthorized request when language is $language',
    async ({ language, message }) => {
      const nowInMillis = new Date().getTime();
      const response = await putUser(5, null, { language });
      expect(response.body.path).toBe(usersUrl + '/5');
      expect(response.body.timestamp).toBeGreaterThan(nowInMillis);
      expect(response.body.message).toBe(message);
    }
  );

  it('returns forbidden, when incorrect email in basic authorization', async () => {
    await addUser();
    const response = await putUser(5, null, { auth: { email: 'user1000@mail.com', password: 'P4ssword' } });
    expect(response.status).toBe(403);
  });

  it('returns forbidden, when incorrect password in basic authorization', async () => {
    await addUser();
    const response = await putUser(5, null, { auth: { email: activeUser.email, password: 'P4ssword' } });
    expect(response.status).toBe(403);
  });

  it('returns forbidden, when correct credentials for different user', async () => {
    await addUser();
    const userToBeUpdated = await addUser({ ...activeUser, username: 'user2', email: 'user2@mail.com' });
    const response = await putUser(userToBeUpdated.id, null, {
      auth: { email: 'user1@mail.com', password: 'P4ssword' },
    });
    expect(response.status).toBe(403);
  });

  it('returns forbidden, when inactive user has correct credentials', async () => {
    const inactiveUser = await addUser({ ...activeUser, active: false });
    const response = await putUser(inactiveUser.id, null, {
      auth: { email: inactiveUser.email, password: activeUser.email },
    });
    expect(response.status).toBe(403);
  });

  it('returns 200 ok, when valid update request from authorized user', async () => {
    const savedUser = await addUser();
    const validUpdate = { username: 'user1-updated' };
    const response = await putUser(savedUser.id, validUpdate, {
      auth: { email: savedUser.email, password: 'P4ssword' },
    });
    expect(response.status).toBe(200);
  });

  it('update username in db, when valid update request from authorized user', async () => {
    const savedUser = await addUser();
    const validUpdate = { username: 'user1-updated' };
    await putUser(savedUser.id, validUpdate, {
      auth: { email: savedUser.email, password: 'P4ssword' },
    });
    const inDBUser = await User.findOne({ where: { id: savedUser.id } });
    expect(inDBUser.username).toBe(validUpdate.username);
  });

  it('returns 403, when token is not valid', async () => {
    const response = await putUser(5, null, { token: '123' });
    expect(response.status).toBe(403);
  });

  it('saves user image, when update contains image as base64', async () => {
    const fileInBase64 = readFileAsBase64();
    const savedUser = await addUser();
    const validUpdate = { username: 'user1-updated', image: fileInBase64 };
    await putUser(savedUser.id, validUpdate, {
      auth: { email: savedUser.email, password: activeUser.password },
    });
    const inDBUser = await User.findOne({ where: { id: savedUser.id } });
    expect(inDBUser.image).toBeTruthy();
  });

  it('returns success body containing only id, username, email, and image', async () => {
    const fileInBase64 = readFileAsBase64();
    const savedUser = await addUser();
    const validUpdate = { username: 'user1-updated', image: fileInBase64 };
    const response = await putUser(savedUser.id, validUpdate, {
      auth: { email: savedUser.email, password: activeUser.password },
    });
    expect(Object.keys(response.body).sort()).toEqual(['id', 'username', 'email', 'image'].sort());
  });

  it('saves the user image to upload folder and stores filename in user when update has image', async () => {
    const fileInBase64 = readFileAsBase64();
    const savedUser = await addUser();
    const validUpdate = { username: 'user1-updated', image: fileInBase64 };
    await putUser(savedUser.id, validUpdate, {
      auth: { email: savedUser.email, password: 'P4ssword' },
    });
    const inDBUser = await User.findOne({ where: { id: savedUser.id } });
    const profileImagePath = path.join(profileDirectory, inDBUser.image);
    expect(fs.existsSync(profileImagePath)).toBe(true);
  });

  it('removes old image, when user uploads new image', async () => {
    const fileInBase64 = readFileAsBase64();
    const savedUser = await addUser();
    const validUpdate = { username: 'user1-updated', image: fileInBase64 };
    const response = await putUser(savedUser.id, validUpdate, {
      auth: { email: savedUser.email, password: 'P4ssword' },
    });

    const firstImage = response.body.image;

    await putUser(savedUser.id, validUpdate, {
      auth: { email: savedUser.email, password: 'P4ssword' },
    });

    const profileImagePath = path.join(profileDirectory, firstImage);
    expect(fs.existsSync(profileImagePath)).toBe(false);
  });

  it.each`
    language | value             | message
    ${'en'}  | ${null}           | ${en.username_null}
    ${'en'}  | ${'usr'}          | ${en.username_size}
    ${'en'}  | ${'a'.repeat(33)} | ${en.username_size}
    ${'tr'}  | ${null}           | ${tr.username_null}
    ${'tr'}  | ${'usr'}          | ${tr.username_size}
    ${'tr'}  | ${'a'.repeat(33)} | ${tr.username_size}
  `(
    'when username is updated with $value & language is $language, returns msg: $message',
    async ({ language, value, message }) => {
      const savedUser = await addUser();
      const invalidUpdate = { username: value };
      const response = await putUser(savedUser.id, invalidUpdate, {
        auth: { email: savedUser.email, password: 'P4ssword' },
        language: language,
      });
      expect(response.status).toBe(400);
      expect(response.body.validationErrors.username).toBe(message);
    }
  );

  it('returns 200, when image size is exactly 2mb', async () => {
    const testPng = readFileAsBase64();
    const pngByte = Buffer.from(testPng, 'base64').length;
    const twoMB = 1024 * 1024 * 2;
    const filling = 'a'.repeat(twoMB - pngByte);
    const fillBase64 = Buffer.from(filling).toString('base64');
    const savedUser = await addUser();
    const validUpdate = { username: 'user1-updated', image: testPng + fillBase64 };
    const response = await putUser(savedUser.id, validUpdate, {
      auth: { email: savedUser.email, password: 'P4ssword' },
    });
    expect(response.status).toBe(200);
  });

  it('returns 400, when image size is exceeds 2mb', async () => {
    const fileEceedingSize2MB = 'a'.repeat(1024 * 1024 * 2) + 'a';
    const base64 = Buffer.from(fileEceedingSize2MB).toString('base64');
    const savedUser = await addUser();
    const invalidUpdate = { username: 'user1-updated', image: base64 };
    const response = await putUser(savedUser.id, invalidUpdate, {
      auth: { email: savedUser.email, password: 'P4ssword' },
    });
    expect(response.status).toBe(400);
  });

  it('keeps old image, when user updates only username', async () => {
    const fileInBase64 = readFileAsBase64();
    const savedUser = await addUser();
    const validUpdate = { username: 'user1-updated', image: fileInBase64 };
    const response = await putUser(savedUser.id, validUpdate, {
      auth: { email: savedUser.email, password: 'P4ssword' },
    });

    const firstImage = response.body.image;
    const updateOnlyUsername = { username: 'user1-updated2' };

    await putUser(savedUser.id, updateOnlyUsername, {
      auth: { email: savedUser.email, password: 'P4ssword' },
    });

    const profileImagePath = path.join(profileDirectory, firstImage);
    expect(fs.existsSync(profileImagePath)).toBe(true);
    const userInDB = await User.findOne({ where: { id: savedUser.id } });
    expect(userInDB.image).toBe(firstImage);
  });

  it.each`
    language | message
    ${'tr'}  | ${tr.profile_image_size}
    ${'en'}  | ${en.profile_image_size}
  `('returns $message when file size exceeds 2mb when language is $language', async ({ language, message }) => {
    const fileExceeding2MB = 'a'.repeat(1024 * 1024 * 2) + 'a';
    const base64 = Buffer.from(fileExceeding2MB).toString('base64');
    const savedUser = await addUser();
    const invalidUpdate = { username: 'updated-user', image: base64 };
    const response = await putUser(savedUser.id, invalidUpdate, {
      auth: { email: savedUser.email, password: 'P4ssword' },
      language,
    });
    expect(response.body.validationErrors.image).toBe(message);
  });

  it.each`
    file              | status
    ${'test-gif.gif'} | ${400}
    ${'test-pdf.pdf'} | ${400}
    ${'test-txt.txt'} | ${400}
    ${'test-png.png'} | ${200}
    ${'test-jpg.jpg'} | ${200}
  `('returns $status when uploading $file as image', async ({ file, status }) => {
    const fileInBase64 = readFileAsBase64(file);
    const savedUser = await addUser();
    const updateBody = { username: 'user1-updated', image: fileInBase64 };
    const response = await putUser(savedUser.id, updateBody, {
      auth: { email: savedUser.email, password: activeUser.password },
    });
    expect(response.status).toBe(status);
  });

  it.each`
    file              | language | message
    ${'test-gif.gif'} | ${'tr'}  | ${tr.unsupported_image_file}
    ${'test-gif.gif'} | ${'en'}  | ${en.unsupported_image_file}
    ${'test-pdf.pdf'} | ${'tr'}  | ${tr.unsupported_image_file}
    ${'test-pdf.pdf'} | ${'en'}  | ${en.unsupported_image_file}
    ${'test-txt.txt'} | ${'tr'}  | ${tr.unsupported_image_file}
    ${'test-txt.txt'} | ${'en'}  | ${en.unsupported_image_file}
  `(
    'returns $message when uploading $file as image when language is $language',
    async ({ file, language, message }) => {
      const fileInBase64 = readFileAsBase64(file);
      const savedUser = await addUser();
      const updateBody = { username: 'user1-updated', image: fileInBase64 };
      const response = await putUser(savedUser.id, updateBody, {
        auth: { email: savedUser.email, password: activeUser.password },
        language,
      });
      expect(response.body.validationErrors.image).toBe(message);
    }
  );
});
