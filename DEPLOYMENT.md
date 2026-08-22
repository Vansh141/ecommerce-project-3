# TOUCH — Deployment Checklist

Derived from the actual code: `render.yaml`, `backend/config/env.js`, `backend/app.js`,
`backend/services/*`, `frontend/src/api/client.js`, `frontend/vite.config.js`.

Architecture (deliberately simple — no Docker, no Kubernetes):

| Piece    | Host                              | Cost |
|----------|-----------------------------------|------|
| API      | Render Web Service (Node)         | Free |
| Frontend | Render Static Site                | Free |
| Database | MongoDB Atlas M0                  | Free |
| Images   | Cloudinary free tier              | Free |
| Payments | Razorpay                          | Per-txn |
| Email    | Any SMTP (Gmail app password / Brevo / Zoho) | Free tier |

Render free web services sleep after ~15 min idle; first request after sleep takes
~30-50 s. Acceptable for launch; upgrade the API to Starter ($7/mo) when traffic justifies it.

---

## Environment variables

Legend — **Req**: R = required (boot fails without it), O = optional (feature disables cleanly).

### Backend — `touch-api` (Render Web Service → Environment)

| Variable | Purpose | Req | Where set |
|---|---|---|---|
| `NODE_ENV` | Must be `production` | R | render.yaml (committed) |
| `PORT` | Listen port | R | render.yaml = 10000 |
| `TRUST_PROXY` | Exact proxy count; wrong value breaks rate limiting | R | render.yaml = `1` |
| `COOKIE_SAMESITE` | `none` — API and site are different hosts | R | render.yaml = `none` |
| `MONGO_URI` | Atlas SRV string. No localhost fallback; localhost rejected in prod | R | Dashboard (secret) |
| `JWT_ACCESS_SECRET` | Access-token signing. ≥32 chars, no placeholders | R | Dashboard (secret) |
| `JWT_REFRESH_SECRET` | Refresh-token signing. Must differ from access secret | R | Dashboard (secret) |
| `CLIENT_URL` | Storefront origin; CORS default + email links | R | Dashboard, e.g. `https://touch-store.onrender.com` |
| `CORS_ORIGINS` | Extra allowed origins (comma-separated) | O | Dashboard, only for a custom domain |
| `COOKIE_DOMAIN` | Cookie scope | O | Only with a shared parent domain |
| `ACCESS_TOKEN_TTL` / `REFRESH_TOKEN_TTL` / `REFRESH_TOKEN_TTL_MS` / `JWT_ISSUER` | Token lifetimes | O | Defaults fine |
| `RAZORPAY_KEY_ID` | Publishable key, sent to browser | O | Dashboard |
| `RAZORPAY_KEY_SECRET` | Order creation + signature verification | O | Dashboard (secret) |
| `RAZORPAY_WEBHOOK_SECRET` | Webhook HMAC. Without it webhook reconciliation is off | O | Dashboard (secret) |
| `CLOUDINARY_CLOUD_NAME` / `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET` | Persistent image storage | O (**effectively required in prod**) | Dashboard (secret) |
| `CLOUDINARY_FOLDER` | Asset folder | O | default `touch/products` |
| `API_PUBLIC_URL` | This API's own public origin. Only used when Cloudinary is **not** configured, to make locally stored image URLs absolute. Configure Cloudinary instead if you can | O | Dashboard, e.g. `https://touch-api.onrender.com` |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_SECURE` / `SMTP_USER` / `SMTP_PASS` / `MAIL_FROM_EMAIL` | Password reset + order email. All four of host/user/pass/from needed to enable | O | Dashboard (pass = secret) |
| `MAIL_FROM_NAME` | Sender name | O | render.yaml = TOUCH |
| `STORE_NAME`, `STORE_CURRENCY`, `FREE_SHIPPING_THRESHOLD`, `SHIPPING_FLAT_RATE`, `TAX_RATE`, `TAX_INCLUSIVE`, `COD_ENABLED`, `COD_MAX_ORDER_VALUE`, `MAX_QTY_PER_ITEM`, `ORDER_CANCEL_WINDOW_HOURS`, `LOW_STOCK_THRESHOLD` | Commerce config (not secrets) | O | render.yaml |
| `LOG_LEVEL` | Logging | O | render.yaml = info |
| `ADMIN_NAME` / `ADMIN_EMAIL` / `ADMIN_PASSWORD` | Used **only** by `npm run seed:admin`; remove after first run | O | Set temporarily, then delete |

