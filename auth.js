'use strict';

const db                                   = require('./db');
const passport                             = require('passport');
const { Strategy: LocalStrategy }          = require('passport-local');
const { BasicStrategy }                    = require('passport-http');
const { Strategy: ClientPasswordStrategy } = require('passport-oauth2-client-password');
const { Strategy: BearerStrategy }         = require('passport-http-bearer');
const { Strategy: AuthTokenStrategy }      = require('passport-auth-token');
const validate                             = require('./validate');
const User                                 = require('./models').User;
const Client                               = require('./models').Client;
const LoginToken                           = require('./models').LoginToken;

const  UrlStrategy = require('./url-strategy');


/**
 * LocalStrategy
 *
 * This strategy is used to authenticate users based on a username and password.
 * Anytime a request is made to authorize an application, we must ensure that
 * a user is logged in before asking them to approve the request.
 */
passport.use(new LocalStrategy(
  {usernameField: 'email'},
  (email, password, done) => {
    User
      .where({email: email})
      .fetch()
      .then((user) => {
        user = user.serialize();
        return validate.user(user, password)
      })
      .then(user => done(null, user))
      .catch((error) => {
         return done(null, false, { message: 'Onjuiste inlog.' });
      });
}));


passport.use(new UrlStrategy({
    failRedirect : "/login-with-email-url",
    varName : "token"
  }, function (token, done) { // put your check logic here
    new LoginToken({token: token})
    /*.query((q) => {
      /**
       * Only select tokens that are younger then 2 days
       * created_at is "bigger then" 48 hours ago
       */
       /*
      const days = 2;
      const msForADay = 86400000;
      const timeAgo = new Date(date.setTime(date.getTime() + (days * msForADay)));
      q.where('createdAt', '>=', timeAgo);
      q.orderBy('createdAt', 'DESC');
    }) */
    .fetch()
    .then((token) => {
      if (token) {
        new User({id: token.get('userId')})
          .fetch()
          .then((user) => {
            /*return done(null, {
            //  userModel: user,
              user: user.serialize()
            });*/
            return user.serialize();
          })
          .then(user => done(null, user))
          .catch((err) => {
            next(err);
          });
      } else {
        done("Token not found");
      }
    });
}));


/**
 * BasicStrategy & ClientPasswordStrategy
 *
 * These strategies are used to authenticate registered OAuth clients.  They are
 * employed to protect the `token` endpoint, which consumers use to obtain
 * access tokens.  The OAuth 2.0 specification suggests that clients use the
 * HTTP Basic scheme to authenticate.  Use of the client password strategy
 * allows clients to send the same credentials in the request body (as opposed
 * to the `Authorization` header).  While this approach is not recommended by
 * the specification, in practice it is quite common.
 */

passport.use(new BasicStrategy((clientId, clientSecret, done) => {
  Client
    .where({clientId: clientId})
    .fetch()
    .then(client => validate.client(client.serialize(), clientSecret))
    .then(client => done(null, client))
    .catch(() => done(null, false));
}));

/**
 * Client Password strategy
 *
 * The OAuth 2.0 client password authentication strategy authenticates clients
 * using a client ID and client secret. The strategy requires a verify callback,
 * which accepts those credentials and calls done providing a client.
 */
passport.use(new ClientPasswordStrategy((clientId, clientSecret, done) => {
  Client
    .where({clientId: clientId})
    .fetch()
    .then(client => validate.client(client.serialize(), clientSecret))
    .then(client => done(null, client))
    .catch(() => done(null, false));
}));

/**
 * BearerStrategy
 *
 * This strategy is used to authenticate either users or clients based on an access token
 * (aka a bearer token).  If a user, they must have previously authorized a client
 * application, which is issued an access token to make requests on behalf of
 * the authorizing user.
 *
 * To keep this example simple, restricted scopes are not implemented, and this is just for
 * illustrative purposes
 */
passport.use(new BearerStrategy((accessToken, done) => {
  db.accessTokens.find(accessToken)
    .then(token => validate.token(token, accessToken))
    .then(token => done(null, token, { scope: '*' }))
    .catch(() => done(null, false));
}));

// Register serialialization and deserialization functions.
//
// When a client redirects a user to user authorization endpoint, an
// authorization transaction is initiated.  To complete the transaction, the
// user must authenticate and approve the authorization request.  Because this
// may involve multiple HTTPS request/response exchanges, the transaction is
// stored in the session.
//
// An application must supply serialization functions, which determine how the
// client object is serialized into the session.  Typically this will be a
// simple matter of serializing the client's ID, and deserializing by finding
// the client by ID from the database.

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser((id, done) => {
  User
    .where({id: id})
    .fetch()
    .then(user => done(null, user.serialize()))
    .catch(err => done(err));
});
