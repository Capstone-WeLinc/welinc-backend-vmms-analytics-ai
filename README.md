# welinc-backend-vmms-analytics-ai

Standalone VMMS analytics and AI microservice for DuckDB-backed reporting and pgvector-based semantic maintenance search.

## Purpose

This project is a separate service boundary from the main backend. It exposes analytics endpoints independently and can be deployed, scaled, or restarted without affecting the core VMMS API.

## Run

```bash
npm install
npm run migrate
npm run start:dev
```

The service reads the shared DuckDB mart from ../database/vmms_datamart.duckdb by default.

If the analytics database is not yet prepared, `npm run migrate` will initialize the DuckDB analytics snapshot and reporting tables.

## Service endpoints

Business endpoints require the existing VMMS bearer token. Set
`VMMS_API_BASE_URL` to the core backend (default `http://localhost:3000`;
Docker Compose uses `http://backend-vmms:3000`). Every request checks the current
account with `/auth/me`; work-order details also verify the current assignment
with `/maintenance-schedules`. If verification fails or the core API is unavailable,
analytics denies access rather than relying on stale roles or assignments.

Fleet summaries, searches, reports and aggregate AI insights require Admin or
Operations. Manual sync requires Admin. Mechanic and Chief Mechanic can access
only their assigned work-order detail/advisory endpoints. Mechanic responses omit
financial fields; Chief Mechanic receives individual costs only for submitted
(`DONE`) or approved (`COMPLETED`) work. Only `/analytics/health` is public.
These controls apply to the legacy route aliases too.

Run `npm run test:auth` for HTTP authorization tests using a local stub core API;
the tests require no database, SMS delivery, or AI provider.

- GET /analytics/health
- GET /analytics/overview
- GET /analytics/vehicles
- GET /analytics/alerts
- GET /analytics/report
- GET /analytics/ai
