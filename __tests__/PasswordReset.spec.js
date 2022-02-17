const request = require('supertest');
const app = require('../src/app');
const en = require('../locales/en/translation.json');
const tr = require('../locales/tr/translation.json');

const passwordResetUrl = '/api/1.0/password-reset';

const postPasswordReset = (email = 'user1@mail.com', options = {}) => {
  const agent = request(app).post(passwordResetUrl);
  if (options.language) {
    agent.set('Accept-Language', options.language);
  }
  return agent.send({ email: email });
};

describe('Password Reset Request', () => {
  it('returns 404, when password reset request is for unknown email', async () => {
    const response = await postPasswordReset();
    expect(response.status).toBe(404);
  });

  it.each`
    language | message
    ${'tr'}  | ${tr.email_invalid}
    ${'en'}  | ${en.email_invalid}
  `(
    'returns 400, validation error, and  $message, when invalid email & language is $language',
    async ({ language, message }) => {
      const response = await postPasswordReset(null, { language: language });
      console.log('body.validationErrors = ', response.body.validationErrors);
      expect(response.body.validationErrors.email).toBe(message);
      expect(response.status).toBe(400);
    }
  );
});
