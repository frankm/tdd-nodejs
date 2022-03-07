const AuthenticationRequiredException = require('../src/error/AuthenticationRequiredException');

const configSMTPWithAuthentication = (mail) => {
  configSMTP(mail);
  configSMTPSecrets(mail);
};

const configSMTPWithNoAuth = (mail) => {
  configSMTP(mail);
  configSMTPSSL(mail);
};

const configSMTPSecrets = (mail) => {
  if (!mail.auth.user || !mail.auth.pass) {
    throw new AuthenticationRequiredException('smtp_authentication_required');
  }
};

const configSMTP = (mail) => {
  if (!mail.host || !mail.port) {
    throw new AuthenticationRequiredException('smtp_authentication_required');
  }
};

const configSMTPSSL = (mail) => {
  if (mail.tls && typeof mail.tls.rejectUnauthorized === 'undefined') {
    throw new AuthenticationRequiredException('smtp_authentication_required');
  }
};

const configDbSecrets = (db) => {
  if (!db.username || !db.password) {
    throw new AuthenticationRequiredException('smtp_authentication_required');
  }
};

const configSqlite = (db) => {
  if (!db.database || !db.host || !db.dialect || !db.storage) {
    throw new AuthenticationRequiredException('smtp_authentication_required');
  }
};

const configSqliteWithAuthentication = (db) => {
  configDbSecrets(db);
  configSqlite(db);
};

const configFolders = (folders) => {
  if (!folders.uploadDir || !folders.profileDir) {
    throw new AuthenticationRequiredException('smtp_authentication_required');
  }
};

module.exports = {
  configSMTPWithAuthentication,
  configSMTPWithNoAuth,
  configSqliteWithAuthentication,
  configFolders,
};
