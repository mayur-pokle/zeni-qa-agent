# Flowtest QA Agent Workspace

This project is now split into two deployable apps inside the same repository:

- [`frontend/`](/Users/mayurpokle/Desktop/QA%20Agent/frontend)
  Frontend UI app for GitHub-hosted source control and frontend deployment
- [`backend/`](/Users/mayurpokle/Desktop/QA%20Agent/backend)
  Railway-ready backend app with API routes, Prisma, PostgreSQL, scheduler, Playwright, and Lighthouse

## Folder Structure

```text
QA Agent/
├── frontend/
│   ├── app/
│   ├── components/
│   ├── lib/
│   ├── public/
│   └── package.json
├── backend/
│   ├── app/api/
│   ├── alerts/
│   ├── lib/
│   ├── monitoring/
│   ├── playwright/
│   ├── prisma/
│   ├── scripts/
│   ├── tests/
│   ├── Dockerfile
│   ├── railway.toml
│   └── package.json
└── package.json
```

## What Lives Where

### Frontend

The frontend folder contains:

- dashboard and project UI
- login/logout routes
- forms and controls
- backend-aware data client
- API rewrites to the backend service

The frontend does not own:

- Prisma
- scheduler
- Playwright runs
- Lighthouse runs
- monitoring jobs
- SMTP delivery

### Backend

The backend folder contains:

- all app API routes
- Prisma schema and seed
- PostgreSQL access
- QA runner
- scheduler worker
- Lighthouse report endpoint
- SMTP and Slack alert logic

## Root Workspace Commands

From the repo root:

```bash
npm run frontend:dev
npm run frontend:build
npm run backend:dev
npm run backend:build
npm run backend:worker
```

## Frontend Setup

Path:

- [/Users/mayurpokle/Desktop/QA Agent/frontend](/Users/mayurpokle/Desktop/QA%20Agent/frontend)

Install:

```bash
cd frontend
npm install
```

Environment:

Copy `frontend/.env.example` to `frontend/.env.local`

```bash
APP_URL="http://localhost:3000"
BACKEND_API_URL="http://localhost:4000"
NEXT_PUBLIC_BACKEND_API_URL="http://localhost:4000"
DEMO_USER_EMAIL="owner@example.com"
```

Run:

```bash
npm run dev
```

## Backend Setup

Path:

- [/Users/mayurpokle/Desktop/QA Agent/backend](/Users/mayurpokle/Desktop/QA%20Agent/backend)

Install:

```bash
cd backend
npm install
```

Environment:

Copy `backend/.env.example` to `backend/.env`

```bash
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/qa_monitor?schema=public"
APP_URL="http://localhost:4000"
MONITOR_CRON_SECRET="change-me"
DEMO_USER_EMAIL="owner@example.com"
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="465"
SMTP_SECURE="true"
SMTP_USER=""
SMTP_PASS=""
SMTP_FROM=""
UPTIMEROBOT_API_KEY=""
SLACK_WEBHOOK_URL=""
```

Database bootstrap:

```bash
npx prisma db push
npx prisma generate
npm run db:seed
```

Run web API:

```bash
npm run dev
```

Run worker:

```bash
npm run worker
```

Install Playwright browsers:

```bash
npx playwright install --with-deps chromium firefox webkit
```

## GitHub Recommendation

Push the whole repo to GitHub as one monorepo.

```bash
git init
git add .
git commit -m "Split frontend and backend apps"
git branch -M main
git remote add origin https://github.com/<your-user>/<your-repo>.git
git push -u origin main
```

This gives you:

- one repository
- separate deploy roots
- easier shared versioning

## Railway Deployment

Deploy from:

- [/Users/mayurpokle/Desktop/QA Agent/backend](/Users/mayurpokle/Desktop/QA%20Agent/backend)

Recommended Railway services:

1. `flowtest-api`
   Runs the backend web app

2. `flowtest-worker`
   Runs the scheduler and recurring QA jobs

### Railway API Service

Root directory:

- `backend`

Build:

- Railway can use the included [`backend/Dockerfile`](/Users/mayurpokle/Desktop/QA%20Agent/backend/Dockerfile)

Start command:

```bash
npm run start
```

Environment variables:

```bash
DATABASE_URL=<railway-postgres-url>
APP_URL=https://<railway-backend-domain>
MONITOR_CRON_SECRET=<long-random-secret>
DEMO_USER_EMAIL=<admin-email>
UPTIMEROBOT_API_KEY=<optional>
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=<gmail-address>
SMTP_PASS=<gmail-app-password>
SMTP_FROM=<from-email>
SLACK_WEBHOOK_URL=<optional>
```

### Railway Worker Service

Root directory:

- `backend`

Start command:

```bash
npm run worker
```

Use the same environment variables as the API service, especially:

- `DATABASE_URL`
- `SMTP_*`
- `UPTIMEROBOT_API_KEY`
- `MONITOR_CRON_SECRET`

After first deployment, run:

```bash
npx prisma db push
npm run db:seed
```

## Frontend Deployment

The frontend is prepared to call the backend by URL and by rewrite rules.

If you deploy the frontend separately, use:

- Root directory: `frontend`

Frontend environment variables:

```bash
APP_URL=https://<frontend-domain>
BACKEND_API_URL=https://<railway-backend-domain>
NEXT_PUBLIC_BACKEND_API_URL=https://<railway-backend-domain>
DEMO_USER_EMAIL=<same-admin-email>
```

## Current Login

The UI still uses the demo login:

- User ID: `Mayur`
- Password: `1234`

## Important Notes

- The old root-level files are still present as a safety net, but the new canonical deploy targets are `frontend/` and `backend/`.
- The backend is the only place that should connect to PostgreSQL and run Playwright/Lighthouse.
- For long-term production, store report artifacts in object storage rather than local disk.
