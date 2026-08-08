require("dotenv").config();
const path = require("path");
const express = require("express");
const helmet = require("helmet");
const compression = require("compression");
const morgan = require("morgan");
const cookieParser = require("cookie-parser");
const rateLimit = require("express-rate-limit");
const { body } = require("express-validator");
const db = require("./config/database");
const asyncHandler = require("./helpers/async-handler");
const validate = require("./middlewares/validate");
const { requireAuth, requireRole, issueToken } = require("./middlewares/auth");
const api = require("./routes/api");
const errorHandler = require("./middlewares/error-handler");
const adminProducts = require("./controllers/admin-product-controller");
const adminUsers = require("./controllers/admin-user-controller");
const adminContent = require("./controllers/admin-content-controller");
const productUpload = require("./middlewares/product-upload");
const reviewUpload = require("./middlewares/review-upload");
const reviewController = require("./controllers/review-controller");
const reviewRepository = require("./repositories/review-repository");
const csrf = require("./middlewares/csrf");
const app = express();
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.set("trust proxy", 1);
app.use(helmet({ contentSecurityPolicy: { directives: { defaultSrc: ["'self'"], styleSrc: ["'self'", "https://cdn.jsdelivr.net", "'unsafe-inline'"], scriptSrc: ["'self'", "https://cdn.jsdelivr.net", "'unsafe-inline'"], imgSrc: ["'self'", "data:"] } } }));
app.use(compression());
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));
app.use(express.static(path.join(__dirname, "public")));
app.use(express.urlencoded({ extended: true }));
app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());
app.use(csrf);
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 200,
    standardHeaders: "draft-8",
    legacyHeaders: false,
  }),
);
app.use((req, res, next) => {
  res.locals.currentUser = null;
  res.locals.year = new Date().getFullYear();
  res.locals.currentPath = req.path;
  next();
});
app.get(
  "/",
  asyncHandler(async (req, res) =>
    res.render("home-reviews", {
      title: "Home",
      featured: await db("products")
        .where({ status: "published", featured: 1 })
        .orderBy("created_at", "desc")
        .limit(8),
      arrivals: await db("products")
        .where({ status: "published", new_arrival: 1 })
        .orderBy("created_at", "desc")
        .limit(4),
      testimonials: await reviewRepository.featured(),
      featuredBrands: await db("brands")
        .where({ active: 1, featured: 1 })
        .orderBy("display_order")
        .orderBy("name"),
      posts: await db("blog_posts")
        .where({ status: "published" })
        .orderBy("created_at", "desc")
        .limit(3),
      faqs: await db("faqs")
        .where({ status: "published" })
        .orderBy("sort_order")
        .orderBy("created_at", "desc")
        .limit(5),
    }),
  ),
);
app.get(
  "/products",
  asyncHandler(async (req, res) => {
    const q = db("products as p")
      .leftJoin("brands as b", "b.id", "p.brand_id")
      .leftJoin("categories as c", "c.id", "p.category_id")
      .select("p.*", "b.name as brand_name", "c.name as category_name")
      .where("p.status", "published");
    if (req.query.q)
      q.where((x) =>
        x
          .where("p.name", "like", `%${req.query.q}%`)
          .orWhere("p.sku", "like", `%${req.query.q}%`)
          .orWhere("p.model", "like", `%${req.query.q}%`),
      );
    if (req.query.category) q.where("p.category_id", req.query.category);
    if (req.query.brand) q.where("p.brand_id", req.query.brand);
    res.render("products", {
      title: "Products",
      products: await q.orderBy("p.created_at", "desc"),
      brands: await db("brands").where({ active: 1 }),
      categories: await db("categories").where({ active: 1 }),
      filters: req.query,
    });
  }),
);
app.get(
  "/products/:slug",
  asyncHandler(async (req, res) => {
    const product = await db("products as p")
      .leftJoin("brands as b", "b.id", "p.brand_id")
      .leftJoin("categories as c", "c.id", "p.category_id")
      .select("p.*", "b.name as brand_name", "c.name as category_name")
      .where({ "p.slug": req.params.slug, "p.status": "published" })
      .first();
    if (!product) {
      const e = new Error("Product not found");
      e.status = 404;
      throw e;
    }
    const summary = await reviewRepository.summary(product.id);
    res.render("product-detail-reviews", {
      title: product.name,
      query: req.query,
      product,
      images: await db("product_images")
        .where({ product_id: product.id })
        .orderBy("sort_order"),
      related: await db("products")
        .where({ category_id: product.category_id, status: "published" })
        .whereNot({ id: product.id })
        .limit(4),
      reviewSummary: summary,
      reviews: await reviewRepository.publicForProduct(product.id, req.query),
    });
  }),
);
const reviewLimiter = rateLimit({ windowMs: 60 * 60 * 1000, limit: 4, standardHeaders: 'draft-8', legacyHeaders: false, message: 'Too many review submissions. Please try again later.' });
app.post('/products/:slug/reviews', reviewLimiter, reviewUpload, [body('customer_name').trim().isLength({ min: 2, max: 120 }), body('customer_email').isEmail().normalizeEmail(), body('review_title').trim().isLength({ min: 3, max: 180 }), body('rating').isInt({ min: 1, max: 5 }), body('review').trim().isLength({ min: 15, max: 2000 }), body('purchase_reference').optional({ checkFalsy: true }).trim().isLength({ max: 120 })], validate, asyncHandler(reviewController.submit));
app.get('/products/:slug/reviews/:id/edit', asyncHandler(reviewController.editForm));
app.post('/products/:slug/reviews/:id/edit', [body('review_title').trim().isLength({ min: 3, max: 180 }), body('rating').isInt({ min: 1, max: 5 }), body('review').trim().isLength({ min: 15, max: 2000 })], validate, asyncHandler(reviewController.edit));
app.post('/products/:slug/reviews/:id/helpful', asyncHandler(reviewController.voteHelpful));
app.post(
  "/products/:slug/inquire",
  [
    body("name").trim().isLength({ min: 2 }),
    body("email").isEmail().normalizeEmail(),
    body("message").trim().isLength({ min: 5 }),
  ],
  validate,
  asyncHandler(async (req, res) => {
    const p = await db("products")
      .where({ slug: req.params.slug, status: "published" })
      .first();
    if (!p) {
      const e = new Error("Product not found");
      e.status = 404;
      throw e;
    }
    await db("product_inquiries").insert({
      product_id: p.id,
      name: req.body.name,
      email: req.body.email,
      phone: req.body.phone || null,
      message: req.body.message,
    });
    res.redirect(`/products/${p.slug}?inquiry=sent`);
  }),
);
app.get("/contact", (req, res) =>
  res.render("contact", {
    title: "Contact",
    success: req.query.sent === "1" ? "Thank you — your message has been received." : null,
  }),
);
app.get("/services", asyncHandler(async (req, res) => res.render("services", { title: "Services", services: await db("services").where({ status: "published" }).orderBy("created_at", "desc") })));
app.get("/faqs", asyncHandler(async (req, res) => res.render("faqs", { title: "FAQs", faqs: await db("faqs").where({ status: "published" }).orderBy("sort_order").orderBy("created_at") })));
app.get("/blog", asyncHandler(async (req, res) => res.render("blog", { title: "Blog", posts: await db("blog_posts").where({ status: "published" }).orderBy("created_at", "desc") })));
app.get("/blog/:slug", asyncHandler(async (req, res) => { const post=await db("blog_posts").where({slug:req.params.slug,status:"published"}).first(); if(!post){const error=new Error("Post not found");error.status=404;throw error;}res.render("blog-detail",{title:post.title,post}); }));
app.get(["/about", "/privacy-policy", "/terms"], (req, res) => {
  const pages = {
    "/about": [
      "About JH JOOP HESED",
      "JH JOOP HESED Gadget Shop provides dependable technology products and helpful guidance for every digital lifestyle.",
    ],
    "/privacy-policy": [
      "Privacy Policy",
      "We respect customer information and use submitted details only to respond to product and service inquiries.",
    ],
    "/terms": [
      "Terms & Conditions",
      "Product availability, pricing, and specifications are subject to confirmation with the store.",
    ],
  };
  const [heading, content] = pages[req.path];
  res.render("info", { title: heading, heading, content });
});
app.post(
  "/contact",
  [
    body("name").trim().isLength({ min: 2 }),
    body("email").isEmail().normalizeEmail(),
    body("message").trim().isLength({ min: 10 }),
  ],
  validate,
  asyncHandler(async (req, res) => {
    await db("messages").insert({
      name: req.body.name,
      email: req.body.email,
      phone: req.body.phone || null,
      subject: req.body.subject || null,
      message: req.body.message,
    });
    res.redirect("/contact?sent=1");
  }),
);
app.get("/admin/login", (req, res) =>
  res.render("login", { title: "Admin login" }),
);
const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: "draft-8", legacyHeaders: false, message: "Too many sign-in attempts. Please try again later." });
app.post(
  "/admin/login",
  loginLimiter,
  [
    body("email").isEmail().normalizeEmail(),
    body("password").isLength({ min: 8 }),
  ],
  validate,
  asyncHandler(async (req, res) => {
    const user = await db("users")
      .where({ email: req.body.email, status: "active" })
      .first();
    const bcrypt = require("bcrypt");
    if (
      !user ||
      !(await bcrypt.compare(req.body.password, user.password_hash))
    ) {
      const e = new Error("Invalid email or password.");
      e.status = 401;
      throw e;
    }
    const token = issueToken(user);
    await db("users").where({ id: user.id }).update({ last_login_at: db.fn.now() });
    res.cookie("access_token", token, {
      httpOnly: true,
      secure: process.env.COOKIE_SECURE === "true",
      sameSite: "lax",
      maxAge: 8 * 60 * 60 * 1000,
    });
    res.redirect("/admin");
  }),
);
app.post("/admin/logout", (req, res) => {
  res.clearCookie("access_token");
  res.redirect("/admin/login");
});
app.get(
  "/admin",
  requireAuth,
  asyncHandler(async (req, res) =>
    res.render("admin/dashboard", {
      title: "Dashboard",
      stats: {
        products: await db("products").count("* as count").first(),
        categories: await db("categories").count("* as count").first(),
        inStock: await db("products")
          .where("stock_quantity", ">", 0)
          .count("* as count")
          .first(),
        lowStock: await db("products")
          .where("stock_quantity", ">", 0)
          .whereRaw("stock_quantity <= low_stock_alert")
          .count("* as count")
          .first(),
        outOfStock: await db("products")
          .where({ stock_quantity: 0 })
          .count("* as count")
          .first(),
        pendingReviews: await db('product_reviews').where({ status: 'pending' }).count('* as count').first(),
      },
      messages: await db("messages").orderBy("created_at", "desc").limit(5),
      latestProducts: await db("products")
        .orderBy("created_at", "desc")
        .limit(5),
    }),
  ),
);
app.get("/admin/products", requireAuth, requireRole("super_admin", "staff"), asyncHandler(adminProducts.list));
app.get(
  "/admin/products/new",
  requireAuth, requireRole("super_admin", "staff"),
  asyncHandler(adminProducts.createForm),
);
app.post("/admin/products", requireAuth, requireRole("super_admin", "staff"), productUpload, ...adminProducts.save);
app.get(
  "/admin/products/:id/edit",
  requireAuth, requireRole("super_admin", "staff"),
  asyncHandler(adminProducts.editForm),
);
app.post(
  "/admin/products/:id",
  requireAuth, requireRole("super_admin", "staff"),
  productUpload,
  ...adminProducts.save,
);
app.post(
  "/admin/products/:id/archive",
  requireAuth, requireRole("super_admin", "staff"),
  asyncHandler(adminProducts.archive),
);
app.post(
  "/admin/products/:id/restore",
  requireAuth, requireRole("super_admin", "staff"),
  asyncHandler(adminProducts.restore),
);
app.post(
  "/admin/products/:id/delete",
  requireAuth, requireRole("super_admin", "staff"),
  asyncHandler(adminProducts.destroy),
);
app.get("/admin/products/:id/images", requireAuth, requireRole("super_admin", "staff"), asyncHandler(adminProducts.images));
app.post("/admin/products/:id/images", requireAuth, requireRole("super_admin", "staff"), productUpload, adminProducts.addImages);
app.post("/admin/products/:id/images/reorder", requireAuth, requireRole("super_admin", "staff"), asyncHandler(adminProducts.reorderImages));
app.post("/admin/products/:id/images/:imageId/thumbnail", requireAuth, requireRole("super_admin", "staff"), asyncHandler(adminProducts.setThumbnail));
app.post("/admin/products/:id/images/:imageId/delete", requireAuth, requireRole("super_admin", "staff"), asyncHandler(adminProducts.deleteImage));
app.post("/admin/products/:id/duplicate", requireAuth, requireRole("super_admin", "staff"), asyncHandler(adminProducts.duplicate));
app.get('/admin/reviews', requireAuth, requireRole('super_admin', 'staff'), asyncHandler(reviewController.list));
app.post('/admin/reviews/:id', requireAuth, requireRole('super_admin', 'staff'), asyncHandler(reviewController.update));
app.get("/admin/users", requireAuth, requireRole("super_admin"), asyncHandler(adminUsers.list));
app.get("/admin/users/new", requireAuth, requireRole("super_admin"), asyncHandler(adminUsers.createForm));
app.post("/admin/users", requireAuth, requireRole("super_admin"), ...adminUsers.save);
app.get("/admin/users/:id/edit", requireAuth, requireRole("super_admin"), asyncHandler(adminUsers.editForm));
app.post("/admin/users/:id", requireAuth, requireRole("super_admin"), ...adminUsers.save);
app.post("/admin/users/:id/toggle", requireAuth, requireRole("super_admin"), asyncHandler(adminUsers.toggle));
for (const module of ["services", "faqs", "posts"]) {
  app.get(`/admin/${module}`, requireAuth, requireRole("super_admin", "staff"), asyncHandler(adminContent.list));
  app.get(`/admin/${module}/new`, requireAuth, requireRole("super_admin", "staff"), asyncHandler(adminContent.newForm));
  app.post(`/admin/${module}`, requireAuth, requireRole("super_admin", "staff"), ...adminContent.save(module));
  app.get(`/admin/${module}/:id/edit`, requireAuth, requireRole("super_admin", "staff"), asyncHandler(adminContent.editForm));
  app.post(`/admin/${module}/:id`, requireAuth, requireRole("super_admin", "staff"), ...adminContent.save(module));
  app.post(`/admin/${module}/:id/archive`, requireAuth, requireRole("super_admin", "staff"), asyncHandler(adminContent.archive));
  app.post(`/admin/${module}/:id/restore`, requireAuth, requireRole("super_admin", "staff"), asyncHandler(adminContent.restore));
  app.post(`/admin/${module}/:id/delete`, requireAuth, requireRole("super_admin", "staff"), asyncHandler(adminContent.remove));
}
app.get(
  "/admin/:module",
  requireAuth,
  asyncHandler(async (req, res) => {
    const table = {
      products: "products",
      services: "services",
      faqs: "faqs",
      pages: "pages",
      posts: "blog_posts",
    }[req.params.module];
    if (!table) {
      const e = new Error("Page not found");
      e.status = 404;
      throw e;
    }
    res.render("admin/list", {
      title: req.params.module[0].toUpperCase() + req.params.module.slice(1),
      module: req.params.module,
      rows: await db(table).orderBy("created_at", "desc"),
    });
  }),
);
app.use("/api", api);
app.use((req, res) =>
  res
    .status(404)
    .render("error", {
      title: "Not found",
      error: "The page you requested does not exist.",
    }),
);
app.use(errorHandler);
module.exports = app;
