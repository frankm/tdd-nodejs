const AuthenticationRequiredException = require('../src/error/AuthenticationRequiredException');

const mustConfigSMTPWithAuthentication = (mail) => {
  configSMTP(mail);
  configSMTPSecrets(mail);
};

const mustConfigSMTPWithNoAuth = (mail) => {
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

const mustConfigSqliteWithAuthentication = (db) => {
  configDbSecrets(db);
  configSqlite(db);
};

const mustConfigFolders = (folders) => {
  if (!folders.uploadDir || !folders.profileDir) {
    throw new AuthenticationRequiredException('smtp_authentication_required');
  }
};

module.exports = {
  mustConfigSMTPWithAuthentication,
  mustConfigSMTPWithNoAuth,
  mustConfigSqliteWithAuthentication,
  mustConfigFolders,
};
