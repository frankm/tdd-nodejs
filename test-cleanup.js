const fs = require('fs');
const path = require('path');
const appConfig = require('./src/config/config');
const logger = require('./src/shared/logger');

const { uploadDir, profileDir } = appConfig.folders;
const profileDirectory = path.join('.', uploadDir, profileDir);

logger.info('running test-clean...');
const files = fs.readdirSync(profileDirectory);
for (const file of files) {
  fs.unlinkSync(path.join(profileDirectory, file));
}
