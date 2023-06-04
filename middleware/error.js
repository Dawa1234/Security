const winston = require('winston');

const logger = winston.createLogger({
  level: 'error',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' })
  ]
});

function errorLogger(err, req, res, next) {
  logger.error(err.message, { error: err, timestamp: Date.now() });
  next(err);
}

module.exports = errorLogger;
