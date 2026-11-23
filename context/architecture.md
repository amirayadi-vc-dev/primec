# Architecture and technology stack

## Overview

This is a vehicle catalogue and import showcase with a back-office for managing
vehicles, social content, appointments, and deposit reservations. It is a
single Node.js application with browser-rendered pages, PostgreSQL or local JSON storage, and
optional external payment providers. There is also a separately generated
static showcase. See [diagrams.md](diagrams.md) for the corresponding flows.

## Technology stack

| Layer | Current implementation |
| --- | --- |
| Runtime | Node.js `>=22`, CommonJS, built-in filesystem, crypto and fetch APIs |
| Server | Express 5; a single [server.js](../server.js) serves pages and implements the API |
| Frontend | HTML, CSS and vanilla JavaScript; browser Fetch API, no frontend framework or bundler |
| Uploads | Multer 2, memory storage, PostgreSQL image bytes or local image files |
| Payments | Stripe SDK 23 and Mamo Pay REST API via Node.js `fetch`; both optional |
| Persistence | PostgreSQL JSONB documents and photos via PostgreJS, or local JSON files and uploads |
| Internationalization | JavaScript dictionaries for French, English and Arabic, with Arabic RTL and a browser-stored language choice |
| UI resources | Lucide icons from unpkg, Google Fonts, Unsplash images, and optional Facebook/Instagram/TikTok embeds |
| Packaging | npm; dependency versions and Node requirement are in [package.json](../package.json), with a lockfile |

Vehicle prices are displayed in TND; the configurable deposit defaults to EUR.
The [example configuration](../.env.example) notes that the payment providers
do not handle TND.

## Runtime application

- [index.html](../index.html) is the ALLANI Auto storefront at `/`. It loads
  catalogue and social data from the API, renders the catalogue and vehicle
  details in the browser, and offers a deposit when a provider is configured.
  Navigation uses the `screen` query parameter.
- [admin.html](../admin.html) is served at `/admin`. Its JavaScript calls the
  API for vehicle, social, reservation and appointment management.
- [i18n.js](../i18n.js) supplies the storefront translations and language
  selection.
- [server.js](../server.js) implements routing, authentication, validation,
  image handling, persistence, payments and the Stripe webhook. `/share/:id`
  creates social preview metadata and redirects to a vehicle page.
- The Node server's `/allani` serves the Prime Cars-themed live admin with the
  same authenticated APIs as `/admin`. The generated `front-office/allani/`
  directory remains a separate public demo for static hosting.

The server exposes only its explicitly registered routes and `/uploads`; it is
not a general static server for the whole repository. It does not serve the
generated Prime Cars storefront at `/`.

## Persistence and state

| Data | Location | Role |
| --- | --- | --- |
| Vehicles | PostgreSQL or [data/cars.json](../data/cars.json) | Catalogue, status and image references |
| Social content | PostgreSQL or [data/social.json](../data/social.json) | Instagram/Facebook/TikTok accounts, post embeds and live configuration |
| Static site settings | PostgreSQL or [data/static-site.json](../data/static-site.json) | Contact details, SEO settings and the homepage background image reference |
| Analytics settings | PostgreSQL or `data/analytics.json` | GA4 Measurement ID for the generated showcase (empty = no tracking) |
| Reservations | PostgreSQL or `data/reservations.json` | Customer details, provider reference, deposit and status |
| Appointments | PostgreSQL or `data/appointments.json` | Customer details, vehicle, date and status |
| Uploaded photos | PostgreSQL or `uploads/` | Images served at `/uploads/` |
| Admin sessions and login attempts | Process memory | Lost on server restart; not shared across instances |
| Language choice | Browser local storage | Used by the client-side translation code |

[storage.js](../storage.js) uses PostgreSQL when either database URL is set and
otherwise uses local files. PostgreSQL stores the documents in JSONB and photos
in a separate table; mutations use transactions and locks across instances.
Local writes are serialized within one process and use temporary files, but
multiple processes and multi-file writes are not transactional. The local
reservation and appointment files and uploaded photos are Git-ignored.
Both backends need appropriate backups and access policies because reservations
and appointments contain personal information.

## API surface

| Access | Method and route | Purpose |
| --- | --- | --- |
| Public | `GET /api/cars`, `GET /api/social` | Read catalogue and social configuration |
| Public | `GET /api/payment-config` | Deposit amount, currency and available providers |
| Public | `POST /api/reserve` | Create a pending reservation and provider checkout |
| Public | `POST /api/reserve/confirm` | Verify a returned Stripe session or Mamo transaction server-side |
| Provider | `POST /api/webhooks/stripe` | Verify Stripe signature and handle paid checkout completion |
| Admin session | `POST /api/admin/login`, `POST /api/admin/logout`, `GET /api/admin/me` | Sign in, sign out and check session |
| Admin | `POST /api/admin/cars`, `PUT /api/admin/cars/:id`, `DELETE /api/admin/cars/:id` | Manage vehicles and photos |
| Admin | `PUT /api/admin/social` | Update social posts, accounts and live |
| Admin | `GET /api/admin/static-site`, `PUT /api/admin/static-site`, `POST /api/admin/static-site/publish` | Read/update showcase settings, upload or reset the homepage image, and regenerate `front-office/` |
| Admin | `GET /api/admin/analytics`, `PUT /api/admin/analytics` | Read/update the GA4 Measurement ID of the static showcase and regenerate it |
| Admin | `GET /api/admin/reservations` | List reservations without checkout URLs |
| Admin | `GET /api/admin/appointments`, `POST /api/admin/appointments`, `PATCH /api/admin/appointments/:id`, `DELETE /api/admin/appointments/:id` | Manage appointments |

