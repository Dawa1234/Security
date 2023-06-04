const crypto = require('crypto');

// Encryption function
exports.encryptField = function encryptField(value) {
  if (!value) return value;
  const key = crypto.scryptSync("hello", 'salt', 32);
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  let encryptedValue = cipher.update(value, 'utf8', 'hex');
  encryptedValue += cipher.final('hex');
  return iv.toString('hex') + encryptedValue;
};

// Decryption function
exports.decryptField = function decryptField(value) {
    if (!value) return value;
    try {
      const key = crypto.scryptSync("hello", 'salt', 32);
      const iv = Buffer.from(value.slice(0, 32), 'hex');
      const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
      let decryptedValue = decipher.update(value.slice(32), 'hex', 'utf8');
      decryptedValue += decipher.final('utf8');
      return decryptedValue;
    } catch (error) {
      console.error('Decryption error:', error);
      return 'Decryption failed';
    }
  };
  