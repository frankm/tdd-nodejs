const envs = require('../envs');
const SmokeTest = require('./SmokeTestService');

// API
const nodeEnv = process.env.NODE_ENV;
if (!nodeEnv) {
  throw new Error('NODE_ENV is not set');
}

// DB
const env = envs[nodeEnv];
SmokeTest.configSqliteWithAuthentication(env.database);

// EMAIL SERVICES
if (env.mail.auth) {
  SmokeTest.configSMTPWithAuthentication(env.mail);
} else {
  SmokeTest.configSMTPWithNoAuth(env.mail);
}

// FILE SERVICES
SmokeTest.configFolders(env.folders);
