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
}
