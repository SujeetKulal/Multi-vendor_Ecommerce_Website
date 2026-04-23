# Multi-vendor_Ecommerce_Website
A scalable, full-stack multi-vendor e-commerce ecosystem. Features independent vendor portals, admin moderation workflows, and a modern customer experience built with Django REST Framework, React (Vite), and PostgreSQL.

# Multi-Vendor Ecommerce Website

Scaffolded full-stack marketplace based on `PROJECT_SPEC.md`.

## Structure

- `backend/` Django 5 + DRF + JWT APIs
- `frontend/` React (Vite) + Tailwind starter app

## Backend Setup

1. Create and activate a virtual environment.
2. Install dependencies:
   - `pip install -r backend/requirements.txt`
3. Copy env file:
   - `copy backend\\.env.example backend\\.env`
4. Update DB credentials in `.env`.
   - Local Postgres: use `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_HOST`, `DB_PORT`.
   - Supabase: set `DATABASE_URL` (recommended) and include `sslmode=require` in the URL (or set `DB_SSLMODE=require` when using DB_* fields).
5. Run migrations:
   - `cd backend`
   - `python manage.py makemigrations`
   - `python manage.py migrate`
6. Create admin user:
   - `python manage.py createsuperuser`
7. Start API:
   - `python manage.py runserver`

## Frontend Setup

1. Install dependencies:
   - `cd frontend`
   - `npm install`
2. Copy env file:
   - `copy .env.example .env`
3. Start dev server:
   - `npm run dev`

## Implemented API Areas

- Auth:
  - `POST /api/accounts/register/`
  - `POST /api/auth/token/`
  - `POST /api/auth/token/refresh/`
  - `GET/PATCH /api/accounts/me/`
  - `GET /api/accounts/admin/users/` (admin)
  - `PATCH /api/accounts/admin/users/{id}/` (admin)
- Vendor:
  - `GET/PATCH /api/vendors/me/`
  - `GET /api/vendors/` (admin)
  - `PATCH /api/vendors/{id}/approve/` (admin)
- Products:
  - `GET /api/products/` (public with `search` and `category`)
  - `GET /api/products/categories/`
  - `GET/POST /api/products/{id}/reviews/` (POST allowed only for delivered purchases by customer)
  - `GET /api/products/mine/` (approved vendor)
  - `GET /api/products/low_stock/?threshold=5` (approved vendor)
  - `PATCH /api/products/bulk_stock_update/` (approved vendor)
  - CRUD `POST/PUT/PATCH/DELETE /api/products/{id}/` (approved vendor owner only, includes `sale_price`)
- Orders:
  - `POST /api/orders/checkout/` (customer)
  - `GET /api/orders/my-orders/` (customer)
  - `GET /api/orders/vendor/items/` (vendor)
  - `PATCH /api/orders/vendor/items/{id}/status/` (vendor owner only)
  - `GET /api/orders/vendor/financials/` (vendor)
  - `GET /api/orders/vendor/analytics/?start_date=YYYY-MM-DD&end_date=YYYY-MM-DD` (vendor)
  - `GET /api/orders/admin/all/` (admin)
  - `PATCH /api/orders/admin/{id}/status/` (admin)
- Analytics:
  - `GET /api/analytics/admin-metrics/` (admin)

## Notes

- Vendor registration auto-creates `VendorProfile` with `is_approved=False`.
- Product image uploads are enabled via Django media settings.
- Checkout uses an atomic transaction and decrements stock safely.
- For Render deployment with `DEBUG=False`, use:
  - Build Command: `pip install -r backend/requirements.txt && python backend/manage.py collectstatic --noinput && python backend/manage.py migrate --noinput`
  - Start Command: `gunicorn backend.config.wsgi:application --chdir backend`
