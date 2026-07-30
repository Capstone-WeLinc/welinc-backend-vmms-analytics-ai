import { AnalyticsService } from './analytics.service';
export declare class MaintenanceSchedulesController {
    private readonly analyticsService;
    constructor(analyticsService: AnalyticsService);
    searchSchedules(query: string, limit?: string): Promise<{
        dataSource: {
            type: string;
            authoritativeFor: string;
            generatedAt: string;
            sourceMaxUpdatedAt: {} | null;
            ageSeconds: number | null;
            isStale: boolean;
            maxAgeMinutes: number;
        };
        schedules: {
            [x: string]: unknown;
        }[];
    }>;
}
