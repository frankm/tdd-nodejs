const FileService = require('../src/file/FileService');
const fs = require('fs');
const path = require('path');
const appConfig = require('../src/config/config');

const { uploadDir, profileDir } = appConfig.folders;

describe('createFolders', () => {
  it('creates upload folder', async () => {
    FileService.createFolders();
    expect(fs.existsSync(uploadDir)).toBe(true);
  });

  it('creates profile folder under upload folder', async () => {
    FileService.createFolders();
    const profileFolder = path.join('.', uploadDir, profileDir);
    expect(fs.existsSync(profileFolder)).toBe(true);
  });
});
