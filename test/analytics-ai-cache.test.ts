import assert from 'node:assert/strict';
import { test } from 'node:test';
import { AnalyticsService } from '../src/analytics/analytics.service';
import { createAnalyticsSourceRevision } from '../src/analytics/duckdb';

function createOverview(totalVehicles = 1) {
  return {
    dataSource: {
      type: 'test',
      authoritativeFor: 'analytics',
      generatedAt: '2026-11-27T00:00:00.000Z',
      sourceMaxUpdatedAt: '2026-11-26T00:00:00.000Z',
      ageSeconds: 0,
      isStale: false,
      maxAgeMinutes: 10,
    },
    snapshot: {
      snapshotKey: 'current',
      totalVehicles,
      totalSchedules: 1,
      totalMaintenanceCost: 10,
      activeMaintenanceVehicles: 0,
      pendingSchedules: 1,
      inProgressSchedules: 0,
      overdueSchedules: 0,
      completedSchedules: 0,
      dueWithin7Days: 0,
      averageOdometer: 0,
      fleetPerformance: 100,
    },
    statusBreakdown: [{ status: 'PENDING', scheduleCount: 1 }],
    monthlyTrend: [],
  };
}

function createService(provider: () => Promise<string>) {
  const service = new AnalyticsService(
    {} as never,
    { generateGeminiText: provider } as never,
    {} as never,
    {} as never,
  );
  let overview = createOverview();
  let storedInsight: {
    sourceRevision: string;
    response: Awaited<ReturnType<AnalyticsService['generateAiInsights']>>;
  } | null = null;
  let attemptedRevision: string | null = null;

  service.getOverview = async () => overview as never;
  service.getAlerts = async () => ({ alerts: [] }) as never;
  service.getVehicleKpis = async () => ({ vehicles: [] }) as never;
  service.getPredictiveForecast = async () =>
    ({ dueIn7Days: 0, dueIn30Days: 0, dueIn90Days: 0 }) as never;
  service.getAnomalies = async () =>
    ({ repeatedFailures: [], missingDates: [] }) as never;
  service.getExpandedTrends = async () => ({ topTypes: [] }) as never;

  Object.assign(service, {
    readStoredAiInsight: async () => storedInsight,
    hasAttemptedAiInsightRevision: async (revision: string) =>
      attemptedRevision === revision,
    markAiInsightAttempted: async (revision: string) => {
      attemptedRevision = revision;
    },
    storeAiInsight: async (revision: string, response: unknown) => {
      storedInsight = {
        sourceRevision: revision,
        response: response as Awaited<
          ReturnType<AnalyticsService['generateAiInsights']>
        >,
      };
    },
  });

  return {
    service,
    getOverview: () => overview,
    setOverview: (next: ReturnType<typeof createOverview>) => {
      overview = next;
    },
  };
}

test('analytics source revision is stable for unchanged records and order-independent', () => {
  const vehicles = [
    { id: 'vehicle-1', updatedAt: new Date('2026-11-27T00:00:00.000Z') },
    { id: 'vehicle-2', updatedAt: new Date('2026-11-26T00:00:00.000Z') },
  ];
  const schedules = [
    { id: 'schedule-1', updatedAt: new Date('2026-11-25T00:00:00.000Z') },
  ];

  const revision = createAnalyticsSourceRevision(vehicles, schedules);
  assert.equal(
    createAnalyticsSourceRevision([...vehicles].reverse(), schedules),
    revision,
  );
  assert.notEqual(
    createAnalyticsSourceRevision(
      [
        { ...vehicles[0], updatedAt: new Date('2026-11-28T00:00:00.000Z') },
        vehicles[1],
      ],
      schedules,
    ),
    revision,
  );
});

test('AI insights are reused for an unchanged revision and regenerated after a change', async () => {
  let providerCalls = 0;
  const { service, setOverview } = createService(async () => {
    providerCalls++;
    return 'Generated insight';
  });

  await service.generateAiInsights();
  await service.generateAiInsights();
  await service.getAiInsights();
  assert.equal(providerCalls, 1);

  setOverview(createOverview(2));
  await service.generateAiInsights();
  assert.equal(providerCalls, 2);
});

test('a failed AI attempt is not retried until the source revision changes', async () => {
  let providerCalls = 0;
  const { service, setOverview } = createService(async () => {
    providerCalls++;
    throw new Error('Provider unavailable');
  });

  await assert.rejects(service.generateAiInsights(), /Provider unavailable/);
  await assert.rejects(
    service.generateAiInsights(),
    /already attempted for this source revision/,
  );
  assert.equal(providerCalls, 1);

  setOverview(createOverview(2));
  await assert.rejects(service.generateAiInsights(), /Provider unavailable/);
  assert.equal(providerCalls, 2);
});
