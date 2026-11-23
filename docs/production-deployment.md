# Production deployment on Render

This configuration runs the live Node storefront and admin together with Render
Postgres in Frankfurt. The separate `front-office` output is a static snapshot,
not the live storefront. The Blueprint creates paid resources; review Render's
current prices, region availability and storage charges before deploying.

## Before deploying

- Run `npm test` and review the actual storefront at `/` and live admin at
  `/allani` or `/admin`. The static demo at `front-office/allani/` is public and
  must not be used as the real admin.
- The first pre-deploy step runs `npm run db:seed`. With the Blueprint's
  `SEED_EMPTY_CATALOG=true`, a new database starts with no vehicles or vehicle
  photos. Other documents and a referenced wallpaper are imported from the
  repository's `data/` and `uploads/` files. It does not overwrite an initialized
  database and refuses partially initialized data. Existing databases and local
  files are not cleared by this setting.
  **Do not deploy the Blueprint until you have decided what data to import.**
  Local uploads, appointments and reservations are Git-ignored and will not be
  present in a Git deployment. If those local records or photos are needed,
  create the database separately and import from the machine holding them before
  enabling this pre-deploy step. Temporarily restrict external database access
  to the importing IP, use a secure connection, and remove access afterwards.
  Never commit customer data or secrets to make the import work.
- Seeded photos are stored in PostgreSQL. Monitor database disk usage and
  budget for it; the application accepts up to ten 8 MiB images per vehicle.
- Protect the admin and `/api/admin/*` with an additional access control and
  rate-limiting layer that covers all public entry points. The built-in login
  limiter and sessions are in process memory, and the limiter uses `req.ip`
  without trusting proxy headers. Behind a proxy it may treat multiple visitors
  as one IP; it is not a substitute for edge protection. Don't blindly trust
  forwarded headers from the internet. Use one app instance; deployments and
  restarts invalidate sessions.

## Deploy

1. Push the reviewed project to a private Git repository and connect it to
   Render. Create a Blueprint from `render.yaml`. The database is configured for
   private-network access only and the pre-deploy command initializes it.
2. Provide `BASE_URL` as the canonical public HTTPS origin (for example,
   `https://example.com`, without a path) and a unique `ADMIN_PASSWORD` of at
   least 12 characters in Render. Never commit or share credentials. Render sets
   `PORT` and supplies the internal `DATABASE_URL` automatically.
3. Add the custom domain in Render. Configure the Cloudflare DNS records as
   shown in Render's Cloudflare DNS instructions, initially DNS-only. After
   Render verifies the domain and issues a certificate, proxying may be enabled
   with Cloudflare SSL/TLS set to Full (strict). Do not cache admin or API
   responses. Protect or disable the Render default hostname where appropriate;
   Cloudflare-only rules do not protect requests that bypass Cloudflare.
4. Verify `/health`, the storefront, login, catalogue changes, uploads and
   appointments. Check that changes and photos survive a restart and deploy.
5. Confirm the paid database recovery window, arrange additional retained
   exports as appropriate, and test a restore. Configure uptime and database
   storage alerts. PostgreSQL also contains customer details and photos.

## Payments

Payments are disabled unless configured. Before accepting real deposits, verify
provider availability for your business, supported currency and production
credentials. For Stripe configure `STRIPE_SECRET_KEY` and
`STRIPE_WEBHOOK_SECRET` for `https://your-domain/api/webhooks/stripe`, and test
checkout and signed webhook delivery. Mamo uses `MAMO_API_KEY` and
`MAMO_ENV=production`; the application has no Mamo webhook and its 30-minute
reservation hold does not expire old Mamo payment links. Review that limitation
before using Mamo for real payments. Never put secrets in frontend files.

`NODE_ENV=production` requires PostgreSQL, a valid HTTPS `BASE_URL` and an admin
password. Startup fails if the database is unavailable or not initialized.