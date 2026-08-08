const db = require('../config/database');
const allowed = { services: ['title','description','image','featured','status'], testimonials: ['customer_name','company','rating','comment','photo','status'], faqs: ['question','answer','sort_order','status'], pages: ['title','slug','content','meta_title','meta_description','status'], blog_posts: ['title','slug','excerpt','content','featured_image','category_id','status','meta_title','meta_description'] };
const sanitize = (table, body) => Object.fromEntries(Object.entries(body).filter(([key]) => allowed[table]?.includes(key)));
exports.list = (table, query = {}) => db(table).modify(q => { if (query.status) q.where('status', query.status); }).orderBy('created_at','desc');
exports.find = (table, id) => db(table).where({ id }).first();
exports.create = async (table, body) => { const [id] = await db(table).insert(sanitize(table, body)); return exports.find(table, id); };
exports.update = async (table, id, body) => { await db(table).where({ id }).update(sanitize(table, body)); return exports.find(table, id); };
exports.remove = (table, id) => db(table).where({ id }).del();
