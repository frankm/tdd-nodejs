module.exports = function AuthenticationRequiredException(message) {
  this.status = 530;
  this.message = message;
};
