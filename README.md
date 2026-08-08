# Business CMS

A Node.js, Express, EJS, MySQL and Knex content-management foundation with a public site, JWT-backed admin authentication, contact capture, CRUD REST APIs, validation and security middleware.

## XAMPP quick start

1. Open the XAMPP Control Panel and start **MySQL**. Apache is not required for this Node.js application.
2. Open `http://localhost/phpmyadmin`, select **New**, and create a database called `business_cms` with `utf8mb4_unicode_ci` collation.
3. Use these local XAMPP values in `.env` (they are already configured):

   ```env
   PORT=5000
   DB_HOST=127.0.0.1
   DB_PORT=3306
   DB_NAME=business_cms
   DB_USER=root
   DB_PASSWORD=
   JWT_SECRET=use-a-long-unique-random-value
   ```

   If your XAMPP MySQL port or root password differs, update `DB_PORT` or `DB_PASSWORD` accordingly.
4. Run `npm.cmd install`, then `npm.cmd run migrate` and `npm.cmd run seed`.
5. Run `npm.cmd start`, then open `http://localhost:5000`.

Initial administrator: `admin@example.com` / `ChangeMe123!`. Change it immediately in production.

## Deployment

Run behind Nginx with TLS, set `NODE_ENV=production`, use a strong unique `JWT_SECRET`, enable `COOKIE_SECURE=true`, and supervise `npm start` with PM2. Apply migrations as part of deployment.

## API

Protected CRUD endpoints are available under `/api/services`, `/api/testimonials`, `/api/faqs`, `/api/pages`, and `/api/blog_posts`. Authenticate via the admin login cookie or an `Authorization: Bearer <JWT>` header.
