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
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_SECURE` / `SMTP_USER` / `SMTP_PASS` / `MAIL_FROM_EMAIL` | Password reset + order email. All four of host/user/pass/from needed to enable | O | Dashboard (pass = secret) |
| `MAIL_FROM_NAME` | Sender name | O | render.yaml = TOUCH |
| `STORE_NAME`, `STORE_CURRENCY`, `FREE_SHIPPING_THRESHOLD`, `SHIPPING_FLAT_RATE`, `TAX_RATE`, `TAX_INCLUSIVE`, `COD_ENABLED`, `COD_MAX_ORDER_VALUE`, `MAX_QTY_PER_ITEM`, `ORDER_CANCEL_WINDOW_HOURS`, `LOW_STOCK_THRESHOLD` | Commerce config (not secrets) | O | render.yaml |
| `LOG_LEVEL` | Logging | O | render.yaml = info |
| `ADMIN_NAME` / `ADMIN_EMAIL` / `ADMIN_PASSWORD` | Used **only** by `npm run seed:admin`; remove after first run | O | Set temporarily, then delete |

### Frontend — `touch-store` (Render Static Site → Environment)

| Variable | Purpose | Req | Where set |
|---|---|---|---|
| `VITE_API_URL` | Full API base incl. `/api`, e.g. `https://touch-api.onrender.com/api`. Empty = same-origin `/api` (not our case) | R | Dashboard (build-time, public) |

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
