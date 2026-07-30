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

- GET /analytics/health
- GET /analytics/overview
- GET /analytics/vehicles
- GET /analytics/alerts
- GET /analytics/report
- GET /analytics/ai
