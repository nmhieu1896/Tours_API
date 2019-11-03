const crypto = require('crypto');
const jwt = require('jsonwebtoken');
// const { promisify } = require('util');
const User = require('../models/userModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const sendEmail = require('../utils/email');

const tokenSign = id =>
  jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN
  });

const sendToken = (user, statusCode, res) => {
  const token = tokenSign(user._id);

  const cookieConfig = {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 86400 * 1000
    ),
    httpOnly: true //only http request can access and update cookie
  };
  if (process.env.NODE_ENV === 'production') cookieConfig.secure = true; //must use Https
  res.cookie('jwt', token, cookieConfig);

  user.password = undefined;

  res.status(statusCode).json({
    status: 'success',
    token,
    data: {
      user: user
    }
  });
};

exports.signup = catchAsync(async (req, res, next) => {
  // const newUser = await User.create({
  //   name: req.body.name,
  //   email: req.body.email,
  //   password: req.body.password,
  //   passwordConfirm: req.body.passwordConfirm,
  //   role: req.body.role,
  //   passwordChangedAt: req.body.passwordChangedAt
  // }); // Dont allow user sign up as admin role
  const newUser = await User.create(req.body);
  sendToken(newUser, 201, res);
});

exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return next(new AppError('Email or Password is not valid', 400));
  }

  // Check correct Account
  const user = await User.findOne({ email: email }).select('+password');

  if (!user || !(await user.correctPassword(password, user.password))) {
    return next(new AppError('Incorrect Email or Password', 401));
  }

  sendToken(user, 200, res);
});

exports.protect = catchAsync(async (req, res, next) => {
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return next(
      new AppError('You are not Logged in! Please login to get access', 401)
    );
  }
  // Veryfy token
  // const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);
  const decoded = jwt.verify(token, process.env.JWT_SECRET);

  // Check if user still exist
  const currentUser = await User.findById(decoded.id);
  if (!currentUser) {
    return next(new AppError("User's token does not exist!", 401));
  }

  // Check if password has changed
  const passwordHasChanged = currentUser.passwordChangedAfter(decoded.iat);
  if (passwordHasChanged) {
    return next(new AppError('Password has Changed recently', 401));
  }

  req.user = currentUser;
  next();
});

exports.restrictTo = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    return next(new AppError('You dont have permission to do this', 403));
  }
  next();
};

exports.forgotPassword = catchAsync(async (req, res, next) => {
  const user = await User.findOne({ email: req.body.email });
  if (!user) {
    return next(new AppError("Email doesn't exist", 404));
  }

  const resetToken = user.createPasswordResetToken();
  // console.log({ resetToken });
  await user.save({ validateBeforeSave: false });

  const resetURL = `${req.protocol}://${req.get(
    'host'
  )}/api/v1/users/resetPassword/${resetToken}`;

  const message =
    'Forgot your password? Submit a patch request with your new password(confirm) to:' +
    `\n${resetURL}\nIf your didn't forget your password, please ignore this email`;

  try {
    await sendEmail({
      email: user.email,
      subject: 'Your password Reset token (15mins)',
      message
    });

    res.status(200).json({
      status: 'success',
      message: 'Token is sent to mail!'
    });
  } catch (err) {
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save({ validateBeforeSave: false });

    return next(new AppError('There was error while sending email', 500));
  }
});

exports.resetPassword = catchAsync(async (req, res, next) => {
  // 1: get user based on token
  const hashedToken = crypto
    .createHash('sha256')
    .update(req.params.token)
    .digest('hex');

  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() }
  });

  // 2: token expired? && user  => set password
  if (!user) {
    return next(new AppError('Token is invalid or has expired', 400));
  }
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;

  await user.save();

  // 3: Log in, send JWT
  sendToken(user, 200, res);
});

exports.updatePassword = catchAsync(async (req, res, next) => {
  // 1: get user and validate
  const { password, newPassword, passwordConfirm } = req.body;
  const user = await User.findById(req.user._id).select('+password');

  if (!(await user.correctPassword(password, user.password))) {
    return next(new AppError('Password is wrong', 401));
  }
  if (await user.correctPassword(newPassword, user.password)) {
    return next(
      new AppError('New Password must be different from the old one', 401)
    );
  }

  // 2: update passworđ
  user.password = newPassword;
  user.passwordConfirm = passwordConfirm;
  await user.save();

  // 3: log in, send JWT
  sendToken(user, 200, res);
});
