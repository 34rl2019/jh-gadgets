const { validationResult } = require('express-validator');
module.exports = (req, res, next) => { const errors = validationResult(req); if (errors.isEmpty()) return next(); const err = new Error(errors.array().map(x => x.msg).join(' ')); err.status = 422; next(err); };
