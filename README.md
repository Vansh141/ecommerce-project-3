# TOUCH — fashion e-commerce

A production-ready storefront and admin panel for a small clothing business.
MERN stack: MongoDB + Express + React + Node.

---

## Quick start

```bash
npm run install:all
```

Then create `backend/.env` from the template:

```bash
cp backend/.env.example backend/.env
```

Generate the two required secrets and paste them in:

```bash
node -e "console.log('JWT_ACCESS_SECRET=' + require('crypto').randomBytes(48).toString('base64url'))"
```

```bash
node -e "console.log('JWT_REFRESH_SECRET=' + require('crypto').randomBytes(48).toString('base64url'))"
```

Set `MONGO_URI` (local MongoDB or a free Atlas cluster), then:

```bash
npm run seed
```

Create your admin account — set `ADMIN_EMAIL` and `ADMIN_PASSWORD` in `.env` first, run this once, then blank them out again:

```bash
npm run seed:admin
```

Start both servers:

```bash
npm run dev
```

Storefront on `http://localhost:5173`, API on `http://localhost:5000`.

---

## Architecture

```
backend/
  config/       env validation (fails fast), database connection
  models/       User, Product, Category, Order, Coupon, Review, …
  services/     order, pricing, inventory, coupon, payment, email, storage, token
  controllers/  thin HTTP layer over the services
  middleware/   auth, validation, rate limiting, sanitising, error handling
  validators/   express-validator chains
  seed/         catalogue seeder, admin bootstrap, index builder
  tests/        137 tests (Vitest + Supertest + in-memory MongoDB)

frontend/
  api/          axios client + typed endpoint modules
  components/   ui primitives, layout, product, account
  context/      Auth, Cart, Wishlist, Toast
  pages/        storefront + admin
  hooks/        data fetching, debounce, document metadata
```

### Security model

The rules that matter, and where they are enforced:

| Rule | Enforced in |
|---|---|
| Prices, discounts and totals are computed server-side only | `services/pricingService.js`, `orderService.js` |
| Quantities must be positive integers; duplicate lines merge | `orderService.normaliseRequestedItems` |
| Stock moves atomically — no overselling under concurrency | `inventoryService.reserveVariant` |
| Payments settle only on a verified HMAC signature | `paymentService.confirmPayment` |
| Webhooks verify against the **raw** request body | `app.js` (raw parser mounted before `express.json`) |
| Coupon value derives from the stored coupon, never the client | `couponService.validateCoupon` |
| Access tokens are short-lived and revocable via `tokenVersion` | `services/tokenService.js`, `middleware/auth.js` |
| Refresh token is httpOnly — unreadable by JavaScript | `tokenService.setRefreshCookie` |
| Uploads are magic-byte checked and re-encoded | `storageService.processImage` |
| Admin routes are protected server-side | `routes/index.js` (`protect, requireAdmin`) |

The frontend route guards are cosmetic. Every protected operation is enforced
by the API, and the test suite proves it.

---

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | Run API and storefront together |
| `npm test` | Backend test suite |
| `npm run lint` | Lint the frontend |
| `npm run build` | Production frontend build |
| `npm run verify` | Lint + test + build |
| `npm run audit` | `npm audit` on both projects |
| `npm run seed` | Add/update the demo catalogue (safe, additive) |
| `npm run seed -- --fresh` | Replace the catalogue entirely |
| `npm run seed:admin` | Create or promote the admin account |
| `npm run indexes` | Build database indexes (run once in production) |

The seeder refuses to run destructively against `NODE_ENV=production` without
an explicit `--force`, and never touches users or orders.

---

## Deployment

Free-tier friendly: MongoDB Atlas + Render. No Docker, no Kubernetes.

### 1. Database

Create a free **MongoDB Atlas M0** cluster. Add a database user, allow network
access from anywhere (`0.0.0.0/0` — Render has no static IP on free plans), and
copy the connection string.

### 2. Deploy

Push this repository to GitHub, then in Render choose **New → Blueprint** and
point it at `render.yaml`. It creates both services. Fill in the prompted
secrets:

**Required**
- `MONGO_URI` — Atlas connection string
- `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` — generate as shown above
- `CLIENT_URL` — the storefront URL, e.g. `https://touch-store.onrender.com`
- `VITE_API_URL` (on the static site) — e.g. `https://touch-api.onrender.com/api`

**Optional** — each one is a feature flag; leaving it blank disables that
feature cleanly rather than breaking the app:
- `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET` — without these, checkout is **cash on delivery only**
- `CLOUDINARY_*` — without these, uploads go to local disk, which is **wiped on every redeploy**
- `SMTP_*` — without these, no email is sent and the app says so honestly

### 3. After first deploy

```bash
npm run indexes
```

```bash
npm run seed:admin
```

Run both against the production `MONGO_URI` (locally with the env var set, or
from a Render shell).

### 4. Razorpay webhook

In the Razorpay dashboard, add a webhook pointing at:

```
https://your-api-host.onrender.com/api/payments/webhook
```

Subscribe to `payment.captured` and `payment.failed`, then put the signing
secret in `RAZORPAY_WEBHOOK_SECRET`.

### 5. Before launch

- Replace the demo Unsplash images in Admin → Products with your own photography
- Update `frontend/public/robots.txt` and `sitemap.xml` with your real domain
- Confirm `/health` returns `{"status":"ok"}`

---

## Notes and limitations

- **SEO** — metadata is set at runtime, which works for crawlers that execute
  JavaScript and for link previews. This is not equivalent to server-side
  rendering; if organic search becomes a primary channel, move to SSR.
- **Free tier** — Render free services sleep when idle, so the first request
  after a quiet period is slow. Upgrade the API service before real traffic.
- **Demo images** — the seed catalogue uses Unsplash placeholders. They are
  clearly marked and meant to be replaced.

## Licence

MIT
