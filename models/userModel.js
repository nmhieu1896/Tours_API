const crypto = require('crypto');
const mongoose = require('mongoose');
const validator = require('validator');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    trim: true,
    required: [true, 'User must have a Name']
  },
  role: {
    type: String,
    enum: ['user', 'tourGuide', 'admin'],
    default: 'user'
  },
  email: {
    type: String,
    required: [true, 'User must have an Email'],
    unique: true,
    lowercase: true,
    validate: [validator.isEmail, 'This Email is not valid!']
  },
  password: {
    type: String,
    required: [true, 'User must have a password'],
    minlength: [8, 'Password must have more or equal than 8 characters'],
    select: false
  },
  passwordConfirm: {
    type: String,
    required: [true, 'You need to confirm your Password'],
    validate: {
      // Only work  on CREATE and SAVE, not work when Updating
      validator: function(confirm) {
        return confirm === this.password;
      },
      message: 'Confirm Password and Password do not match!'
    }
  },
  passwordChangedAt: Date,
  passwordResetToken: String,
  passwordResetExpires: Date
});

userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();

  this.password = await bcrypt.hash(this.password, 12);
  this.passwordConfirm = undefined;
});

userSchema.pre('save', async function(next) {
  if (!this.isModified('password') || this.isNew) return next();

  this.passwordChangedAt = Date.now() - 1000;
});

userSchema.methods.correctPassword = async (
  userPassword,
  encryptedPassword
) => {
  return await bcrypt.compare(userPassword, encryptedPassword);
};

userSchema.methods.passwordChangedAfter = function(JWTTimestamp) {
  if (this.passwordChangedAt) {
    return this.passwordChangedAt.getTime() / 1000 > JWTTimestamp;
  }

  return false;
};

userSchema.methods.createPasswordResetToken = function() {
  const resetToken = crypto.randomBytes(32).toString('hex');

  this.passwordResetToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');

  this.passwordResetExpires = Date.now() + 15 * 60 * 1000; //after 15 minutes

  return resetToken;
};

const User = mongoose.model('User', userSchema);
module.exports = User;
