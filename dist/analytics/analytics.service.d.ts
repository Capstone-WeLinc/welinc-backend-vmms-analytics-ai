import { OnModuleDestroy } from '@nestjs/common';
import { DuckDbDataMartService } from './duckdb-datamart.service';
import { GeminiAiService } from './gemini-ai.service';
import { VehicleKpiService } from './vehicle-kpi.service';
import { WorkOrderAnalyticsService } from './work-order-analytics.service';
type DataMartRow = Record<string, unknown>;
export declare class AnalyticsService implements OnModuleDestroy {
    private readonly dataMartService;
    private readonly geminiAiService;
    private readonly vehicleKpiService;
    private readonly workOrderAnalyticsService;
    constructor(dataMartService: DuckDbDataMartService, geminiAiService: GeminiAiService, vehicleKpiService: VehicleKpiService, workOrderAnalyticsService: WorkOrderAnalyticsService);
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
    getVehicleKpis(): Promise<{
        dataSource: any;
        vehicles: any[];
    }>;
    getAlerts(): Promise<{
        dataSource: any;
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
    getWorkOrderSummary(): Promise<{
        dataSource: any;
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
        statusBreakdown: {
            [x: string]: unknown;
        }[];
        mechanicWorkload: any[];
        timeline: {
            [x: string]: unknown;
        }[];
        topMaintenanceTypes: {
            [x: string]: unknown;
        }[];
    }>;
    getMechanicWorkload(): Promise<any[]>;
    getWorkOrderTimeline(): Promise<{
        [x: string]: unknown;
    }[]>;
    getScheduleWorkOrders(mechanic?: string, status?: string, limit?: string): Promise<{
        dataSource: any;
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
    getAiInsights(): Promise<string>;
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
    private toNumber;
    private getSnapshot;
    private dataSourceMetadata;
    private positiveNumber;
    private query;
    private withDataMart;
    onModuleDestroy(): Promise<void>;
    resetConnection(): void;
}
export {};
