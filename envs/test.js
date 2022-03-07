const appConfig = require('../src/config/configFactory');

const mail = appConfig.ignoreCertMail;

module.exports = {
  database: appConfig.db,
  mail: mail,
  folders: appConfig.folders,
};
