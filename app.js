const express = require('express');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');

const AppError = require('./utils/appError');
const globalErrorHandler = require('./controllers/errorController');
const tourRouter = require('./routes/tourRoutes');
const userRouter = require('./routes/userRoutes');

const app = express();

// 1) security MIDDLEWARES
app.use(helmet()); // set Security HTTP headers

// if (process.env.NODE_ENV === 'development') {
//   app.use(morgan('dev'));
// }

const limiter = rateLimit({
  max: 50,
  windowMs: 3600 * 1000, // cant access after 1 hour
  message: 'Too many request from this IP, please try after 1 hour'
});
app.use('/api', limiter);

app.use(mongoSanitize()); //NoSQL injection
app.use(xss()); //Cross-Site Scripting
app.use(
  //Http parameter polution
  hpp({
    whitelist: [
      'duration',
      'ratingsAverage',
      'ratingsQuantity',
      'difficulty',
      'price',
      'maxGroupSize'
    ]
  })
);

// 2) data transfer middleware
app.use(express.json({ limit: '10kb' }));
// app.use(express.static(`${__dirname}/public`));

app.use((req, res, next) => {
  req.requestTime = new Date().toISOString();
  next();
});

// 3) ROUTES
app.use('/api/v1/tours', tourRouter);
app.use('/api/v1/users', userRouter);

app.all('*', (req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

app.use(globalErrorHandler);

module.exports = app;
