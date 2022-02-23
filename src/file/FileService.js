const fs = require('fs');
const path = require('path');
const appConfig = require('../config/config');
const { randomString } = require('../shared/generator');
const FileType = require('file-type');

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

const deleteProfileImage = async (filename) => {
  const filePath = path.join(profileFolder, filename);
  await fs.promises.unlink(filePath);
};

const mustNotExceedSizeLimit = (imageBuffer, imageSize) => {
  if (imageBuffer.length > imageSize) {
    throw new Error('profile_image_size');
  }
};

const mustBeSupportedImageType = async (imageBuffer) => {
  const type = await FileType.fromBuffer(imageBuffer);
  if (!type || (type.mime !== 'image/png' && type.mime !== 'image/jpeg')) {
    throw new Error('unsupported_image_file');
  }
};

module.exports = {
  createFolders,
  saveProfileImage,
  deleteProfileImage,
  mustNotExceedSizeLimit,
  mustBeSupportedImageType,
};
