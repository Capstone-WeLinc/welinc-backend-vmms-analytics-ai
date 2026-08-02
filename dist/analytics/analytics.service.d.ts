import { OnModuleDestroy } from '@nestjs/common';
import { DuckDbDataMartService } from './duckdb-datamart.service';
type DataMartRow = Record<string, unknown>;
export declare class AnalyticsService implements OnModuleDestroy {
    private readonly dataMartService;
    /** AI insights cache to minimize Gemini API calls (free-tier quota is very limited) */
    private aiInsightsCache;
    private readonly AI_CACHE_TTL_MS;
    /** Shared in-flight promise — concurrent callers await the same Gemini call */
    private aiInsightsBuildPromise;
    constructor(dataMartService: DuckDbDataMartService);
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
    private workOrderAiCache;
    private workOrderAiBuildPromise;
    getWorkOrderSummary(): Promise<{
        dataSource: {
            type: string;
            authoritativeFor: string;
            generatedAt: string;
            sourceMaxUpdatedAt: {} | null;
            ageSeconds: number | null;
            isStale: boolean;
            maxAgeMinutes: number;
        };
        summary: {
            totalWorkOrders: unknown;
            openWorkOrders: any;
            inProgressWorkOrders: any;
            overdueWorkOrders: any;
            completedWorkOrders: any;
            cancelledWorkOrders: any;
            totalPartsCost: number;
            totalLaborCost: number;
            totalCost: number;
            avgCostPerWorkOrder: number;
            workOrdersWithCost: number;
        };
        statusBreakdown: DataMartRow[];
        mechanicWorkload: any[];
        timeline: DataMartRow[];
        topMaintenanceTypes: DataMartRow[];
    }>;
    getMechanicWorkload(): Promise<any[]>;
    getWorkOrderTimeline(): Promise<DataMartRow[]>;
    getScheduleWorkOrders(mechanic?: string, status?: string, limit?: string): Promise<{
        dataSource: {
            type: string;
            authoritativeFor: string;
            generatedAt: string;
            sourceMaxUpdatedAt: {} | null;
            ageSeconds: number | null;
            isStale: boolean;
            maxAgeMinutes: number;
        };
        workOrders: any[];
    }>;
    getWorkOrderById(id: string): Promise<{
        workOrder: any;
    }>;
    getWorkOrderRecommendations(id: string, customTitle?: string, customVehicle?: string, checklistItems?: Array<{
        text: string;
    }> | string[]): Promise<{
        scheduleId: string;
        title: string;
        vehiclePlate: string;
        workOrder: any;
        checklist: {
            stepNumber: number;
            title: string;
            description: string;
            priority: string;
        }[];
        aiRecommendations: string;
    }>;
    getScheduleWithAi(id: string): Promise<{
        scheduleId: string;
        title: string;
        vehiclePlate: string;
        workOrder: any;
        checklist: {
            stepNumber: number;
            title: string;
            description: string;
            priority: string;
        }[];
        aiRecommendations: string;
    }>;
    getWorkOrderAiInsights(): Promise<string>;
    private buildAndCacheWorkOrderAiInsights;
    private getDefaultChecklistSteps;
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
    private buildAndCacheAiInsights;
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
    /**
     * Reset cached DuckDB connection in shared DuckDbDataMartService.
     */
    resetConnection(): void;
    private ensurePreparedData;
}
export {};
