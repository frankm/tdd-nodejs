const fs = require('fs');
const path = require('path');
const appConfig = require('../config/config');

const createFolders = () => {
  const { uploadDir, profileDir } = appConfig.folders;
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
  }

  const profileFolder = path.join('.', uploadDir, profileDir);
  if (!fs.existsSync(profileFolder)) {
    fs.mkdirSync(profileFolder);
  }
};

module.exports = { createFolders };
