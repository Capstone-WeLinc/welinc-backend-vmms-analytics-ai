import { OnModuleDestroy } from '@nestjs/common';
type DataMartRow = Record<string, unknown>;
export declare class AnalyticsService implements OnModuleDestroy {
    private readonly databasePath;
    private instance;
    private connection;
    private connecting;
    constructor();
    private resolveDatabasePath;
    getHealth(): {
        status: string;
        service: string;
        mode: string;
        port: string | number;
    };
    getOverview(): Promise<{
        dataSource: {
            type: string;
            authoritativeFor: string;
            generatedAt: string;
            sourceMaxUpdatedAt: {} | null;
            ageSeconds: number | null;
            isStale: boolean;
            maxAgeMinutes: number;
        };
        snapshot: DataMartRow;
        summaryMetrics: {
            overdueRate: number;
            dueSoonRate: number;
            pendingRate: number;
            activeFleetRate: number;
            avgCostPerSchedule: number;
            avgCostPerVehicle: number;
        };
        statusBreakdown: DataMartRow[];
        monthlyTrend: DataMartRow[];
    }>;
    private buildOverviewSummaryMetrics;
    private calculateRiskScore;
    private getRiskLevel;
    getVehicleKpis(): Promise<{
        dataSource: {
            type: string;
            authoritativeFor: string;
            generatedAt: string;
            sourceMaxUpdatedAt: {} | null;
            ageSeconds: number | null;
            isStale: boolean;
            maxAgeMinutes: number;
        };
        vehicles: any[];
    }>;
    private buildVehicleRiskReason;
    private toNumber;
    getAlerts(): Promise<{
        dataSource: {
            type: string;
            authoritativeFor: string;
            generatedAt: string;
            sourceMaxUpdatedAt: {} | null;
            ageSeconds: number | null;
            isStale: boolean;
            maxAgeMinutes: number;
        };
        alerts: any[];
    }>;
    searchMaintenanceSchedules(query: string | undefined, limit?: string): Promise<{
        dataSource: {
            type: string;
            authoritativeFor: string;
            generatedAt: string;
            sourceMaxUpdatedAt: {} | null;
            ageSeconds: number | null;
            isStale: boolean;
            maxAgeMinutes: number;
        };
        schedules: DataMartRow[];
    }>;
    getPredictiveForecast(): Promise<DataMartRow>;
    getAnomalies(): Promise<{
        repeatedFailures: DataMartRow[];
        missingDates: DataMartRow[];
    }>;
    getExpandedTrends(): Promise<{
        topTypes: DataMartRow[];
    }>;
    getReport(): Promise<{
        dataSource: {
            type: string;
            authoritativeFor: string;
            generatedAt: string;
            sourceMaxUpdatedAt: {} | null;
            ageSeconds: number | null;
            isStale: boolean;
            maxAgeMinutes: number;
        };
        snapshot: DataMartRow;
        statusBreakdown: DataMartRow[];
        monthlyTrend: DataMartRow[];
        vehicles: any[];
        alerts: any[];
        schedules: DataMartRow[];
    }>;
    getAiInsights(): Promise<string>;
    private getGeminiConfig;
    private generateGeminiText;
    private generateGeminiTextForModel;
    private extractGeminiTextOutput;
    private getSnapshot;
    private dataSourceMetadata;
    private positiveNumber;
    private query;
    private withDataMart;
    onModuleDestroy(): Promise<void>;
    private getConnection;
    private ensurePreparedData;
}
export {};
