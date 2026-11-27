import assert from 'node:assert/strict';
import { test } from 'node:test';
import { DuckDBInstance } from '@duckdb/node-api';
import { AnalyticsService } from '../src/analytics/analytics.service';
import { initializeDataMart } from '../src/analytics/duckdb';

async function createQueueService(sourceRevision: string) {
  const instance = await DuckDBInstance.create(':memory:');
  const connection = await instance.connect();
  await initializeDataMart(connection);

  const overview = {
    dataSource: {
      type: 'test',
      authoritativeFor: 'analytics',
      generatedAt: '2026-11-27T00:00:00.000Z',
      sourceMaxUpdatedAt: '2026-11-26T00:00:00.000Z',
      ageSeconds: 0,
      isStale: false,
      maxAgeMinutes: 10,
    },
    snapshot: { sourceRevision },
    statusBreakdown: [],
    monthlyTrend: [],
  };
  const dataMartService = {
    getConnection: async () => connection,
    query: async (sql: string) => {
      const reader = await connection.runAndReadAll(sql);
      return reader.getRowObjectsJS();
    },
  };
  const service = new AnalyticsService(
    dataMartService as never,
    {} as never,
    {} as never,
    {} as never,
  );
  service.getOverview = async () => overview as never;

  return {
    connection,
    instance,
    service,
    close: () => {
      connection.closeSync();
      instance.closeSync();
    },
  };
}

test('AI insight queue coalesces changes and generates once for the latest revision', async () => {
  const { connection, service, close } = await createQueueService('revision-2');
  let generationCalls = 0;
  const response = {
    aiSummary: 'Saved report',
    evidence: { generatedAt: '2026-11-27T00:00:00.000Z' },
  };
  service.generateAiInsights = async () => {
    generationCalls++;
    await connection.run(
      `INSERT INTO analytics_ai_insight_cache
         (cacheKey, sourceRevision, responseJson, generatedAt)
       VALUES ('latest', $1, $2, CAST($3 AS TIMESTAMPTZ))`,
      ['revision-2', JSON.stringify(response), '2026-11-27T00:00:00.000Z'],
    );
    return response as never;
  };

  try {
    await service.enqueueAiInsight('revision-1');
    await service.enqueueAiInsight('revision-1');
    await service.enqueueAiInsight('revision-2');
    await connection.run(
      `UPDATE analytics_ai_insight_jobs
       SET runAfter = CURRENT_TIMESTAMP - INTERVAL '1 second'`,
    );

    await service.processAiInsightQueue(true);
    await service.processAiInsightQueue(true);

    const status = await service.getAiInsightJobStatus(true);
    assert.equal(generationCalls, 1);
    assert.equal(status.state, 'current');
    assert.equal(status.hasCurrentInsight, true);
  } finally {
    close();
  }
});

test('an interrupted running queue job is marked failed without another generation attempt', async () => {
  const { connection, service, close } = await createQueueService('revision-1');
  let generationCalls = 0;
  service.generateAiInsights = async () => {
    generationCalls++;
    throw new Error('Should not be called for an interrupted job');
  };

  try {
    await service.enqueueAiInsight('revision-1');
    await connection.run(
      `UPDATE analytics_ai_insight_jobs
       SET status = 'RUNNING', startedAt = CURRENT_TIMESTAMP`,
    );

    await service.processAiInsightQueue(false);

    const status = await service.getAiInsightJobStatus(true);
    assert.equal(generationCalls, 0);
    assert.equal(status.state, 'failed');
  } finally {
    close();
  }
});

test('legacy latest-attempt state migrates into the revision history', async () => {
  const instance = await DuckDBInstance.create(':memory:');
  const connection = await instance.connect();

  try {
    await initializeDataMart(connection);
    await connection.run(
      `INSERT INTO analytics_ai_insight_attempts
         (cacheKey, sourceRevision, attemptedAt)
       VALUES ('latest', 'legacy-revision', CURRENT_TIMESTAMP)`,
    );
    await initializeDataMart(connection);

    const result = await connection.runAndReadAll(
      `SELECT sourceRevision
       FROM analytics_ai_insight_attempt_history
       WHERE sourceRevision = 'legacy-revision'`,
    );
    assert.equal(result.getRowObjectsJS().length, 1);
  } finally {
    connection.closeSync();
    instance.closeSync();
  }
});

test('a completed job without a saved insight is exposed as failed', async () => {
  const { connection, service, close } = await createQueueService('revision-1');

  try {
    await service.enqueueAiInsight('revision-1');
    await connection.run(
      `UPDATE analytics_ai_insight_jobs SET status = 'COMPLETED'`,
    );

    const status = await service.getAiInsightJobStatus(true);
    assert.equal(status.state, 'failed');
    assert.equal(status.hasSavedInsight, false);
  } finally {
    close();
  }
});
