import type { Response } from 'express';
import { AnalyticsService } from './analytics.service';
export declare class DashboardController {
    private readonly analyticsService;
    constructor(analyticsService: AnalyticsService);
    getDashboardPage(res: Response): Promise<any>;
    getWorkOrdersPage(mechanicFilter?: string, statusFilter?: string, res?: Response): Promise<any>;
    getWorkOrderDetailPage(scheduleId: string, res: Response): Promise<any>;
    private escapeHtml;
}
