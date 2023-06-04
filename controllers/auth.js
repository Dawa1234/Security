const User = require('../models/user');
const jwt = require('jsonwebtoken'); // to generate signed token
const expressJwt = require('express-jwt'); // for auth check
const { errorHandler } = require('../helpers/dbErrorHandler');
const Joi = require('joi');
const PasswordComplexity = require('joi-password-complexity');
const logAction = require("../middleware/logaction");
const { Console } = require('winston/lib/winston/transports');
const { v1: uuidv1 } = require('uuid');
const uaParser = require('ua-parser-js');
const uaDevice = require('ua-device');
const { encryptField, decryptField } = require('../helpers/encryption');



require('dotenv').config();


exports.signup = async (req, res) => {
  const { name, email, password } = req.body;
  console.log('Data received from client:');
  console.log('Name:', name);
  console.log('Email:', email);
  console.log('Password:', password);

  // Check if the password contains the user's name
  if (password.toLowerCase().includes(name.toLowerCase())) {
    return res.status(400).json({
      error: 'Password cannot contain your name',
    });
  }

  // Check for simple passwords
  const simplePasswords = ['password', '12345678', 'qwerty', '123456789', 'admin'];
  if (simplePasswords.includes(password.toLowerCase())) {
    return res.status(400).json({
      error: 'Password is too common or simple',
    });
  }

  const ua = uaParser(req.headers['user-agent']);

  const device = {
    deviceID: uuidv1(),
    deviceName: ua.device.model || 'Unknown Device',
    browser: {
      name: ua.browser.name,
      version: ua.browser.version,
    },
  };

  // Encrypt sensitive fields
  const encryptedName = encryptField(name);
  const encryptedEmail = encryptField(email);
  const encryptedPassword = encryptField(password);

  console.log('Encrypted data:');
  console.log('Encrypted Name:', encryptedName);
  console.log('Encrypted Email:', encryptedEmail);
  console.log('Encrypted Password:', encryptedPassword);
  console.log('Encrypted Device:', device);

  const user = new User({
    name: encryptedName,
    email: encryptedEmail,
    hashed_password: encryptedPassword,
    devices: [device],
  });
  user.save((err, user) => {
    if (err) {
      console.error('Save user error:', err);
      return res.status(400).json({
        error: errorHandler(err),
      });
    }
    // Decrypt sensitive fields before sending response
    user.name = decryptField(user.name);
    user.email = decryptField(user.email);
    user.salt = undefined;
    user.hashed_password = undefined;

    console.log('Decrypted data:');
    console.log('Decrypted Name:', user.name);
    console.log('Decrypted Email:', user.email);

    res.json({ user });
  });
};


// Rest of the code...
const nodemailer = require('nodemailer');
const c = require('config');


const transporter = nodemailer.createTransport({
service : 'gmail',
  auth: {
    user: 'mailsanjog.regmi@gmail.com',
    pass: 'jajquwggpfwrirld',
  },
});



