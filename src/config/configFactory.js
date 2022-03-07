const dotenv = require('dotenv');
const { get } = require('env-var');
const logger = require('../shared/logger');

const priority = `.env.${process.env.NODE_ENV}.local`;
const shared = `.env.${process.env.NODE_ENV}`;

if (process.env.NODE_ENV === 'development') {
  logger.info(`shared file = ${shared}`);
  logger.info(`priority file = ${priority}\n`);
}

// priority is read first
dotenv.config({ path: priority });
dotenv.config({ path: shared });

const authMail = {
  host: get('MAIL_HOST').asString(),
  port: get('MAIL_PORT').asPortNumber(),
  auth: {
    user: get('MAIL_USER').asString(),
    pass: get('MAIL_PASS').asString(),
  },
};
const randomPort = Math.floor(Math.random() * 2000) + 10000;
const ignoreCertMail = {
  host: get('MAIL_HOST').asString(),
  port: get('MAIL_PORT').default(randomPort).asPortNumber(),
  tls: {
    rejectUnauthorized: get('REJECT_UNAUTHORIZED').asBoolStrict(),
  },
};

const appConfig = {
  db: {
    database: get('DATABASE').asString(),
    username: get('DB_USERNAME').asString(),
    password: get('DB_PASSWORD').asString(),
    host: get('DB_HOST').asString(),
    dialect: get('DB_DIALECT').asString(),
    storage: get('DB_STORAGE').asString(),
    logging: get('DB_LOGGING').default('false').asBoolStrict(),
  },
  authMail,
  ignoreCertMail,
  folders: {
    uploadDir: get('UPLOAD_DIR').asString(),
    profileDir: get('PROFILE_DIR').asString(),
  },
};

module.exports = appConfig;
