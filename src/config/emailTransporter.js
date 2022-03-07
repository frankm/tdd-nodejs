const nodemailer = require('nodemailer');
const envs = require('../../envs');

const env = envs[process.env.NODE_ENV];
const mailConfig = env.mail;
const transporter = nodemailer.createTransport({ ...mailConfig });

module.exports = transporter;
