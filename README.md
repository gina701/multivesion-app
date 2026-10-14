# Multivision Electronics & Investments — Shop Management PWA

This project contains the public website (`website/`) and the Node.js shop management app (`system/`). The management app is an installable Progressive Web App (PWA) served from the same Render service as its API.

## Features included
- Admin/staff login and role-limited actions
- Product catalogue, photos, selling prices, purchase costs, low-stock levels
- Inventory overview, stock valuation at purchase cost and retail value
- Stock intake and stock adjustments with reason/reference history
- Point of sale with payment method, customer/branch selection and fixed-amount discounts
- Sales history, transaction totals and returns (admin only)
- Expenses, customers, suppliers, lay-by records and branches
- Date-filtered sales report, cost of goods sold, gross profit, expenses, net profit/loss
- Printable reports (use Print / Save PDF)
- PWA manifest, app icons, install prompt and service-worker caching for the app shell
- JSON data files; optional GitHub JSON persistence/restore using environment variables

## Run locally
1. Install Node.js LTS.
2. Open a terminal in `system/`.
3. Run `npm install`.
4. Set `ADMIN_PASSWORD` and `JWT_SECRET` in your environment (see `.env.example`; Node does not automatically load `.env` unless a dotenv package is added).
5. Run `npm start` and open `http://localhost:3000/login.html`.

If no `ADMIN_PASSWORD` is set, the initial local default is `admin123` for the `admin` account. Change this before deployment. Existing users are not automatically reset when user data already exists.

## Deploy to Render
The included `render.yaml` defines the service with `rootDir: system`. If updating the existing Render service, keep its current service and URL and update the existing service settings/code rather than creating a new service. Set `ADMIN_PASSWORD` and a long random `JWT_SECRET` in Render Environment. Do not use the default credentials in production.

### Keep JSON data across deployments
Render's ordinary instance filesystem may be ephemeral. To keep JSON data beyond restarts/redeploys without a persistent disk, configure the optional GitHub sync variables in Render: `GITHUB_TOKEN`, `GITHUB_REPO` (`owner/repository`), `GITHUB_BRANCH` (usually `main`), and `GITHUB_DATA_PATH` (`system/data`). The repository should be **private**. Use a fine-grained GitHub token with Contents read/write access to that repository only. The app restores the JSON files at startup and commits changes back to GitHub. GitHub commits are not a transactional database; for busy multi-user operation, a managed database is safer. Do not put the token in browser JavaScript or commit it to the repository.

### Install on a phone
After deployment, open the Render URL in Chrome on Android, sign in, then use Chrome's menu → **Install app** or **Add to Home screen**. The app must be served over HTTPS.

## Important accounting note
Profit reports use purchase cost saved with each sale. Existing historical sales created before cost snapshots were added may not have an accurate cost of goods sold; review old purchase prices and records before using reports as formal accounts. Returns restore stock and are marked as returned; refund/payment reconciliation should be recorded in your normal business process.
