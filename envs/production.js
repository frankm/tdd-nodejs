const appConfig = require('../src/config/configfactory');

const mail = appConfig.authMail;

module.exports = {
  database: appConfig.db,
  mail: mail,
  folders: appConfig.folders,
};
