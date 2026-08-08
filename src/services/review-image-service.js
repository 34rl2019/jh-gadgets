const path = require('path'); const fs = require('fs/promises'); const sharp = require('sharp');
const directory = path.join(__dirname, '..', 'public', 'uploads', 'reviews');
exports.optimize = async file => { const name = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}.webp`; await fs.mkdir(directory, { recursive: true }); await sharp(file.buffer).rotate().resize(600, 600, { fit: 'cover', withoutEnlargement: true }).webp({ quality: 80 }).toFile(path.join(directory, name)); return `/uploads/reviews/${name}`; };
exports.remove = async file => { if (!file?.startsWith('/uploads/reviews/')) return; try { await fs.unlink(path.join(__dirname, '..', 'public', file)); } catch (error) { if (error.code !== 'ENOENT') throw error; } };