### Frontend — `touch-store` (Render Static Site → Environment)

| Variable | Purpose | Req | Where set |
|---|---|---|---|
| `VITE_API_URL` | Full API base incl. `/api`, e.g. `https://touch-api.onrender.com/api`. Empty = same-origin `/api` (not our case) | R | Dashboard (build-time, public) |
| `VITE_FREE_SHIPPING_THRESHOLD` | Must match the API's `FREE_SHIPPING_THRESHOLD` | O | render.yaml = 1499 |
| `VITE_SHIPPING_FLAT_RATE` | Must match the API's `SHIPPING_FLAT_RATE` | O | render.yaml = 79 |
| `VITE_RETURN_WINDOW_DAYS` | Return window quoted in site copy. Not enforced by code — a business policy | O | render.yaml = 7 |
| `VITE_ORDER_CANCEL_WINDOW_HOURS` | Must match the API's `ORDER_CANCEL_WINDOW_HOURS` | O | render.yaml = 24 |

> The four `VITE_*` commerce values are **display copies** of settings the API
> enforces. They are baked into the bundle at build time. If you change a value
> on the API, change it here too and redeploy the storefront — otherwise the
> site advertises one shipping threshold and charges another.

Everything `VITE_*` is inlined into the bundle and is public. Never put a secret there.

---

## Deploy order

1. **MongoDB Atlas** — create free M0 cluster (region: Mumbai/Singapore), DB user with
   `readWrite` on database `touch`, Network Access `0.0.0.0/0` (Render free tier has no
   static outbound IP). Copy the SRV URI and append the DB name: `...mongodb.net/touch?retryWrites=true&w=majority`.
2. **Generate JWT secrets** (two different values):
   `node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"`
3. **Render Blueprint** — New → Blueprint → point at this repo. It reads `render.yaml`
   and creates both services, prompting for every `sync: false` value.
4. Set `CLIENT_URL` on the API to the storefront URL Render assigns, and `VITE_API_URL`
   on the storefront to `<api-url>/api`. Redeploy the storefront after changing it —
   Vite bakes it in at build time.
5. **Indexes** — production has `autoIndex` disabled by design. Run once from the API
   service's Render Shell: `npm run indexes`
6. **Admin user** — set `ADMIN_EMAIL`/`ADMIN_PASSWORD`, run `npm run seed:admin` in the
   Shell, then delete those two variables.
7. **Razorpay webhook** — dashboard → Webhooks → URL `https://<api>/api/payments/webhook`,
   events `payment.captured`, `payment.failed`. Copy the webhook secret into
   `RAZORPAY_WEBHOOK_SECRET`. The route is mounted on the raw body before `express.json()`,
   so the HMAC verifies correctly.

Do **not** run `npm run seed` or `npm run seed:destroy` against the production database —
they are destructive.

## Verify after deploy

- `curl https://<api>/health` → `{"status":"ok","database":"connected","environment":"production"}`
- Storefront homepage loads, product list populates (proves CORS + `VITE_API_URL`).
- Deep-link refresh on `/product/<slug>` returns the app, not 404 (SPA rewrite).
- Login works and survives a page refresh (proves the `SameSite=None; Secure` refresh cookie).

---

## Monitoring and keep-alive

### The health endpoint

`GET /health` is public, unauthenticated, and mounted **before** the rate limiter,
so probes are never throttled. It does no database query — it reads the mongoose
connection state that the driver already maintains — so it is safe to call as
often as you like.

```
GET https://<api>/health
```

| Condition | Status | Body |
|---|---|---|
| Database connected | `200` | `{"status":"ok","uptime":…,"database":"connected","environment":"production","timestamp":…}` |
| Database not connected | `503` | `{"status":"degraded",…,"database":"disconnected",…}` |

The non-2xx on an unhealthy database is deliberate: Render's `healthCheckPath`
and any external monitor both treat it as down, which is correct — an API that
cannot reach its database cannot serve orders.

### External uptime monitoring (recommended)

There is **no internal self-pinging**, and none should be added. A process that
pings itself cannot detect its own death, keeps a free instance awake by burning
the very quota it is trying to preserve, and is invisible when it fails. Use an
external monitor instead:

