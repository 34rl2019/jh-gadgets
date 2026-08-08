const multer = require('multer');
const csrf = require('./csrf');
const allowed = new Set(['image/jpeg','image/png','image/webp']);
const upload = multer({storage:multer.memoryStorage(),limits:{fileSize:5*1024*1024,files:9},fileFilter:(req,file,callback)=>callback(null,allowed.has(file.mimetype))});
module.exports = (req,res,next) => upload.fields([{name:'image',maxCount:1},{name:'gallery',maxCount:8}])(req,res,error => { if (error) { error.status=422; error.message=error.code==='LIMIT_FILE_SIZE'?'Each product image must be 5 MB or smaller.':'Upload JPG, JPEG, PNG, or WEBP images only.'; return next(error); } req.file=req.files?.image?.[0]; req.galleryFiles=req.files?.gallery||[]; csrf.verify(req,res,next); });
