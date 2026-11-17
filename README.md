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

Business endpoints require a VMMS bearer token. Analytics validates its
signature and audience against welinc-auth's published keys and checks session
status directly with welinc-auth. Set `VMMS_API_BASE_URL` to the core API
(Docker Compose uses `http://vmms-backend:3010/vmms`). Assigned work-order
details are checked against the core maintenance-schedules route using the
caller's own token.

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
