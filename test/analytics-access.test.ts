import 'reflect-metadata';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { test } from 'node:test';
import { Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AnalyticsController } from '../src/analytics/analytics.controller';
import { MaintenanceSchedulesController } from '../src/analytics/maintenance-schedules.controller';
import { AnalyticsService } from '../src/analytics/analytics.service';
import { SyncService } from '../src/analytics/sync.service';
import { AnalyticsAccessModule } from '../src/auth/analytics-access.module';

let businessCalls = 0;
const detail = {
  scheduleId: 'owned', title: 'Oil change', vehiclePlate: 'ABC-123',
  workOrder: {
    scheduleId: 'owned', maintenanceTitle: 'Oil change', status: 'DONE',
    partsCost: 100, laborCost: 200, totalCost: 300,
    workOrderProgress: { materialCost: 500 }, futureFinancialField: 900,
  },
  checklist: [{ stepNumber: 1, title: 'Inspect', description: 'Check oil', priority: 'HIGH', cost: 20 }],
  aiRecommendations: 'Inspect oil.', fleetTotalCost: 9999,
};
const methods = ['getHealth', 'getOverview', 'getPredictiveForecast', 'getAnomalies',
  'getExpandedTrends', 'getVehicleKpis', 'getAiInsights', 'getAlerts', 'getReport',
  'getWorkOrderSummary', 'getMechanicWorkload', 'getWorkOrderAiInsights',
  'getScheduleWorkOrders', 'searchMaintenanceSchedules'];
const analytics: Record<string, () => unknown> = Object.fromEntries(methods.map((name) => [name, () => {
  businessCalls++;
  return { status: 'ok' };
}]));
for (const name of ['getWorkOrderById', 'getWorkOrderRecommendations', 'getScheduleWithAi']) {
  analytics[name] = () => { businessCalls++; return structuredClone(detail); };
}

@Module({
  imports: [AnalyticsAccessModule],
  controllers: [AnalyticsController, MaintenanceSchedulesController],
  providers: [
    { provide: AnalyticsService, useValue: analytics },
    { provide: SyncService, useValue: { syncNow: () => { businessCalls++; return { synced: true }; } } },
  ],
})
class TestAppModule {}

