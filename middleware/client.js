const Client = require('../models').Client;
const UniqueCode = require('../models').UniqueCode;
const AccessToken = require('../models').AccessToken;

const hat = require('hat');
const userFields = require('../config/user').fields;
const authTypes = require('../config/auth').types;
const privilegedRoles =  require('../config/roles').privilegedRoles;
const authTypesConfig = require('../config').authTypes
const defaultRole =  require('../config/roles').defaultRole;
const getClientIdFromRequest = require('../utils/getClientIdFromRequest');

exports.withAll = (req, res, next) => {
  Client
    .fetchAll()
    .then((clients) => {
       req.clientsCollection = clients;
       req.clients = clients.serialize();
       next();
    })
    .catch((err) => { next(err); });
}

exports.withOne = (req, res, next) => {
  let clientId = getClientIdFromRequest(req);
  
  if (!clientId) {
    clientId = req.query.client_id;
  }

  if (!clientId) {
    clientId = req.params.clientId;
  }

  if (clientId) {
    new Client({ clientId: clientId })
    .fetch()
    .then((client) => {
      if (client) {
        req.clientModel = client;
        req.client = client.serialize();

        const clientConfig = JSON.parse(req.client.config);
        const clientConfigStyling = clientConfig.styling ?  clientConfig.styling : {};

        res.locals.clientProjectUrl = clientConfig.projectUrl;
        res.locals.clientEmail = clientConfig.contactEmail;
        res.locals.clientDisclaimerUrl = clientConfig.clientDisclaimerUrl;
        res.locals.clientStylesheets = clientConfig.clientStylesheets;

        //if logo isset in config overwrite the .env logo
        if (clientConfigStyling && clientConfigStyling.logo) {
          res.locals.logo = clientConfigStyling.logo;
        }
        
        if (clientConfigStyling && clientConfigStyling.favicon) {
          res.locals.favicon = clientConfigStyling.favicon;
        }

        if (clientConfigStyling && clientConfigStyling.inlineCSS) {
          res.locals.inlineCSS = clientConfigStyling.inlineCSS;
        }

        if (clientConfig.displayClientName || (clientConfig.displayClientName === 'undefined' && process.env.DISPLAY_CLIENT_NAME=== 'yes')) {
          res.locals.displayClientName = true;
        }

        req.client.authTypes            = JSON.parse(req.client.authTypes);
        req.client.exposedUserFields    = JSON.parse(req.client.exposedUserFields);
        req.client.requiredUserFields   = JSON.parse(req.client.requiredUserFields);
        req.client.config               = JSON.parse(req.client.config);
        req.client.allowedDomains       = JSON.parse(req.client.allowedDomains);
        req.client.twoFactorRoles       = JSON.parse(req.client.twoFactorRoles);

        next();
      } else {
        throw new Error('No Client found for clientID', clientId, req.body);
      }
    })
    .catch((err) => { next(err); });
  } else {
    throw new Error('No Client ID is set for login');
  }
}


exports.withOneById = (req, res, next) => {
  const clientId = req.params.clientId;

  if (clientId) {
    new Client({ id: clientId })
    .fetch()
    .then((client) => {
      if (client) {
        req.clientModel = client;
        req.client = client.serialize();
        next();
      } else {
        throw new Error('No Client found for clientID', clientId);
      }
    })
    .catch((err) => { next(err); });
  } else {
    throw new Error('No Client ID is set for login');
/*
    next({
      name: 'ClientNotFoundError',
      status: 404,
      message:
    });
*/
  }
}

/**
 * Add the login option
 */
exports.setAuthType = (authType) => {
  return (req, res, next) => {
    req.authType = authType;
    next();
  }
}

exports.validate = (req, res, next) => {
  let authTypes = req.clientModel.getAuthTypes(req.clientModel);

  // only /admin in the end should work
  if (req.params.priviligedRoute &&  req.params.priviligedRoute !== 'admin') {
    throw new Error('Priviliged route is not properly set');
  }

  const allowedType = authTypes && authTypes.length > 0 ? authTypes.find(option => option.key === req.authType) : false;

  const isPriviligedRoute = req.params.priviligedRoute === 'admin';

  /**
   * Check if any login options are defined for the client, otherwise error!
   */
  if ( !authTypes) {
    throw new Error('No auth types selected');
  }

  /**
   * Check if auth type is allowed for client
   * This is only for cosmetics, the safe checks are done in the handling
   */
  if (!isPriviligedRoute && !allowedType && req.method === 'GET') {
    throw new Error('Auth types not allowed');
  }

  next();
}

