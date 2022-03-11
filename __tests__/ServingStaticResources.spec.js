const request = require('supertest');
const app = require('../src/app');
const fs = require('fs');
const path = require('path');
const appConfig = require('../src/config/configFactory.js');

const { uploadDir, profileDir } = appConfig.folders;
const profileDirectory = path.join('.', uploadDir, profileDir);

describe('Profile Images', () => {
  const copyyFile = () => {
    const filePath = path.join('.', '__tests__', 'resources', 'test-png.png');
    const storedFileName = 'test-file';
    const targetPath = path.join(profileDirectory, storedFileName);
    fs.copyFileSync(filePath, targetPath);
    return storedFileName;
  };
  it('returns 404, when file not found', async () => {
    const response = await request(app).get('/images/123456');
    expect(response.status).toBe(404);
  });

  it('returns 200, when file exists', async () => {
    const storedFileName = copyyFile();
    const response = await request(app).get('/images/' + storedFileName);
    expect(response.status).toBe(200);
  });

  it('returns 200, when file exists', async () => {
    const storedFileName = copyyFile();
    const response = await request(app).get('/images/' + storedFileName);
    const oneYearInSeconds = 365 * 24 * 60 * 60;
    expect(response.header['cache-control']).toContain(`max-age=${oneYearInSeconds}`);
  });
});
