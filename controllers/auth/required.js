const userFields = require('../../config/user').fields;

exports.index = (req, res, next) => {
  let requiredUserFields =   JSON.parse(req.client.requiredUserFields);

  requiredUserFields = requiredUserFields.map((field) => {
    return userFields.find(userField => userField.key === field);
  })

  requiredUserFields = requiredUserFields.filter(field => !req.user[field.key]);

  const config = req.client.config ? JSON.parse(req.client.config) : {};
  const configRequiredFields = config && config.requiredFields ? config.requiredFields : {};


  res.render('auth/required-fields', {
    client: req.client,
    clientId: req.client.clientId,
    requiredFields: requiredUserFields,
    info: configRequiredFields.info,
    description: configRequiredFields.description,
    title: configRequiredFields.title,
    buttonText: configRequiredFields.buttonText
  });
}

exports.post = (req, res, next) => {
  const clientRequiredUserFields = JSON.parse(req.client.requiredUserFields);

  clientRequiredUserFields.forEach((field) => {
    if (field === 'email' && !!req.user.email)  {
      //break;
    } else if (req.body[field]) {
      req.userModel.set(field, req.body[field]);
    }
  });

  req.userModel
    .save()
    .then(() => {
      const authorizeUrl = `/dialog/authorize?redirect_uri=${req.client.redirectUrl}&response_type=code&client_id=${req.client.clientId}&scope=offline`;
      res.redirect(authorizeUrl);
    })
    .catch((err) => {
      next(err);
    });
}