exports.checkIfEmailRequired =  (req, res, next) => {
      const requiredFields = req.client.requiredUserFields;
      const authTypes = req.client.authTypes;

      // the Local & email
      const emailAuthTypesEnabled = authTypes.indexOf('Url') !== -1 ||authTypes.indexOf('Local') !== -1;
      const emailRequired = requiredFields.indexOf('email') !== -1;
      const fullUrl = req.protocol + '://' + req.get('host') + req.originalUrl;

      // if UniqueCode isset
      if (emailRequired && !req.user.email) {
        if (emailAuthTypesEnabled) {
          req.emailRequiredForAuth = true;
          res.redirect(`/login?clientId=${req.client.clientId}&redirect_uri=${encodeURIComponent(req.query.redirect_uri)}`);
        } else {
          throw new Error('E-mail is required but no auth type enabled that is able to validate it properly');
        }
      } else {
        next();
      }
}


// this is an extra check to make sure a users has authenticated with an access token
// otherwise a user can access with another acces token
// not mega disaster since role is still checked
// but this is mainly an issue when members on one site can login with email
// yet on another site sms is required
// we still have checks to ensure that, but this is an extra security check on that
// in future it would be great to add something like "user requirements" to  a site
exports.checkIfAccessTokenBelongToCurrentClient =  async (req, res, next) => {
  return next();
  /*
  //+ req.client.id
 new AccessToken({ clientID: req.client.id , userID: req.user.id })
   .fetch()
   .then((accessToken) => {
     if (accessToken.get('id')) {
       next();
     } else {
       throw Error('No Access token issued for this client, req.client.id: ' + req.client.id +  ' user id: ' + req.user.id)
     }
   })
   .catch((e) => {
     next(e);
   });*/
}


exports.checkUniqueCodeAuth = (errorCallback) => {
  //validate code auth type
  return (req, res, next) => {
    const authTypes = req.client.authTypes;

      // if UniqueCode authentication is used, other methods are blocked to enforce users can never authorize with email
      if (authTypes.indexOf('UniqueCode') !== -1) {
        new UniqueCode({ clientId: req.client.id, userId: req.user.id })
        .fetch()
        .then((codeResponse) => {
          const userHasPrivilegedRole = privilegedRoles.indexOf(req.user.role) > -1;

          // if uniquecode exists or user has priviliged role
          if (codeResponse || userHasPrivilegedRole) {
            next();
          } else {
            throw new Error('Not validated with Unique Code');
          }
        })
        .catch((error) => {
          console.log('error',error);

          if (errorCallback) {
            try {
              errorCallback(req, res, next);
            } catch (err) {
              next(err)
            }
          } else {
            next(error);
          }
        });

      } else {
        next();
      }
    }
}



exports.checkPhonenumberAuth = (errorCallback) => {
  //validate code auth type
  return (req, res, next) => {
    const authTypes = req.client.authTypes;

    // if UniqueCode authentication is used, other methods are blocked to enforce users can never authorize with email
    if (authTypes.indexOf('Phonenumber') !== -1) {
      const userHasPrivilegedRole = privilegedRoles.indexOf(req.user.role) > -1;

      // if phonenumber is validated or user has priviliged role
      // we check for this method if a phone number is validated
      // this could theoretically mean a user connects an email to their account
      // and is able to use session login with e-mail from other client to this client
      // (this is done by going directly to the authorize url, the user then has an active session, and as long as that role isset the user is logged in)
      // currently all checks are done on requirements of a user: "email exists", "unique code is connected" "phoneNumber is confirmed" etc.
      // but this is acceptable in current use cas

      if (req.user.phoneNumberConfirmed || userHasPrivilegedRole ) {
        next();
      } else {
        throw new Error('Not validated with Phone number');
      }

    } else {
      next();
    }
  }
}

/**
 * Check if 2FA is required and for what roles
 */