exports.signin = (req, res) => {
  const { email, password } = req.body;
  User.find({}, (err, users) => {
    if (err) {
      console.error('Error retrieving user data from the database:', err);
      return res.status(500).json({
        error: "Error retrieving user data from the database.",
      });
    }

    // Decrypt and check if any user's email matches the client input
    const matchedUser = users.find((user) => {
      const decryptedEmail = decryptField(user.email);
      const decryptedName = decryptField(user.name);

      return decryptedEmail === email;
    });

    if (!matchedUser) {
      console.log("User with that email doesn't exist. Please sign up.");
      return res.status(400).json({
        error: "User with that email doesn't exist. Please sign up.",
      });
    }

    if (matchedUser.lockUntil && matchedUser.lockUntil > Date.now()) {
      const remainingTime = Math.ceil((matchedUser.lockUntil - Date.now()) / (1000 * 60));
      console.log(`Account locked. Please try again after ${remainingTime} minutes or contact for assistance`);
      return res.status(401).json({
        error: `Account locked. Please try again after ${remainingTime} minutes or contact for assistance`,
      });
    }

    const decryptedPassword = decryptField(matchedUser.hashed_password); // Decrypt the password field

    if (decryptedPassword !== password) {
      matchedUser.failedLoginAttempts += 1;

      if (matchedUser.failedLoginAttempts >= 5) {
        matchedUser.lockUntil = Date.now() + 60 * 60 * 1000;
        matchedUser.save((saveError) => {
          if (saveError) {
            console.error('Failed to save user document:', saveError);
            return res.status(500).json({ error: 'Failed to save user document.' });
          }

          const lockoutMailOptions = {
            from: 'mailsanjog.regmi@gmail.com',
            to: email,
            subject: 'Account Lockout',
            text: `Your account has been locked due to multiple failed login attempts. Please contact support for assistance.`,
          };

          transporter.sendMail(lockoutMailOptions, function (error, info) {
            if (error) {
              console.error('Failed to send email:', error);
            } else {
              console.log('Email sent:', info.response);
            }
          });

          console.log("Account locked. Please contact support for assistance.");
          return res.status(401).json({
            error: "Account locked. Please contact support for assistance.",
          });
        });
      } else {
        matchedUser.save((saveError) => {
          if (saveError) {
            console.error('Failed to save user document:', saveError);
            return res.status(500).json({ error: 'Failed to save user document.' });
          }

          const remainingAttempts = 5 - matchedUser.failedLoginAttempts;
          console.log(`Authentication failed. You have ${remainingAttempts} attempts remaining before account lockout.`);
          return res.status(401).json({
            error: `Authentication failed. You have ${remainingAttempts} attempts remaining before account lockout.`,
          });
        });
      }
    } else {
      matchedUser.failedLoginAttempts = 0;
      matchedUser.lockUntil = null;

      const ua = uaParser(req.headers['user-agent']);
      const currentDevice = {
        deviceID: uuidv1(),
        deviceName: ua.device.model || 'Unknown Device',
        browser: {
          name: ua.browser.name,
          version: ua.browser.version,
        },
      };

      const isSameDevice = matchedUser.devices.some((device) => {
        return (
          device.deviceName === currentDevice.deviceName &&
          device.browser.name === currentDevice.browser.name &&
          device.browser.version === currentDevice.browser.version
        );
      });

      if (isSameDevice) {
        console.log('User signed in from the same device.');
        matchedUser.devices.push(currentDevice);

        matchedUser.save((saveError) => {
          if (saveError) {
            console.error('Failed to save user document:', saveError);
            return res.status(500).json({ error: 'Failed to save user document.' });
          }

          const token = jwt.sign({ _id: matchedUser._id }, process.env.JWT_SECRET);
          res.cookie('t', token, { expire: new Date() + 9999 });

          const { _id, role } = matchedUser;
          const decryptedEmail = decryptField(matchedUser.email);
          const decryptName =  decryptField(matchedUser.name);
 
          const name = decryptName;
          const email = decryptedEmail;
          return res.json({ token ,user: { _id, name, email, role, message: 'SameDevice' } });
        });
      } else {
        console.log('User signed in from a new device.');
        matchedUser.devices = [currentDevice];

        matchedUser.save((saveError) => {
          if (saveError) {
            console.error('Failed to save user document:', saveError);
            return res.status(500).json({ error: 'Failed to save user document.' });
          }

          const token = jwt.sign({ _id: matchedUser._id }, process.env.JWT_SECRET);
          res.cookie('t', token, { expire: new Date() + 9999 });
          const { _id, name, role } = matchedUser;
          const mailOptions = {
            from: 'mailsanjog.regmi@gmail.com',
            to: email,
            subject: 'New Device Sign-In Alert',
            text: `You have just signed in from a new device. If this wasn't you, please change your password immediately.`,
          };

          transporter.sendMail(mailOptions, function (error, info) {
            if (error) {
              console.error('Failed to send email:', error);
            } else {
              console.log('Email sent:', info.response);
            }
          });
          const decryptedEmail = decryptField(email);
     
          return res.json({ token, user: { _id,email, name, role, message: 'NewDevice' } });
        });
      }
    }
  });
};


exports.signout = (req, res) => {
  res.clearCookie('t');
  res.json({ message: 'Signout success' });
};

exports.requireSignin = expressJwt({
  secret: process.env.JWT_SECRET,
  // algorithms: ['RS256'],
  userProperty: 'auth',
});

exports.isAuth = (req, res, next) => {
  let user = req.profile && req.auth && req.profile._id == req.auth._id;
  if (!user) {
    return res.status(403).json({
      error: 'Access denied',
    });
  }
  next();
};

exports.isAdmin = (req, res, next) => {
  if (req.profile.role === 0) {
    return res.status(403).json({
      error: 'Admin resource! Access denied',
    });
  }
  next();
};
