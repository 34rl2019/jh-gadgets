const multer = require('multer'); const csrf = require('./csrf');
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 3 * 1024 * 1024, files: 1 }, fileFilter: (req, file, done) => done(null, new Set(['image/jpeg', 'image/png', 'image/webp']).has(file.mimetype)) });
module.exports = (req, res, next) => upload.single('customer_photo')(req, res, error => { if (error) { error.status = 422; error.message = 'Upload a JPG, PNG, or WEBP photo no larger than 3 MB.'; return next(error); } return csrf.verify(req, res, next); });