| Setting | Value |
|---|---|
| Service | [UptimeRobot](https://uptimerobot.com) free tier (or Better Stack, Cronitor, Pingdom) |
| Monitor type | HTTP(s) |
| URL | `https://<api>/health` |
| Interval | 5 minutes |
| Alert on | Non-2xx response, or timeout |

Point the alert at the email address the store owner actually reads.

### What this does and does not buy you

**Honest limitation.** A 5-minute external ping keeps a Render *free* web service
awake most of the time, but it is a workaround, not a substitute for a paid
always-on instance:

- Render free instances are **still** subject to monthly free-tier instance-hour
  limits. Continuous pinging consumes those hours faster, and the service stops
  when they run out.
- There is a window between the last ping and the next in which the instance can
  still be reaped. A customer arriving in that window waits ~30–50 s for the cold
  start — often long enough to leave.
- Free instances get no guaranteed CPU or memory, and Render may restart them at
  any time for platform reasons. Uptime monitoring reports this; it does not
  prevent it.
- Some providers explicitly discourage keep-alive pinging of free tiers. Check
  the current terms before relying on it.

For a store taking real money, the honest recommendation is the **Starter plan
($7/month)** for the API service. It never sleeps, and the cold-start problem
disappears entirely. Keep the external monitor either way — it is how you find
out the site is down before a customer tells you.

---

## Backup and recovery

Nothing in this repository backs up your data. Set this up before you take a
real order.

### MongoDB Atlas

- **M0 (free) has no automated backups.** This is the single biggest operational
  gap on the free tier. A dropped collection or a bad script is unrecoverable.
- Either upgrade to **M10+** (continuous cloud backup with point-in-time restore),
  or take a scheduled manual dump:

  ```bash
  mongodump --uri "<MONGO_URI>" --gzip --archive=touch-$(date +%F).gz
  ```

  Run it on a machine you control (a laptop or a cheap VPS cron), keep at least
  30 days of archives off-site, and **test a restore at least once** — an untested
  backup is a guess:

  ```bash
  mongorestore --uri "<TARGET_URI>" --gzip --archive=touch-2026-01-01.gz
  ```

- Turn on Atlas alerts for connection and storage thresholds.

### What must survive

| Data | Where | Recovery |
|---|---|---|
| Orders, users, coupons, reviews | MongoDB | From the dump above. **Orders snapshot their line items, prices and address**, so they stay readable even if the product is later renamed, repriced or archived |
| Product images | Cloudinary | Cloudinary retains them independently; keep the account credentials safe. Local-disk uploads are **ephemeral on Render and are lost on every redeploy** |
| Secrets (JWT, Razorpay, SMTP, Atlas) | Render dashboard only | Not in git by design. Keep a copy in a password manager — losing `JWT_*` signs every customer out; losing the Atlas password locks you out of the data |
| Payment records | Razorpay dashboard | Independent of this app; reconcile against it |

### Restore drill

1. Restore the dump into a fresh Atlas cluster.
2. Point a staging copy of the API at it and check `/health`.
3. Sign in, open an order, confirm the line items and totals are intact.

---

## Before you go live — content and domain checklist

These are deliberately left as placeholders in the repo. Nothing here is a bug;
each one is a decision the business owner has to make.

- [ ] `frontend/public/robots.txt` — replace `https://www.example.com/sitemap.xml`
      with the real domain.
- [ ] `frontend/public/sitemap.xml` — replace every `https://www.example.com` `<loc>`
      with the real domain.
- [ ] `frontend/index.html` — replace `https://www.example.com` in `og:image`,
      `og:url` and `twitter:image`. These must be absolute URLs or link previews
      on WhatsApp, Facebook and X show no image.
- [ ] `frontend/public/logo.jpg` — currently also used as the favicon and the
      social share image. Confirm it is the real logo and that it looks right
      cropped to a square.
- [ ] **Policy pages** (`frontend/src/pages/Static.jsx`) — the numbers come from
      configuration, but the prose is placeholder and is flagged as such in the
      file. Confirm with the owner: dispatch time, refund processing time,
      contact response time, studio address, support email, hygiene exclusions,
      and whether "final sale" exists at all (nothing in the product model marks
      it today).
- [ ] **Demo catalogue** — `backend/seed/catalogue.js` products use Unsplash
      placeholder photography. Replace with the shop's own images via
      Admin → Products, or clear the demo data, before launch.
- [ ] `STORE_NAME`, `MAIL_FROM_EMAIL` and the support address in the site copy
      should all agree.
- [ ] Confirm `TAX_RATE` / `TAX_INCLUSIVE` with the owner's accountant. The
      default (5% GST, inclusive) matches common Indian apparel retail, but it is
      a default, not advice.