Admin data operations require an in-memory session token in an HttpOnly,
SameSite=Strict cookie. The cookie is marked Secure when `BASE_URL` starts with
HTTPS. Login uses a configured password of at least 12 characters and an
in-memory per-IP attempt limit. Vehicle uploads accept up to 10 JPEG, PNG or
WebP images, each up to 8 MiB, with content signature checks.

[social-links.js](../social-links.js) shares profile normalization and post URL
validation between the server, storefront, and admin editor. The generated static
pages inline this helper. TikTok profiles use `tiktokUsername`; video URLs produce
official `tiktok.com/player/v1/ID` iframes. TikTok and Instagram lives open on the
platform, while Facebook retains its embedded player. Social changes are persisted
to the configured storage immediately; the generated showcase must still be regenerated and redeployed.

## Reservation flow

For an available vehicle, the server validates the customer and provider,
checks for a recent pending reservation and records a hold within a storage
mutation, then creates a hosted Stripe Checkout session or Mamo payment link. A pending
record blocks subsequent attempts for 30 minutes from its creation; its status
is not automatically changed to expired afterwards. A provider creation failure
marks the hold failed. The browser redirects to the provider.

On return, the browser asks the server to verify payment with the provider.
Stripe can also notify the server through its signed webhook when configured;
there is no Mamo webhook route in this application. A verified payment marks
the matching reservation paid and changes the vehicle from available to
reserved. With PostgreSQL these updates are a single transaction; with local
files they are serialized within the process. Mamo links have no server-side
expiry configured here, so the 30-minute hold alone does not guarantee that an
old payment link can no longer be paid.

## Generated static showcase

[front-office/sync.js](../front-office/sync.js) reads the root storefront and
admin templates, vehicle and social data and site settings from the configured
storage, translations, contact
script and logo. It runs from the command line or from the back-office
**Site vitrine** section, which edits those settings and regenerates the
output through the admin API. It generates:

- [front-office/index.html](../front-office/index.html): a Prime Cars
  storefront with embedded data and translations. The deposit form is hidden
  because there is no payment server. When a GA4 Measurement ID is set, it
  also inlines [front-office/analytics.js](../front-office/analytics.js): a
  consent banner that loads Google Analytics only after the visitor accepts.
  The back-office Google Analytics page currently shows demonstration
  statistics only; it is not connected to the Google Analytics Data API.
- [front-office/allani/index.html](../front-office/allani/index.html): a
  public interactive demo with no real appointments or reservations. Changes
  remain in memory and disappear on refresh.

These are snapshots, not live API clients: changes to server data do not appear
until the generator is rerun (command line or back-office) and the output
redeployed. The generated HTML
inlines application data, code and any uploaded homepage background image. The
live Node storefront also uses the stored background; uploaded JPG, PNG or WebP
images are limited to 8 MiB. The generated site still depends on external resources;
images referenced under `/uploads/` also need to be available on the deployed
host. See [front-office/README.md](../front-office/README.md) for publishing,
contact settings and regeneration details.

## Running and configuration

The repository defines `npm start` as `node server.js`. Copy
[.env.example](../.env.example) to `.env` and configure the desired values
without committing secrets. The server loads `.env` when present.

| Variables | Purpose |
| --- | --- |
| `PORT`, `BASE_URL` | Listening port and public URL used for return/share links and cookie security |
| `DATABASE_URL`, `DATABASE_URL_POOLED` | Direct PostgreSQL URL for initialization and pooled URL for application requests |
| `ADMIN_PASSWORD` | Admin password; administration login is disabled if shorter than 12 characters |
| `DEPOSIT_AMOUNT`, `DEPOSIT_CURRENCY` | Deposit configuration |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | Stripe checkout and optional signed webhook |
| `MAMO_API_KEY`, `MAMO_ENV` | Mamo payment links and sandbox/production endpoint |

Run `npm run db:seed` once to initialize empty application tables with the local
JSON data and referenced uploads. It does not overwrite existing application
documents and refuses to seed a partially initialized database. A configured
but unavailable or uninitialized database prevents the server from starting.

Regenerate static outputs with `node front-office/sync.js`, optionally followed
by the public site URL for SEO metadata (overrides the saved setting), or from
the back-office. Either way this **overwrites both generated HTML files**, so
review any local edits first.

`npm test` runs the Node.js tests. PostgreSQL integration tests require
`TEST_DATABASE_URL` (and optionally `TEST_DATABASE_URL_POOLED`) pointing to a
test database; they create and remove an isolated schema.
Deployment infrastructure beyond the static publishing guidance in
[front-office/README.md](../front-office/README.md) is not specified in the
repository.
