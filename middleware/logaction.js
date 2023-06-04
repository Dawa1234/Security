const winston = require('winston');
const requestIp = require('request-ip');
const uaParser = require('ua-parser-js');

const csvFormat = winston.format.printf(({ level, message, timestamp }) => {
  return `${timestamp},${level},${message}`;
});

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    csvFormat
  ),
  transports: [
    new winston.transports.File({ filename: 'logfile.csv' })
  ]
});

function logAction(action) {
  return async function(req, res, next) {
    const ua = uaParser(req.headers['user-agent']);
    const device = `${ua.browser.name} ${ua.browser.version} on ${ua.os.name} ${ua.os.version}`;
    const ip = requestIp.getClientIp(req);

    const logEntry = `${action},${req.user ? req.user.email : 'unknown'},${device},${ip}`;
    logger.info(logEntry);

    try {
      await next();
    } catch (error) {
      // Log the error
      logger.error(`${action},ERROR,${error.message},${device},${ip}`);
      next(error);
    }
  }
}

module.exports = logAction;
