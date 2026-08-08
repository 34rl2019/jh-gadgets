const db = require('../config/database');
const publicScope = query => query.where({ approved: 1, status: 'approved' });
exports.summary = async productId => {
  const row = await publicScope(db('product_reviews')).where({ product_id: productId }).count({ count: 'id' }).avg({ average: 'rating' }).first();
  const breakdown = await publicScope(db('product_reviews')).where({ product_id: productId }).select('rating').count({ count: 'id' }).groupBy('rating');
  return { count: Number(row.count || 0), average: Number(row.average || 0), breakdown: Object.fromEntries(breakdown.map(item => [item.rating, Number(item.count)])) };
};
exports.publicForProduct = (productId, query = {}) => {
  const result = publicScope(db('product_reviews')).where({ product_id: productId });
  if (query.rating) result.where('rating', Number(query.rating));
  if (query.verified === '1') result.where({ purchase_verified: 1 });
  result.select('product_reviews.*').select(db('product_review_votes').whereRaw('product_review_votes.review_id = product_reviews.id').count('*').as('helpful_count'));
  const ordering = { oldest: ['created_at', 'asc'], highest: ['rating', 'desc'], lowest: ['rating', 'asc'], helpful: ['helpful_count', 'desc'], newest: ['created_at', 'desc'] }[query.sort] || ['created_at', 'desc'];
  return result.orderBy(ordering[0], ordering[1]).orderBy('created_at', 'desc');
};
exports.featured = () => db('product_reviews as r').join('products as p', 'p.id', 'r.product_id').where({ 'r.approved': 1, 'r.status': 'approved', 'r.featured': 1, 'p.status': 'published' }).select('r.*', 'p.name as product_name', 'p.slug as product_slug').orderBy('r.updated_at', 'desc').limit(6);
exports.adminList = async filters => {
  const query = db('product_reviews as r').join('products as p', 'p.id', 'r.product_id').select('r.*', 'p.name as product_name').modify(builder => {
    if (filters.q) builder.where(x => x.where('r.customer_name', 'like', `%${filters.q}%`).orWhere('r.customer_email', 'like', `%${filters.q}%`).orWhere('r.review_title', 'like', `%${filters.q}%`).orWhere('p.name', 'like', `%${filters.q}%`));
    if (filters.status) builder.where('r.status', filters.status);
    if (filters.rating) builder.where('r.rating', Number(filters.rating));
    if (filters.featured === '1') builder.where('r.featured', 1);
  });
  return query.orderBy('r.created_at', 'desc');
};
