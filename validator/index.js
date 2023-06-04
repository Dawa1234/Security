const Joi = require('joi');

exports.userSignupValidator = (req, res, next) => {
  const schema = Joi.object({
    name: Joi.string().required().label('Name'),
    email: Joi.string()
      .email({ minDomainSegments: 2 })
      .min(4)
      .max(32)
      .required()
      .label('Email'),
    password: Joi.string()
      .min(8)
      .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^a-zA-Z\d]).{8,}$/)
      .required()
      .label('Password')
      .messages({
        'string.pattern.base':
          'Password must contain at least 8 characters including one lowercase letter, one uppercase letter, one digit, and one special character.',
      }),
  });

  const { error, value } = schema.validate(req.body, { abortEarly: false });
  if (error) {
    const errorMessages = error.details.map((detail) => detail.message);
    return res.status(400).json({ error: errorMessages });
  }

  next();
};
