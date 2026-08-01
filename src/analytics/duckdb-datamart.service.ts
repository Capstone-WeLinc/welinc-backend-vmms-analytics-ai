import { access, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { DuckDBConnection, DuckDBInstance } from '@duckdb/node-api';
import { DEFAULT_DUCKDB_PATH, initializeDataMart } from './duckdb';

type DataMartRow = Record<string, unknown>;

@Injectable()
export class DuckDbDataMartService implements OnModuleDestroy {
  private readonly logger = new Logger(DuckDbDataMartService.name);
  private instance: DuckDBInstance | null = null;
  private connection: DuckDBConnection | null = null;
  private initializingPromise: Promise<DuckDBConnection> | null = null;

  private resolveDatabasePath(): string {
    const configuredPath = process.env['DUCKDB_PATH']?.trim();
    if (configuredPath) {
      return path.resolve(configuredPath);
    }
    const candidates = [
      path.resolve(process.cwd(), 'database', 'vmms_datamart.duckdb'),
      path.resolve(process.cwd(), '..', 'database', 'vmms_datamart.duckdb'),
      path.resolve(process.cwd(), '..', '..', 'database', 'vmms_datamart.duckdb'),
      path.resolve(process.cwd(), '..', 'vmms-backend', 'database', 'vmms_datamart.duckdb'),
      path.resolve(process.cwd(), '..', 'welinc-backend-vmms', 'database', 'vmms_datamart.duckdb'),
      path.resolve(process.cwd(), '..', 'welinc-backend-vmms-analytics-ai', 'database', 'vmms_datamart.duckdb'),
    ];

    for (const candidate of candidates) {
      try {
        const { accessSync } = require('node:fs');
        accessSync(candidate);
        return candidate;
      } catch {
        // try next candidate
      }
    }

    return candidates[0] ?? DEFAULT_DUCKDB_PATH;
  }

  async getConnection(): Promise<DuckDBConnection> {
    if (this.connection) {
      return this.connection;
    }
    if (this.instance) {
      this.connection = await this.instance.connect();
      return this.connection;
    }
    if (this.initializingPromise) {
      return await this.initializingPromise;
    }

    this.initializingPromise = (async () => {
      try {
        const dbPath = this.resolveDatabasePath();
        await mkdir(path.dirname(dbPath), { recursive: true });
        this.logger.log(`Initializing DuckDB instance at: ${dbPath}`);
        this.instance = await DuckDBInstance.create(dbPath);
        this.connection = await this.instance.connect();
        await initializeDataMart(this.connection);
        return this.connection;
      } catch (error) {
        this.connection?.closeSync();
        this.connection = null;
        this.instance = null;
        throw error;
      } finally {
        this.initializingPromise = null;
      }
    })();

    return await this.initializingPromise;
  }

  async query(sql: string): Promise<DataMartRow[]> {
    const conn = await this.getConnection();
    const reader = await conn.runAndReadAll(sql);
    return reader
      .getRowObjectsJS()
      .map((row) =>
        Object.fromEntries(
          Object.entries(row).map(([key, value]) => [
            key,
            typeof value === 'bigint' ? Number(value) : value,
          ]),
        ),
      );
  }

  async resetConnection(): Promise<void> {
    try {
      this.connection?.closeSync();
    } catch {}
    this.connection = null;
  }

  async onModuleDestroy(): Promise<void> {
    await this.resetConnection();
  }
}
