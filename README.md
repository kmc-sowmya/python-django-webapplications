# Northstar Commerce

A full-stack embroidery business management application with a React dashboard, a Django JSON API, and a relational SQLite database. The current starter workflow can be run locally; new orders reserve inventory in the database.

## Requirements

- Python 3.10+
- Node.js 20.19+ (or 22.12+)

## Run locally

Open two terminals from this project folder.

**1. Django API and database**

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
python manage.py migrate
python manage.py seed_demo
python manage.py runserver 8000
```

**2. React dashboard**

```powershell
cd frontend
npm install
npm run dev
```

Open the Vite URL printed in the second terminal (normally http://localhost:5173). The Vite development server proxies `/api` requests to Django at port 8000.

## Features

- See recent sales, seven-day sales totals, and products that need restocking
- Search and filter sales, then export the list as a CSV file
- Add products and track their price and available stock
- Record a sale with an optional customer email; stock is checked and updated automatically
- Django admin at http://127.0.0.1:8000/admin/
- Seed command can be rerun without duplicating demo orders
- GitHub Actions promotion pipeline for DEV, SI, QA, UAT, and PROD

## Project layout

- `frontend/src/components/` contains the navigation, sales/product tables, and entry forms
- `frontend/src/lib/` contains API requests and shared formatting helpers
- `backend/store/` contains the database models, API views, tests, and demo-data command
- `backend/config/` contains Django settings and URL configuration

## API

- `GET /api/health/`
- `GET /api/summary/`
- `GET|POST /api/products/`
- `GET|POST /api/orders/`

Run the API tests with `python manage.py test` from `backend`.

## Pipeline deployments

`.github/workflows/deploy.yml` runs tests and frontend lint/build on pull requests. A push to `main` builds one release artifact and promotes that same artifact through `DEV -> SI -> QA -> UAT -> PROD`. Each stage runs a health check that also verifies its database connection. Django applies that environment's migrations when its App Service starts.

Before the pipeline can deploy:

1. Put this project in a GitHub repository and push the `main` branch. This workspace currently has no Git repository configured.
2. Create one Linux Azure App Service using Python 3.12 for each environment (`DEV`, `SI`, `QA`, `UAT`, `PROD`). Use a separate PostgreSQL database and credentials for each environment, and allow each App Service to reach its database.
3. Create GitHub Environments with those exact uppercase names.
4. In each GitHub Environment, add these variables:
	- `AZURE_RESOURCE_GROUP`: Azure resource group containing that App Service
	- `AZURE_WEBAPP_NAME`: that environment's unique App Service name
	- `APP_URL`: its HTTPS base URL, for example `https://northstar-dev.azurewebsites.net`
	- `DJANGO_ALLOWED_HOSTS`: hostname only, without scheme
	- `CSRF_TRUSTED_ORIGINS`: full HTTPS origin, without a trailing slash
5. Add these secrets to each GitHub Environment:
	- `DATABASE_URL`: that environment's PostgreSQL URL, for example `postgresql://user:password@server:5432/northstar?sslmode=require`
	- `DJANGO_SECRET_KEY`: a unique, strong Django secret for that environment
6. Add repository Actions secrets `AZURE_CLIENT_ID`, `AZURE_TENANT_ID`, and `AZURE_SUBSCRIPTION_ID`. Configure Azure federated credentials for the repository's GitHub identity and each environment subject: `repo:OWNER/REPOSITORY:environment:DEV` (repeat for `SI`, `QA`, `UAT`, and `PROD`). The identity needs permission to deploy to all five App Services.
7. Configure required reviewers and restrict deployment branches to `main` for the `UAT` and `PROD` environments. GitHub pauses those stages until an authorized reviewer approves.

The `PROD` job is intentionally skipped unless the repository Actions variable `PROD_DEPLOY_ENABLED` is set to `true`. Do not enable it until application authentication and authorization have been implemented and reviewed: the demo API currently allows unauthenticated writes. Keep production secrets in GitHub/Azure secret stores, never in the repository.

## Production note

Local development uses SQLite and the Vite dev server. Deployed environments use PostgreSQL, HTTPS, environment-specific secret keys, allowed hosts, and CSRF trusted origins. The API remains intentionally unauthenticated until a real sign-in and authorization layer is added; keep PROD deployments disabled until then.
