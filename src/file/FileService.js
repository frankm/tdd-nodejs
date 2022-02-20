const fs = require('fs');
const path = require('path');
const appConfig = require('../config/config');
const { randomString } = require('../shared/generator');

const { uploadDir, profileDir } = appConfig.folders;
const profileFolder = path.join('.', uploadDir, profileDir);

const createFolders = () => {
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
  }

  if (!fs.existsSync(profileFolder)) {
    fs.mkdirSync(profileFolder);
  }
};

const saveProfileImage = async (base64File) => {
  const filename = randomString(32);
  const filePath = path.join(profileFolder, filename);
  await fs.promises.writeFile(filePath, base64File, 'base64');
  return filename;
};

module.exports = { createFolders, saveProfileImage };
