module.exports = fn => (req, res, next) => {
  fn(req, res, next).catch(next); // catch(next) = catch(error => next(error))
};
