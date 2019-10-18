const mongoose = require('mongoose');

const tourSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'A tour must have a name'],
      trim: true,
      unique: true,
      maxlength: [
        40,
        'The name length must be less or equal than 40 characters'
      ],
      minlength: [
        10,
        'The name length must be more or equal than 10 characters'
      ]
    },
    duration: {
      type: Number,
      required: [true, 'A tour must have a duration']
    },
    maxGroupSize: {
      type: Number,
      require: [true, 'A tour must have a group size']
    },
    difficulty: {
      type: String,
      require: [true, 'A tour must have a duration']
    },
    ratingsAverage: {
      type: Number,
      default: 3.5
    },
    ratingsQuantity: {
      type: Number,
      default: 0
    },
    price: {
      type: Number,
      required: [true, 'A tour must have a price']
    },
    priceDiscount: Number,
    summary: {
      type: String,
      trim: true,
      require: [true, 'A tour must have a summary']
    },
    description: {
      type: String,
      trim: true
    },
    imageCover: {
      type: String,
      require: [true, 'A tour must have a Cover Image']
    },
    images: [String], //list of strirng
    createAt: {
      type: Date,
      default: Date.now(),
      select: false
    },
    startDates: [Date]
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

tourSchema.virtual('durationWeeks').get(function() {
  return this.duration / 7;
});

const Tour = mongoose.model('tour', tourSchema); //auto LowerCase model name and add 's' at the end
module.exports = Tour;

// const testTour = new Tour({
//   name: 'The Park Camper',
//   price: 597,
//   rating: 4.8
// });

// testTour
//   .save() //Save to the tours collection in database
//   .then(doc => console.log(doc))
//   .catch(err => console.log(err));
