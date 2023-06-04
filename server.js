const express = require('express');
const mongoose = require('mongoose');
const morgan = require('morgan');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const path = require('path');
const expressValidator = require('express-validator');
const winston = require('winston');
require('dotenv').config();
const logAction = require('./middleware/logaction');

const errorLogger = require('./middleware/error');

// import routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/user');
const categoryRoutes = require('./routes/category');
const productRoutes = require('./routes/product');
const orderRoutes = require('./routes/order');

// app
const app = express();

// db connection
const connectDB = async () => {
  try {
    await mongoose.connect(
      "mongodb://127.0.0.1:27017/e-commerce",
      {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        useCreateIndex: true,
        useFindAndModify: false,
      }
    );
    console.log('MongoDB Connected');
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
};
connectDB();

// create a write stream (in append mode)
var accessLogStream = winston.createLogger({
  transports: [
    new winston.transports.File({ filename: 'access.log' })
  ]
});

// setup the logger 
app.use(morgan('combined', { stream: { write: (message) => accessLogStream.info(message.trim()) } }));

// middlewares

app.use(express.json());
app.use(bodyParser.json());
app.use(cookieParser());
app.use(expressValidator());
app.use(cors());
app.use(morgan('dev'));

// routes middleware
app.use('/api', authRoutes);
app.use('/api', userRoutes);
app.use('/api', categoryRoutes);
app.use('/api', productRoutes);
app.use('/api', orderRoutes);

app.use(errorLogger);


const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
