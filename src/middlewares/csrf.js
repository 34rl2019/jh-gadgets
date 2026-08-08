const crypto = require("crypto");

const unsafeMethods = new Set(["POST", "PUT", "PATCH", "DELETE"]);

const verify = (req, token, next) => {
  const submitted = req.get("x-csrf-token") || req.body?._csrf;
  if (!token || !submitted || submitted.length !== token.length || !crypto.timingSafeEqual(Buffer.from(submitted), Buffer.from(token))) {
    const error = new Error("Your form has expired. Please refresh the page and try again.");
    error.status = 403;
    return next(error);
  }
  return next();
};

const csrf = (req, res, next) => {
  let token = req.cookies.csrf_token;
  if (!token) {
    token = crypto.randomBytes(32).toString("hex");
    res.cookie("csrf_token", token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });
  }
  res.locals.csrfToken = token;
  if (!unsafeMethods.has(req.method) || req.is("multipart/form-data")) return next();
  return verify(req, token, next);
};

csrf.verify = (req, res, next) => verify(req, req.cookies.csrf_token, next);
module.exports = csrf;
