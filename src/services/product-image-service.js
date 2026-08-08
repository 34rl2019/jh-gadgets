const path = require('path'); const fs = require('fs/promises'); const sharp = require('sharp');
const uploadDirectory = path.join(__dirname, '..', 'public', 'uploads', 'products');
exports.uploadDirectory = uploadDirectory;
exports.optimize = async file => { const filename = `${Date.now()}-${Math.random().toString(36).slice(2,10)}.webp`; await fs.mkdir(uploadDirectory,{recursive:true}); await sharp(file.buffer).rotate().resize({width:1200,height:1200,fit:'inside',withoutEnlargement:true}).webp({quality:82}).toFile(path.join(uploadDirectory,filename)); return `/uploads/products/${filename}`; };
exports.remove = async publicPath => { if (!publicPath?.startsWith('/uploads/products/')) return; try { await fs.unlink(path.join(__dirname,'..','public',publicPath)); } catch (error) { if (error.code !== 'ENOENT') throw error; } };
