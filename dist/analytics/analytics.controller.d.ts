import { AnalyticsService } from './analytics.service';
import { SyncService } from './sync.service';
export declare class AnalyticsController {
    private readonly analyticsService;
    private readonly syncService;
    constructor(analyticsService: AnalyticsService, syncService: SyncService);
    triggerSync(): Promise<{
        success: boolean;
        message: string;
    }>;
    getHealth(): {
        status: string;
        service: string;
        mode: string;
        port: string | number;
    };
    getOverview(): Promise<{
        forecast: {
            [x: string]: unknown;
        };
        anomalies: {
            repeatedFailures: {
                [x: string]: unknown;
            }[];
            missingDates: {
                [x: string]: unknown;
            }[];
        };
        trends: {
            topTypes: {
                [x: string]: unknown;
            }[];
        };
        dataSource: {
            type: string;
            authoritativeFor: string;
            generatedAt: string;
            sourceMaxUpdatedAt: {} | null;
            ageSeconds: number | null;
            isStale: boolean;
            maxAgeMinutes: number;
        };
        snapshot: {
            [x: string]: unknown;
        };
        summaryMetrics: {
            overdueRate: number;
            dueSoonRate: number;
            pendingRate: number;
            activeFleetRate: number;
            avgCostPerSchedule: number;
            avgCostPerVehicle: number;
        };
        statusBreakdown: {
            [x: string]: unknown;
        }[];
        monthlyTrend: {
            [x: string]: unknown;
        }[];
    }>;
    getOverviewLegacy(): Promise<{
        forecast: {
            [x: string]: unknown;
        };
        anomalies: {
            repeatedFailures: {
                [x: string]: unknown;
            }[];
            missingDates: {
                [x: string]: unknown;
            }[];
        };
        trends: {
            topTypes: {
                [x: string]: unknown;
            }[];
        };
        dataSource: {
            type: string;
            authoritativeFor: string;
            generatedAt: string;
            sourceMaxUpdatedAt: {} | null;
            ageSeconds: number | null;
            isStale: boolean;
            maxAgeMinutes: number;
        };
        snapshot: {
            [x: string]: unknown;
        };
        summaryMetrics: {
            overdueRate: number;
            dueSoonRate: number;
            pendingRate: number;
            activeFleetRate: number;
            avgCostPerSchedule: number;
            avgCostPerVehicle: number;
        };
        statusBreakdown: {
            [x: string]: unknown;
        }[];
        monthlyTrend: {
            [x: string]: unknown;
        }[];
    }>;
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
    getVehicleKpisLegacy(): Promise<{
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
    getAiInsights(): Promise<{
        aiSummary: string;
    }>;
    getAiInsightsLegacy(): Promise<{
        aiSummary: string;
    }>;
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
    getAlertsLegacy(): Promise<{
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
        snapshot: {
            [x: string]: unknown;
        };
        statusBreakdown: {
            [x: string]: unknown;
        }[];
        monthlyTrend: {
            [x: string]: unknown;
        }[];
        vehicles: any[];
        alerts: any[];
        schedules: {
            [x: string]: unknown;
        }[];
    }>;
    getReportLegacy(): Promise<{
        dataSource: {
            type: string;
            authoritativeFor: string;
            generatedAt: string;
            sourceMaxUpdatedAt: {} | null;
            ageSeconds: number | null;
            isStale: boolean;
            maxAgeMinutes: number;
        };
        snapshot: {
            [x: string]: unknown;
        };
        statusBreakdown: {
            [x: string]: unknown;
        }[];
        monthlyTrend: {
            [x: string]: unknown;
        }[];
        vehicles: any[];
        alerts: any[];
        schedules: {
            [x: string]: unknown;
        }[];
    }>;
    getWorkOrders(): Promise<{
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
    getWorkOrdersLegacy(): Promise<{
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
    getMechanicWorkloadLegacy(): Promise<any[]>;
    getWorkOrderAiInsights(): Promise<{
        aiSummary: string;
    }>;
    getWorkOrderAiInsightsLegacy(): Promise<{
        aiSummary: string;
    }>;
    getWorkOrderList(mechanic?: string, status?: string, limit?: string): Promise<{
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
    getWorkOrderListLegacy(mechanic?: string, status?: string, limit?: string): Promise<{
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
    getWorkOrderItem(id: string): Promise<{
        workOrder: any;
    }>;
    getWorkOrderItemLegacy(id: string): Promise<{
        workOrder: any;
    }>;
    getWorkOrderRecommendations(id: string, queryTitle?: string, queryVehicle?: string, itemsQuery?: string, body?: {
        title?: string;
        vehicle?: string;
        checklistItems?: Array<{
            text: string;
        }>;
    }): Promise<{
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
}