test('analytics HTTP authorization and response boundaries', async (t) => {
  const users: Record<string, any> = {};
  for (const role of ['ADMIN', 'OPERATIONS', 'MECHANIC', 'CHIEF_MECHANIC']) {
    users[role] = { id: role, isActive: true, isLocked: false, lockedAt: null, roles: [{ role, system: 'VMMS' }] };
  }
  users.otherSystem = { ...users.ADMIN, roles: [{ role: 'ADMIN', system: 'VRMS' }] };
  users.crossSystem = { ...users.MECHANIC, roles: [...users.MECHANIC.roles, { role: 'ADMIN', system: 'BMS' }] };
  users.multipleRoles = { ...users.MECHANIC, roles: [...users.MECHANIC.roles, { role: 'ADMIN', system: 'VMMS' }] };
  users.inactive = { ...users.ADMIN, isActive: false };
  users.locked = { ...users.ADMIN, isLocked: true, lockedAt: new Date().toISOString() };
  const schedules = [
    { id: 'owned', status: 'DONE', assignedMechanicId: 'MECHANIC', chiefMechanicId: 'CHIEF_MECHANIC' },
    { id: 'other', status: 'DONE', assignedMechanicId: 'other-user', chiefMechanicId: 'other-chief', assignedMechanic: 'MECHANIC' },
    { id: 'deleted', status: 'DONE', assignedMechanicId: 'MECHANIC', deletedAt: new Date().toISOString() },
  ];
  let coreCalls = 0;
  let coreMode = 'ok';
  const core = createServer((req, res) => {
    coreCalls++;
    assert.equal(new URL(req.url!, 'http://localhost').searchParams.get('system'), 'VMMS');
    res.setHeader('Content-Type', 'application/json');
    if (coreMode === 'error') { res.writeHead(500).end('{}'); return; }
    if (coreMode === 'invalidJson') { res.end('invalid'); return; }
    if (coreMode === 'redirect') { res.writeHead(302, { Location: '/elsewhere' }).end(); return; }
    const token = req.headers.authorization?.split(' ')[1] ?? '';
    if (token === 'forbidden') { res.writeHead(403).end('{}'); return; }
    if (!users[token]) { res.writeHead(401).end('{}'); return; }
    if (req.url?.startsWith('/auth/me')) {
      res.end(JSON.stringify(users[token]));
    } else if (req.url?.startsWith('/maintenance-schedules')) {
      // Deliberately return all rows: analytics must independently compare IDs.
      res.end(JSON.stringify(coreMode === 'badSchedules' ? { schedules } : schedules));
    } else { res.writeHead(404).end('{}'); }
  });
  await new Promise<void>((resolve) => core.listen(0, '127.0.0.1', resolve));
  const previousBase = process.env.VMMS_API_BASE_URL;
  process.env.VMMS_API_BASE_URL = `http://127.0.0.1:${(core.address() as { port: number }).port}`;
  const app = await NestFactory.create(TestAppModule, { logger: false });
  app.setGlobalPrefix('analytics', { exclude: ['maintenance-schedules/search', 'maintenance-schedules/(.*)'] });
  await app.listen(0, '127.0.0.1');
  const base = await app.getUrl();
  const request = (path: string, token?: string, method = 'GET') => fetch(`${base}${path}`, {
    method, headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  const denied = async (path: string, token: string | undefined, status: number, method = 'GET') => {
    const before = businessCalls;
    assert.equal((await request(path, token, method)).status, status, `${method} ${path}, ${token}`);
    assert.equal(businessCalls, before, 'Denied calls must not query analytics or generate AI output');
  };
  try {
    await t.test('health is public; malformed or missing bearer headers are rejected before core access', async () => {
      assert.equal((await request('/analytics/health')).status, 200);
      assert.equal(coreCalls, 0);
      await denied('/analytics/overview', undefined, 401);
      const response = await fetch(`${base}/analytics/overview`, { headers: { Authorization: 'Basic abc', Origin: 'http://admin', 'X-Role': 'ADMIN' } });
      assert.equal(response.status, 401);
      assert.equal(coreCalls, 0);
    });
    const fleetPaths = ['overview', 'vehicles', 'insights', 'alerts', 'report', 'workorders',
      'workorders/mechanics', 'workorders/ai-insights', 'workorders/list?mechanic=MECHANIC'];
    await t.test('every fleet endpoint and legacy alias rejects mobile roles and permits management', async () => {
      for (const prefix of ['/analytics/', '/analytics/analytics/']) {
        for (const path of fleetPaths) {
          await denied(prefix + path, undefined, 401);
          for (const role of ['MECHANIC', 'CHIEF_MECHANIC']) await denied(prefix + path, role, 403);
          for (const role of ['ADMIN', 'OPERATIONS']) assert.equal((await request(prefix + path, role)).status, 200);
        }
      }
      await denied('/maintenance-schedules/search?q=MECHANIC', 'MECHANIC', 403);
      assert.equal((await request('/maintenance-schedules/search', 'OPERATIONS')).status, 200);
    });
    await t.test('sync and its alias require Admin', async () => {
      for (const path of ['/analytics/sync', '/analytics/analytics/sync']) {
        await denied(path, undefined, 401, 'POST');
        for (const role of ['OPERATIONS', 'MECHANIC', 'CHIEF_MECHANIC']) await denied(path, role, 403, 'POST');
        assert.equal((await request(path, 'ADMIN', 'POST')).status, 201);
      }
    });
    const detailRoutes = [
      ['/analytics/workorders/item/', '', 'GET'],
      ['/analytics/analytics/workorders/item/', '', 'GET'],
      ['/analytics/workorders/recommendations/', '', 'GET'],
      ['/analytics/workorders/recommendations/', '', 'POST'],
      ['/maintenance-schedules/', '', 'GET'],
      ['/maintenance-schedules/', '/ai', 'GET'],
    ];
    await t.test('all detail/advisory routes check current assignment and filter mobile responses', async () => {
      for (const [prefix, suffix, method] of detailRoutes) {
        await denied(prefix + 'owned' + suffix, undefined, 401, method);
        for (const role of ['MECHANIC', 'CHIEF_MECHANIC']) {
          for (const id of ['other', 'missing', 'deleted']) await denied(prefix + id + suffix, role, 403, method);
          const response = await request(prefix + 'owned' + suffix, role, method);
          assert.ok(response.ok);
          const body = await response.json() as any;
          assert.equal(body.workOrder.maintenanceTitle, 'Oil change');
          assert.equal(body.workOrder.totalCost, role === 'MECHANIC' ? undefined : 300);
          assert.equal(body.workOrder.laborCost, role === 'MECHANIC' ? undefined : 200);
          assert.equal(body.workOrder.partsCost, role === 'MECHANIC' ? undefined : 100);
          assert.equal(body.workOrder.workOrderProgress, undefined);
          assert.equal(body.workOrder.futureFinancialField, undefined);
          assert.equal(body.fleetTotalCost, undefined);
          assert.equal(body.checklist[0].cost, undefined);
        }
        assert.ok((await request(prefix + 'other' + suffix, 'ADMIN', method)).ok);
        await denied(prefix + 'missing' + suffix, 'ADMIN', 403, method);
      }
    });
    await t.test('Chief Mechanic costs are hidden before submission; reassignment takes effect immediately', async () => {
      schedules[0].status = 'IN_PROGRESS';
      const body = await (await request('/analytics/workorders/item/owned', 'CHIEF_MECHANIC')).json() as any;
      assert.equal(body.workOrder.totalCost, undefined);
      schedules[0].assignedMechanicId = 'replacement';
      await denied('/analytics/workorders/item/owned', 'MECHANIC', 403);
      schedules[0].assignedMechanicId = 'MECHANIC';
      schedules[0].chiefMechanicId = 'replacement-chief';
      await denied('/analytics/workorders/item/owned', 'CHIEF_MECHANIC', 403);
      schedules[0].chiefMechanicId = 'CHIEF_MECHANIC';
    });
    await t.test('invalid, revoked, cross-system and ambiguous roles fail closed', async () => {
      for (const token of ['expired', 'forged', 'inactive', 'locked']) await denied('/analytics/overview', token, 401);
      for (const token of ['otherSystem', 'crossSystem', 'multipleRoles', 'forbidden']) await denied('/analytics/overview', token, 403);
      assert.equal((await request('/analytics/overview', 'ADMIN')).status, 200);
      users.ADMIN.isActive = false;
      await denied('/analytics/overview', 'ADMIN', 401);
      users.ADMIN.isActive = true;
      users.ADMIN.roles = [{ role: 'MECHANIC', system: 'VMMS' }];
      await denied('/analytics/overview', 'ADMIN', 403);
    });
    await t.test('upstream failures, redirects and invalid payloads never fall back to public data', async () => {
      for (const mode of ['error', 'invalidJson', 'redirect']) {
        coreMode = mode;
        await denied('/analytics/overview', 'OPERATIONS', 503);
      }
      coreMode = 'badSchedules';
      await denied('/analytics/workorders/item/owned', 'MECHANIC', 503);
      coreMode = 'ok';
    });
  } finally {
    await app.close();
    await new Promise<void>((resolve, reject) => core.close((error) => error ? reject(error) : resolve()));
    if (previousBase === undefined) delete process.env.VMMS_API_BASE_URL;
    else process.env.VMMS_API_BASE_URL = previousBase;
  }
});
