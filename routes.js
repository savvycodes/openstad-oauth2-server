const login                    = require('connect-ensure-login');
const oauth2Controller         = require('./controllers/oauth2');
const tokenController          = require('./controllers/token');
const authController           = require('./controllers/auth');
const userController           = require('./controllers/user');
const adminUserController      = require('./controllers/adminUser');
const adminClientController    = require('./controllers/adminClient');
const adminMiddleware          = require('./middleware/admin');
const clientMiddleware         = require('./middleware/client');
const userMiddleware           = require('./middleware/user');
const tokenMw                  = require('./middleware/token');
//login.ensureLoggedIn();


module.exports = function(app){
  app.get('/', authController.index);
  app.get('/login', authController.login);
  app.get('/login-with-email-url', authController.registerOrLoginWithEmailUrl);
  app.post('/login-with-email-url', authController.postLoginOrRegisterWithEmailUrl);

  app.get('/register', authController.register);
  app.get('/forgot', authController.forgot);
  app.get('/reset', authController.reset);

  app.get('/logout', authController.logout);
  app.get('/account', login.ensureLoggedIn(), userController.account);
  app.post('/account', login.ensureLoggedIn(), userMiddleware.validateUser, userController.postAccount);
  app.post('/password', login.ensureLoggedIn(), userMiddleware.validatePassword, userController.postAccount);

  app.post('/register-token', tokenMw.addUser, auth.completeRegistration);

  app.post('/login', authController.postLogin);
  app.post('/register', userMiddleware.validateUser, authController.postRegister);
  app.post('/forgot', authController.postForgot);
  app.post('/reset', authController.postReset);

  app.get('/dialog/authorize', oauth2Controller.authorization);
  app.post('/dialog/authorize/decision', oauth2Controller.decision);
  app.post('/oauth/token', oauth2Controller.token);
  app.get('/oauth/token', oauth2Controller.token);

  app.get('/api/userinfo', userController.info);
  // app.get('/api/clientinfo', client.info);

  // Mimicking google's token info endpoint from
  // https://developers.google.com/accounts/docs/OAuth2UserAgent#validatetoken
  app.get('/api/tokeninfo', tokenController.info);

  // Mimicking google's token revoke endpoint from
  // https://developers.google.com/identity/protocols/OAuth2WebServer
  app.get('/api/revoke', tokenController.revoke);

  /**
   * Admin user routes
   */
  app.get('/admin/users', adminMiddleware.ensure, userMiddleware.withAll, adminUserController.all);
  app.get('/admin/user/:userId', adminMiddleware.ensure, userMiddleware.withOne, adminUserController.edit);
  app.get('/admin/user', adminMiddleware.ensure, adminUserController.new);
  app.post('/admin/user', adminMiddleware.ensure, adminUserController.create);
  app.post('/admin/user/:userId', adminMiddleware.ensure, userMiddleware.withOne, adminUserController.update);

  /**
   * Admin client routes
   */
  app.get('/admin/clients', adminMiddleware.ensure, clientMiddleware.withAll, adminClientController.all);
  app.get('/admin/client/:clientId', adminMiddleware.ensure, clientMiddleware.withOne, adminClientController.edit);
  app.get('/admin/client', adminMiddleware.ensure, adminClientController.new);
  app.post('/admin/client', adminMiddleware.ensure, adminClientController.create);
  app.post('/admin/client/:clientId', adminMiddleware.ensure, clientMiddleware.withOne, adminClientController.update);
}