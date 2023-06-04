const mongoose = require('mongoose');
const crypto = require('crypto');
const { v1: uuidv1 } = require('uuid');
const uaParser = require('ua-parser-js');
const uaDevice = require('ua-device');
const { encryptField, decryptField } = require('../helpers/encryption');

const browserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  version: {
    type: String,
    required: true,
  },
});

const deviceSchema = new mongoose.Schema({
  deviceID: {
    type: String,
    required: true,
  },
  deviceName: {
    type: String,
    required: true,
  },
  lastLogin: {
    type: Date,
    default: Date.now,
  },
  browser: browserSchema,
});

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      trim: true,
      required: true,
      set: encryptField,
      get: decryptField,
    },
    email: {
      type: String,
      trim: true,
      required: true,
      unique: true,
      set: encryptField,
      get: decryptField,
    },
    hashed_password: {
      type: String,
      required: true,
    },
    about: {
      type: String,
      trim: true,
      set: encryptField,
      get: decryptField,
    },
    salt: String,
    role: {
      type: Number,
      default: 0,
    },
    history: {
      type: Array,
      default: [],
    },
    devices: [deviceSchema],
    failedLoginAttempts: {
      type: Number,
      default: 0,
    },
    lockUntil: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);


module.exports = mongoose.model('User', userSchema);