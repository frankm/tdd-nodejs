const fs = require('fs');
const path = require('path');
const appConfig = require('./src/config/config');

const { uploadDir, profileDir } = appConfig.folders;
const profileDirectory = path.join('.', uploadDir, profileDir);

console.log('running test-clean...');
const files = fs.readdirSync(profileDirectory);
for (const file of files) {
  fs.unlinkSync(path.join(profileDirectory, file));
}