exports.check2FA = (req, res, next) => {
  const twoFactorRoles =  req.client.twoFactorRoles;

  // if no role is present, assume default role
  const userRole = req.user.role ? req.user.role : defaultRole;

  /**
   * In case no 2factor roles are defined all is good and check is passed
   */
  if (!twoFactorRoles) {
    return next();
  }

  /**
   * In case 2factor roles are defined but the user doesn't fall into the role, all is good and check is passed
   * This is because in most cases only moderators, admin etc. are asked for 2fa, normal users not
   * So opposite of most security practices 2FA is trickle up instead of trickle down
   */
  if (twoFactorRoles && !twoFactorRoles.includes(userRole)) {
    return next();
  }

  // check two factor is validated otherwise send to 2factor screen
  if (twoFactorRoles && twoFactorRoles.includes(userRole) && req.session.twoFactorValid) {
    return next();
  } else if (twoFactorRoles && twoFactorRoles.includes(userRole) && !req.session.twoFactorValid) {
    return res.redirect(`/auth/two-factor?clientId=${req.client.clientId}&redirect_uri=${encodeURIComponent(req.query.redirect_uri)}`);
  }


  try {
    throw new Error(`Two factor authentication not handled properly for client with ID: ${req.client.id} but not turned on for user with ID: ${req.user.id}`)
  } catch (err) {
    next(err)
  }
}


/**
 * Check if required fields is set
 */
exports.checkRequiredUserFields = (req, res, next) => {
  const requiredFields = req.client.requiredUserFields;
  const user = req.user;
  let error;

  if (requiredFields) {
    requiredFields.forEach((field) => {
      // if at least one required field is empty, set to error
      error = error || !req.user[field];
    });
  }

  // if error redirect to register
  if (error) {
    res.redirect(`/auth/required-fields?clientId=${req.client.clientId}&redirect_uri=${encodeURIComponent(req.query.redirect_uri)}`);
  } else {
    next();
  }
}

exports.create =  (req, res, next) => {
  const { name, description, exposedUserFields, requiredUserFields, siteUrl, redirectUrl, authTypes, config, allowedDomains, twoFactorRoles } = req.body;
  const rack = hat.rack();
  const clientId = rack();
  const clientSecret = rack();

  const values = { name, description, exposedUserFields, requiredUserFields, siteUrl, redirectUrl, authTypes, clientId, clientSecret, allowedDomains, config, twoFactorRoles};

  values.exposedUserFields = JSON.stringify(values.exposedUserFields);
  values.requiredUserFields = JSON.stringify(values.requiredUserFields);
  values.authTypes = JSON.stringify(values.authTypes);
  values.config = JSON.stringify(values.config);
  values.allowedDomains = JSON.stringify(values.allowedDomains);
  values.twoFactorRoles = JSON.stringify(values.twoFactorRoles);


  new Client(values)
    .save()
    .then((client) => {
      req.clientModel = client;
      req.client = client.serialize();
      next();
    })
    .catch((err) => { next(err); });
}

exports.update = (req, res, next) => {
  const { name, description, exposedUserFields, requiredUserFields, redirectUrl, siteUrl, authTypes, config, allowedDomains, twoFactorRoles } = req.body;

  req.clientModel.set('name', name);
  req.clientModel.set('description', description);
  req.clientModel.set('siteUrl', siteUrl);
  req.clientModel.set('redirectUrl', redirectUrl);
  req.clientModel.set('exposedUserFields', JSON.stringify(exposedUserFields));
  req.clientModel.set('requiredUserFields', JSON.stringify(requiredUserFields));
  req.clientModel.set('authTypes', JSON.stringify(authTypes));
  req.clientModel.set('config', JSON.stringify(config));
  req.clientModel.set('allowedDomains', JSON.stringify(allowedDomains));
  req.clientModel.set('twoFactorRoles', JSON.stringify(twoFactorRoles));

  req.clientModel
    .save()
    .then((client) => {
      next();
    })
    .catch((err) => {
      console.log('update err', err);
      next(err);
    })
}



exports.deleteOne = (req, res, next) => {
  req.clientModel
    .destroy()
    .then((response) => {
      next();
    })
    .catch((err) => { next(err); })
}
