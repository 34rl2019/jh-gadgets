const db = require('../config/database');
const reviews = require('../repositories/review-repository');
const imageService = require('../services/review-image-service');
const profanity = /\b(?:viagra|casino|loan|crypto giveaway)\b/i;
const crypto = require('crypto');
exports.submit = async (req, res) => {
  const product = await db('products').where({ slug: req.params.slug, status: 'published' }).first();
  if (!product) { const error = new Error('Product not found'); error.status = 404; throw error; }
  const duplicate = await db('product_reviews').where({ product_id: product.id, customer_email: req.body.customer_email }).where('created_at', '>', db.raw('DATE_SUB(NOW(), INTERVAL 24 HOUR)')).first();
  if (duplicate || profanity.test(`${req.body.review_title} ${req.body.review}`)) { const error = new Error('Your review could not be accepted. Please avoid duplicate or promotional submissions.'); error.status = 422; throw error; }
  const customerPhoto = req.file ? await imageService.optimize(req.file) : null;
  const editToken = crypto.randomBytes(32).toString('hex');
  const [id] = await db('product_reviews').insert({ product_id: product.id, customer_name: req.body.customer_name.trim(), customer_email: req.body.customer_email, customer_photo: customerPhoto, rating: Number(req.body.rating), review_title: req.body.review_title.trim(), review: req.body.review.trim(), purchase_reference: req.body.purchase_reference?.trim() || null, edit_token_hash: crypto.createHash('sha256').update(editToken).digest('hex') });
  res.cookie(`review_edit_${id}`, editToken, { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', maxAge: 30 * 24 * 60 * 60 * 1000 });
  res.redirect(`/products/${product.slug}/reviews/${id}/edit`);
};
const ownedReview = async req => {
  const review = await db('product_reviews as r').join('products as p', 'p.id', 'r.product_id').select('r.*', 'p.slug as product_slug').where({ 'r.id': req.params.id, 'p.slug': req.params.slug }).first();
  const token = req.cookies[`review_edit_${req.params.id}`];
  if (!review || !token || crypto.createHash('sha256').update(token).digest('hex') !== review.edit_token_hash) { const error = new Error('This review edit link is unavailable.'); error.status = 403; throw error; }
  return review;
};
exports.editForm = async (req, res) => { const review = await ownedReview(req); res.render('edit-review', { title: 'Edit review', review }); };
exports.edit = async (req, res) => { const review = await ownedReview(req); if (profanity.test(`${req.body.review_title} ${req.body.review}`)) { const error = new Error('Please remove promotional or inappropriate content.'); error.status = 422; throw error; } await db('product_reviews').where({ id: review.id }).update({ review_title: req.body.review_title.trim(), rating: Number(req.body.rating), review: req.body.review.trim(), approved: 0, featured: 0, status: 'pending', updated_at: db.fn.now() }); res.redirect(`/products/${review.product_slug}?review=updated`); };
exports.voteHelpful = async (req, res) => {
  const review = await db('product_reviews').where({ id: req.params.id, approved: 1, status: 'approved' }).first();
  if (!review) { const error = new Error('Review not found'); error.status = 404; throw error; }
  let voterKey = req.cookies.review_voter;
  if (!voterKey) { voterKey = require('crypto').randomBytes(24).toString('hex'); res.cookie('review_voter', voterKey, { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', maxAge: 365 * 24 * 60 * 60 * 1000 }); }
  const existing = await db('product_review_votes').where({ review_id: review.id, voter_key: voterKey }).first();
  if (existing) await db('product_review_votes').where({ id: existing.id }).del(); else await db('product_review_votes').insert({ review_id: review.id, voter_key: voterKey });
  res.redirect(req.get('referer') || `/products/${req.params.slug}`);
};
exports.list = async (req, res) => res.render('admin/reviews/list', { title: 'Reviews', reviews: await reviews.adminList(req.query), filters: req.query });
exports.update = async (req, res) => {
  const review = await db('product_reviews').where({ id: req.params.id }).first();
  if (!review) { const error = new Error('Review not found'); error.status = 404; throw error; }
  const action = req.body.action;
  const updates = { updated_at: db.fn.now() };
  if (action === 'approve') Object.assign(updates, { approved: 1, status: 'approved' });
  if (action === 'reject') Object.assign(updates, { approved: 0, featured: 0, status: 'rejected' });
  if (action === 'hide') Object.assign(updates, { approved: 0, featured: 0, status: 'hidden' });
  if (action === 'archive') Object.assign(updates, { approved: 0, featured: 0, status: 'archived' });
  if (action === 'restore') Object.assign(updates, { status: 'pending', approved: 0, featured: 0 });
  if (action === 'feature' && review.approved && review.status === 'approved') updates.featured = 1;
  if (action === 'unfeature') updates.featured = 0;
  if (action === 'verify') updates.purchase_verified = !review.purchase_verified;
  if (action === 'delete') { if (review.customer_photo) await imageService.remove(review.customer_photo); await db('product_reviews').where({ id: review.id }).del(); return res.redirect('/admin/reviews'); }
  await db('product_reviews').where({ id: review.id }).update(updates);
  res.redirect('/admin/reviews');
};
