const repo = require('../repositories/product-repository'); const { ok, created } = require('../helpers/api-response');
exports.list = async (req,res) => ok(res, await repo.list(req.query));
exports.get = async (req,res) => { const product = await repo.find(req.params.id); if (!product) { const e=new Error('Product not found');e.status=404;throw e; } ok(res,product); };
exports.create = async (req,res) => created(res,await repo.create(req.body,req.user.id));
exports.update = async (req,res) => { const product=await repo.update(req.params.id,req.body,req.user.id);if(!product){const e=new Error('Product not found');e.status=404;throw e;}ok(res,product); };
exports.remove = async (req,res) => { const count=await repo.archive(req.params.id);if(!count){const e=new Error('Product not found');e.status=404;throw e;}res.status(204).end(); };
