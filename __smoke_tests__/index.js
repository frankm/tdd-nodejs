const envs = require('../envs');
const SmokeTest = require('./SmokeTestService');

// API
const nodeEnv = process.env.NODE_ENV;
console.log('smoke env =', nodeEnv);
if (!nodeEnv) {
  throw new Error('NODE_ENV is not set');
}

// DB
const env = envs[nodeEnv];
SmokeTest.mustConfigSqliteWithAuthentication(env.database);

// EMAIL SERVICES
if (env.mail.auth) {
  SmokeTest.mustConfigSMTPWithAuthentication(env.mail);
} else {
  SmokeTest.mustConfigSMTPWithNoAuth(env.mail);
}

// FILE SERVICES
SmokeTest.mustConfigFolders(env.folders);
