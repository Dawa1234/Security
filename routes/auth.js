const express = require('express');
const { body, validationResult } = require('express-validator');

const app = express();

// Middleware configuration
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const router = express.Router();
const logAction = require('../middleware/logaction');


const {
  signup,
  signin,
  signout,
  requireSignin,
} = require('../controllers/auth');
const { userSignupValidator } = require('../validator');

router.post('/signup',logAction("SignUp attempt"), userSignupValidator, signup);
router.post('/signin',logAction("SignIN Attempt"), signin);
router.get('/signout', signout);

module.exports = router;
