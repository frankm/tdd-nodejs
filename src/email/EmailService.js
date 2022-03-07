const nodemailer = require('nodemailer');
const transporter = require('../config/emailTransporter');
const logger = require('../shared/logger');
const AuthenticationRequiredException = require('../error/AuthenticationRequiredException');

const sendAccountActivation = async (email, token) => {
  const info = await transporter.sendMail({
    from: 'My App <info@my-app.com>',
    to: email,
    subject: 'Account Activation',
    html: `
    <div>
    <b>Please click below link to activate your account</b>
    </div>
    <div>
      <a href="http://localhost:8080/#/login?token=${token}">Activate</a>
    </div>
    `,
  });
  logger.info('url: ' + nodemailer.getTestMessageUrl(info));
};

const sendPasswordReset = async (email, token) => {
  const info = await transporter.sendMail({
    from: 'My App <info@my-app.com>',
    to: email,
    subject: 'Password Reset',
    html: `
    <div>
    <b>Please click below link to reset your password</b>
    </div>
    <div>
      <a href="http://localhost:8080/#/password-reset?reset=${token}">Reset</a>
    </div>
    `,
  });

  logger.info('url: ' + nodemailer.getTestMessageUrl(info));
};

const sendSMTPConnectivity = async (email) => {
  const info = await transporter.sendMail({
    from: 'My App <info@my-app.com>',
    to: email,
    subject: 'SMTP Connectivity Confirmation',
    html: `
    <div>
    <b>Email server is configured correctly.</b>
    </div>
    <div>
      <a href="http://localhost:8080/#/login">Login</a>
    </div>
    `,
  });
  logger.info('url: ' + nodemailer.getTestMessageUrl(info));
};

const mustSMTPAuthenticate = (mail) => {
  mustConfigSMTPWithNoAuth(mail);
  if (!mail.auth.user || !mail.auth.pass) {
    throw new AuthenticationRequiredException('smtp_authentication_required');
  }
};

const mustConfigSMTPWithNoAuth = (mail) => {
  if (!mail.host || !mail.port) {
    throw new AuthenticationRequiredException('smtp_authentication_required');
  }
};

module.exports = {
  sendAccountActivation,
  sendPasswordReset,
  sendSMTPConnectivity,
  mustSMTPAuthenticate,
  mustConfigSMTPWithNoAuth,
};
