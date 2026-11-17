import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { DuckDbDataMartService } from './duckdb-datamart.service';
import { GeminiAiService } from './gemini-ai.service';

const MAX_RECOMMENDATION_ITEMS = 20;
const MAX_RECOMMENDATION_ITEM_LENGTH = 250;
const MAX_RECOMMENDATION_INPUT_LENGTH = 3_000;
const MAX_RECOMMENDATION_TITLE_LENGTH = 120;
const MAX_RECOMMENDATION_VEHICLE_LENGTH = 80;

function boundedText(value: unknown, field: string, maxLength: number): string | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== 'string') throw new BadRequestException(`${field} must be text.`);
  const text = value.trim();
  if (text.length > maxLength) throw new BadRequestException(`${field} is too long.`);
  return text || undefined;
}

@Injectable()
export class WorkOrderAnalyticsService {
  constructor(
    private readonly dataMartService: DuckDbDataMartService,
    private readonly geminiAiService: GeminiAiService,
  ) {}

  async getWorkOrderSummary(snapshotMetadata: any) {
    const [statusBreakdown, mechanicWorkload, timeline, topTypes, costBreakdown] = await Promise.all([
      // Status distribution
      this.dataMartService.query(
        `SELECT scheduleStatus AS status,
                CAST(COUNT(*) AS INTEGER) AS workOrderCount,
                CAST(ROUND(COUNT(*) * 100.0 / NULLIF(SUM(COUNT(*)) OVER (), 0), 1) AS DOUBLE) AS percentage,
                CAST(ROUND(SUM(totalCost), 2) AS DOUBLE) AS totalCost
         FROM maintenance_schedule_summary
         GROUP BY scheduleStatus
         ORDER BY CASE scheduleStatus
           WHEN 'PENDING' THEN 1 WHEN 'DUE' THEN 2 WHEN 'IN_PROGRESS' THEN 3
           WHEN 'COMPLETED' THEN 4 WHEN 'OVERDUE' THEN 5 WHEN 'CANCELLED' THEN 6
           ELSE 7 END`,
      ),
      // Mechanic workload with cost
      this.getMechanicWorkload(),
      // Monthly timeline
      this.getWorkOrderTimeline(),
      // Top maintenance types by frequency
      this.dataMartService.query(
        `SELECT maintenanceTitle AS type,
                CAST(COUNT(*) AS INTEGER) AS count,
                CAST(ROUND(SUM(totalCost), 2) AS DOUBLE) AS totalCost,
                CAST(ROUND(AVG(totalCost), 2) AS DOUBLE) AS avgCost
         FROM maintenance_schedule_summary
         GROUP BY maintenanceTitle
         ORDER BY count DESC
         LIMIT 8`,
      ),
      // Overall cost breakdown
      this.dataMartService.query(
        `SELECT
           CAST(ROUND(SUM(partsCost), 2) AS DOUBLE) AS totalPartsCost,
           CAST(ROUND(SUM(laborCost), 2) AS DOUBLE) AS totalLaborCost,
           CAST(ROUND(SUM(totalCost), 2) AS DOUBLE) AS totalCost,
           CAST(ROUND(AVG(CASE WHEN totalCost > 0 THEN totalCost END), 2) AS DOUBLE) AS avgCostPerWorkOrder,
           CAST(COUNT(CASE WHEN totalCost > 0 THEN 1 END) AS INTEGER) AS workOrdersWithCost
         FROM maintenance_schedule_summary`,
      ),
    ]);

    const totals = (statusBreakdown as any[]).reduce(
      (acc: Record<string, number>, row: any) => {
        acc[String(row.status)] = this.toNumber(row.workOrderCount);
        return acc;
      },
      {},
    );

    const costs = (costBreakdown as any[])[0] ?? {};

    return {
      dataSource: snapshotMetadata,
      summary: {
        totalWorkOrders: Object.values(totals).reduce((s: number, v) => s + (v as number), 0),
        openWorkOrders: (totals['PENDING'] ?? 0) + (totals['DUE'] ?? 0),
        inProgressWorkOrders: totals['IN_PROGRESS'] ?? 0,
        overdueWorkOrders: totals['OVERDUE'] ?? 0,
        completedWorkOrders: totals['COMPLETED'] ?? 0,
        cancelledWorkOrders: totals['CANCELLED'] ?? 0,
        totalPartsCost: this.toNumber(costs.totalPartsCost),
        totalLaborCost: this.toNumber(costs.totalLaborCost),
        totalCost: this.toNumber(costs.totalCost),
        avgCostPerWorkOrder: this.toNumber(costs.avgCostPerWorkOrder),
        workOrdersWithCost: this.toNumber(costs.workOrdersWithCost),
      },
      statusBreakdown,
      mechanicWorkload,
      timeline,
      topMaintenanceTypes: topTypes,
    };
  }

  async getMechanicWorkload() {
    const rows = await this.dataMartService.query(
      `SELECT
         COALESCE(NULLIF(TRIM(assignedMechanic), ''), 'Unassigned') AS mechanic,
         CAST(COUNT(*) AS INTEGER) AS totalAssigned,
         CAST(SUM(CASE WHEN scheduleStatus = 'COMPLETED' THEN 1 ELSE 0 END) AS INTEGER) AS completed,
         CAST(SUM(CASE WHEN scheduleStatus = 'IN_PROGRESS' THEN 1 ELSE 0 END) AS INTEGER) AS inProgress,
         CAST(SUM(CASE WHEN scheduleStatus = 'OVERDUE' THEN 1 ELSE 0 END) AS INTEGER) AS overdue,
         CAST(SUM(CASE WHEN scheduleStatus IN ('PENDING', 'DUE') THEN 1 ELSE 0 END) AS INTEGER) AS pending,
         CAST(ROUND(
           SUM(CASE WHEN scheduleStatus = 'COMPLETED' THEN 1 ELSE 0 END) * 100.0 /
           NULLIF(COUNT(*), 0), 1
         ) AS DOUBLE) AS completionRate,
         CAST(ROUND(SUM(totalCost), 2) AS DOUBLE) AS totalCost,
         CAST(ROUND(SUM(partsCost), 2) AS DOUBLE) AS totalPartsCost,
         CAST(ROUND(SUM(laborCost), 2) AS DOUBLE) AS totalLaborCost,
         CAST(ROUND(AVG(CASE WHEN totalCost > 0 THEN totalCost END), 2) AS DOUBLE) AS avgCostPerWorkOrder,
         CAST(COUNT(CASE WHEN scheduleStatus = 'OVERDUE' AND nextDueDate IS NOT NULL
                        AND nextDueDate < current_date - INTERVAL 30 DAY THEN 1 END) AS INTEGER) AS overdueOver30Days
       FROM maintenance_schedule_summary
       GROUP BY COALESCE(NULLIF(TRIM(assignedMechanic), ''), 'Unassigned')
       ORDER BY overdue DESC, totalAssigned DESC`,
    );

    return (rows as any[]).map((row) => ({
      ...row,
      riskLevel: this.toNumber(row.overdue) > 0
        ? 'HIGH'
        : this.toNumber(row.inProgress) > 0 || this.toNumber(row.pending) > 0
          ? 'MEDIUM'
          : 'LOW',
    }));
  }

  async getWorkOrderTimeline() {
    return this.dataMartService.query(
      `SELECT
         strftime(createdAt, '%Y-%m') AS monthKey,
         CAST(COUNT(*) AS INTEGER) AS created,
         CAST(SUM(CASE WHEN scheduleStatus = 'COMPLETED' THEN 1 ELSE 0 END) AS INTEGER) AS completed,
         CAST(SUM(CASE WHEN scheduleStatus = 'OVERDUE' THEN 1 ELSE 0 END) AS INTEGER) AS overdue,
         CAST(SUM(CASE WHEN scheduleStatus = 'IN_PROGRESS' THEN 1 ELSE 0 END) AS INTEGER) AS active,
         CAST(ROUND(SUM(totalCost), 2) AS DOUBLE) AS totalCost,
         CAST(ROUND(SUM(CASE WHEN scheduleStatus = 'COMPLETED' THEN totalCost ELSE 0 END), 2) AS DOUBLE) AS completedCost
       FROM maintenance_schedule_summary
       WHERE createdAt IS NOT NULL
       GROUP BY strftime(createdAt, '%Y-%m')
       ORDER BY monthKey
       LIMIT 12`,
    );
  }

  async getScheduleWorkOrders(snapshotMetadata: any, mechanic?: string, status?: string, limit = '100') {
    const conditions: string[] = [];
    if (mechanic?.trim()) {
      const escaped = mechanic.trim().replace(/'/g, "''");
      conditions.push(`LOWER(assignedMechanic) LIKE '%${escaped.toLowerCase()}%'`);
    }
    if (status?.trim()) {
      const escaped = status.trim().replace(/'/g, "''");
      conditions.push(`scheduleStatus = '${escaped.toUpperCase()}'`);
    }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const max = Math.min(Math.max(Number(limit) || 100, 1), 500);

    const rows = await this.dataMartService.query(
      `SELECT
         scheduleId,
         vehiclePlate,
         maintenanceTitle,
         triggerType,
         intervalType,
         assignedMechanic AS mechanic,
         scheduleStatus AS status,
         odometerReading,
         CAST(nextDueDate AS VARCHAR) AS nextDueDate,
         CAST(createdAt AS VARCHAR) AS createdAt,
         CAST(partsCost AS DOUBLE) AS partsCost,
         CAST(laborCost AS DOUBLE) AS laborCost,
         CAST(totalCost AS DOUBLE) AS totalCost
       FROM maintenance_schedule_summary
       ${where}
       ORDER BY CASE scheduleStatus WHEN 'OVERDUE' THEN 1 WHEN 'IN_PROGRESS' THEN 2 WHEN 'DUE' THEN 3 WHEN 'PENDING' THEN 4 ELSE 5 END, nextDueDate NULLS LAST
       LIMIT ${max}`,
    );

    const now = Date.now();
    const workOrders = rows.map((r: any) => {
      const createdTime = r.createdAt ? Date.parse(r.createdAt) : now;
      const dueTime = r.nextDueDate ? Date.parse(r.nextDueDate) : null;
      const daysOpen = Math.max(0, Math.floor((now - createdTime) / (1000 * 60 * 60 * 24)));
      const daysOverdue = dueTime && now > dueTime && r.status !== 'COMPLETED'
        ? Math.floor((now - dueTime) / (1000 * 60 * 60 * 24))
        : 0;

      const priority =
        r.status === 'OVERDUE' || daysOverdue > 0
          ? 'HIGH'
          : (r.odometerReading ?? 0) > 100000 || r.triggerType === 'ODOMETER'
            ? 'MEDIUM'
            : 'NORMAL';

      const statusLabel =
        r.status === 'COMPLETED'
          ? 'Completed'
          : r.status === 'IN_PROGRESS'
            ? 'In Progress'
            : r.status === 'OVERDUE'
              ? 'Overdue'
              : r.status === 'DUE'
                ? 'Due Soon'
                : r.status === 'CANCELLED'
                  ? 'Cancelled'
                  : 'Pending';

      return {
        ...r,
        daysOpen,
        daysOverdue,
        priority,
        statusLabel,
        partsCost: this.toNumber(r.partsCost),
        laborCost: this.toNumber(r.laborCost),
        totalCost: this.toNumber(r.totalCost),
      };
    });

    return {
      dataSource: snapshotMetadata,
      workOrders,
    };
  }

  async getWorkOrderById(id: string) {
    const escaped = id.trim().replace(/'/g, "''");
    const rows = await this.dataMartService.query(
      `SELECT
         scheduleId,
         vehiclePlate,
         maintenanceTitle,
         triggerType,
         intervalType,
         assignedMechanic AS mechanic,
         scheduleStatus AS status,
         odometerReading,
         CAST(nextDueDate AS VARCHAR) AS nextDueDate,
         CAST(createdAt AS VARCHAR) AS createdAt,
         CAST(partsCost AS DOUBLE) AS partsCost,
         CAST(laborCost AS DOUBLE) AS laborCost,
         CAST(totalCost AS DOUBLE) AS totalCost
       FROM maintenance_schedule_summary
       WHERE scheduleId = '${escaped}'`,
    );

    if (!rows[0]) {
      throw new NotFoundException(`Work order schedule with ID ${id} not found.`);
    }

    const r = rows[0] as any;
    const now = Date.now();
    const createdTime = r.createdAt ? Date.parse(r.createdAt) : now;
    const dueTime = r.nextDueDate ? Date.parse(r.nextDueDate) : null;
    const daysOpen = Math.max(0, Math.floor((now - createdTime) / (1000 * 60 * 60 * 24)));
    const daysOverdue = dueTime && now > dueTime && r.status !== 'COMPLETED'
      ? Math.floor((now - dueTime) / (1000 * 60 * 60 * 24))
      : 0;

    const priority =
      r.status === 'OVERDUE' || daysOverdue > 0
        ? 'HIGH'
        : (r.odometerReading ?? 0) > 100000 || r.triggerType === 'ODOMETER'
          ? 'MEDIUM'
          : 'NORMAL';

    const statusLabel =
      r.status === 'COMPLETED'
        ? 'Completed'
        : r.status === 'IN_PROGRESS'
          ? 'In Progress'
          : r.status === 'OVERDUE'
            ? 'Overdue'
            : r.status === 'DUE'
              ? 'Due Soon'
              : r.status === 'CANCELLED'
                ? 'Cancelled'
                : 'Pending';

    return {
      workOrder: {
        ...r,
        daysOpen,
        daysOverdue,
        priority,
        statusLabel,
        partsCost: this.toNumber(r.partsCost),
        laborCost: this.toNumber(r.laborCost),
        totalCost: this.toNumber(r.totalCost),
      },
    };
  }

  async getWorkOrderRecommendations(
    id: string,
    customTitle?: string,
    customVehicle?: string,
    checklistItems?: Array<{ text: string }> | string[],
  ) {
    let title = boundedText(customTitle, 'Title', MAX_RECOMMENDATION_TITLE_LENGTH) || 'Maintenance Work Order';
    let vehiclePlate = boundedText(customVehicle, 'Vehicle', MAX_RECOMMENDATION_VEHICLE_LENGTH) || 'Vehicle';
    if (checklistItems !== undefined && !Array.isArray(checklistItems)) {
      throw new BadRequestException('Checklist items must be a list.');
    }
    if ((checklistItems?.length ?? 0) > MAX_RECOMMENDATION_ITEMS) {
      throw new BadRequestException(`Checklist items cannot exceed ${MAX_RECOMMENDATION_ITEMS}.`);
    }
    const items: string[] = (checklistItems ?? []).map((item) => {
      const text = typeof item === 'string'
        ? item
        : item && typeof item === 'object' && typeof item.text === 'string'
          ? item.text
          : undefined;
      if (text === undefined) throw new BadRequestException('Each checklist item must contain text.');
      const normalized = text.trim();
      if (normalized.length > MAX_RECOMMENDATION_ITEM_LENGTH) {
        throw new BadRequestException(`Checklist items cannot exceed ${MAX_RECOMMENDATION_ITEM_LENGTH} characters each.`);
      }
      return normalized;
    }).filter(Boolean);
    if (items.reduce((total, item) => total + item.length, 0) > MAX_RECOMMENDATION_INPUT_LENGTH) {
      throw new BadRequestException(`Checklist text cannot exceed ${MAX_RECOMMENDATION_INPUT_LENGTH} characters in total.`);
    }

    let workOrderData: any = null;
    try {
      const res = await this.getWorkOrderById(id);
      workOrderData = res.workOrder;
      title = workOrderData.maintenanceTitle || title;
      vehiclePlate = workOrderData.vehiclePlate || vehiclePlate;
    } catch {
      // Allow standalone recommendations if scheduleId is virtual or missing
    }

    const steps = items.length
      ? items.map((itemText, idx) => ({
          stepNumber: idx + 1,
          title: itemText,
          description: `Follow OEM service guidelines to inspect, service, or test ${itemText}. Verify proper torque, cleanliness, and operation.`,
          priority: idx < 2 ? 'HIGH' : idx < 4 ? 'MEDIUM' : 'NORMAL',
        }))
      : this.getDefaultChecklistSteps(title);

    const itemsList = items.length
      ? items.map((it, i) => `${i + 1}. ${it}`).join('\n')
      : 'Default inspection & service checklist';

    const prompt = `Service Advisor Advisory:
Task: ${title} (${vehiclePlate})
${workOrderData ? `Status: ${workOrderData.statusLabel}` : ''}

Checklist Items:
${itemsList}

Provide brief, bulleted guidance (1-2 sentences per section max):
1. Safety & PPE Requirements
2. Diagnostic Tools & Parts Needed
3. Item Execution Instructions
4. Quality Control Sign-off`;

    let aiRecommendations = '';
    try {
      aiRecommendations = await this.geminiAiService.generateGeminiText(prompt, 350);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      aiRecommendations = `Technical Advisory for ${title} (${vehiclePlate}):\n- Perform standard pre-service safety isolation.\n- Refer to VMMS OEM manual for torque specs and fluid capacities.\n- Verify leak-free operation prior to sign-off.\n\n(AI advisory fallback: ${msg})`;
    }

    return {
      scheduleId: id,
      title,
      vehiclePlate,
      workOrder: workOrderData,
      checklist: steps,
      aiRecommendations,
    };
  }

  async getWorkOrderAiInsights(snapshotMetadata: any): Promise<string> {
    return this.geminiAiService.getWorkOrderAiInsights(async () => {
      const summary = await this.getWorkOrderSummary(snapshotMetadata);

      const s = summary.summary;
      const mechanics: any[] = (summary.mechanicWorkload as any[]) ?? [];
      const topTypes: any[] = (summary.topMaintenanceTypes as any[]) ?? [];
      const timeline: any[] = (summary.timeline as any[]) ?? [];

      const fmt = (n: number) => n >= 1000 ? `₱${(n / 1000).toFixed(1)}k` : `₱${n}`;

      const topOverdue = mechanics
        .filter((m: any) => this.toNumber(m.overdue) > 0)
        .slice(0, 4)
        .map((m: any) => `${m.mechanic}: ${m.overdue} overdue (${m.overdueOver30Days} >30d), cost ${fmt(this.toNumber(m.totalCost))}, ${m.completionRate}% done`)
        .join('; ');

      const topByLoad = mechanics
        .slice(0, 4)
        .map((m: any) => `${m.mechanic}: ${m.totalAssigned} WOs (${m.inProgress} active, ${m.completed} done), cost ${fmt(this.toNumber(m.totalCost))}`)
        .join('; ');

      const topCostMechanics = [...mechanics]
        .sort((a, b) => this.toNumber(b.totalCost) - this.toNumber(a.totalCost))
        .slice(0, 3)
        .map((m: any) => `${m.mechanic}: ${fmt(this.toNumber(m.totalCost))} (avg ${fmt(this.toNumber(m.avgCostPerWorkOrder))}/WO)`)
        .join('; ');

      const topTypesList = topTypes
        .slice(0, 4)
        .map((t: any) => `${t.type}: ${t.count} WOs, ${fmt(this.toNumber(t.totalCost))} total (avg ${fmt(this.toNumber(t.avgCost))})`)
        .join('; ');

      const latestMonth = timeline.at(-1);
      const trendLine = latestMonth
        ? `${latestMonth.monthKey}: ${latestMonth.created} WOs, ${latestMonth.completed} done, ${latestMonth.overdue} overdue, cost ${fmt(this.toNumber(latestMonth.totalCost))}`
        : '';

      const mechanicCount = mechanics.filter((m: any) => m.mechanic !== 'Unassigned').length;

      const prompt = `You are a senior fleet maintenance analyst. Analyze mechanic work order data for actionable insights. Be specific and data-driven. No preamble.

Work Order Data:
- Total WOs: ${s.totalWorkOrders} (${s.openWorkOrders} open, ${s.inProgressWorkOrders} in-progress, ${s.overdueWorkOrders} OVERDUE, ${s.completedWorkOrders} completed)
- Total cost: ${fmt(s.totalCost)} (parts ${fmt(s.totalPartsCost)}, labor ${fmt(s.totalLaborCost)}, avg ${fmt(s.avgCostPerWorkOrder)}/WO)
- Mechanics: ${mechanicCount} assigned
- By workload: ${topByLoad || 'No data'}
- With overdue WOs: ${topOverdue || 'None — all on track'}
- By cost: ${topCostMechanics || 'No cost data'}
- Top WO types: ${topTypesList || 'No data'}
${trendLine ? `- Latest month: ${trendLine}` : ''}

Respond in this exact format:
1. Status Summary
[2 sentences: fleet WO health, overdue severity, and cost exposure]

2. Mechanic Performance
[3 bullet points with specific mechanic names, WO counts, cost figures, and % completion]

3. Priority Actions
[3 prioritized actions with mechanic names and measurable targets]

4. Cost Watch
[1 metric — which mechanic or WO type is driving highest cost and why it matters]`;

      return this.geminiAiService.generateGeminiText(prompt);
    });
  }

  private getDefaultChecklistSteps(title: string) {
    return [
      { stepNumber: 1, title: 'Pre-Work Safety & Visual Inspection', description: 'Inspect workspace, secure vehicle, check for leaks/damage around area.', priority: 'HIGH' },
      { stepNumber: 2, title: 'Component Disassembly & Inspection', description: `Access and inspect components relevant to ${title}.`, priority: 'HIGH' },
      { stepNumber: 3, title: 'Part Replacement / Fluid Service', description: 'Replace worn parts or fluids according to VMMS service manual standards.', priority: 'HIGH' },
      { stepNumber: 4, title: 'Torque & Fastener Verification', description: 'Verify all bolts, fittings, and clamps are torqued to OEM specifications.', priority: 'MEDIUM' },
      { stepNumber: 5, title: 'Post-Service Test & Diagnostics', description: 'Run engine/system test, verify zero leakage or error codes.', priority: 'MEDIUM' },
      { stepNumber: 6, title: 'Sign-off & Work Order Logging', description: 'Log completed tasks, parts used, and updated odometer reading.', priority: 'LOW' },
    ];
  }

  private toNumber(value: unknown): number {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }
    if (typeof value === 'string') {
      const parsed = Number(value.replace(/[^0-9.-]/g, ''));
      return Number.isFinite(parsed) ? parsed : 0;
    }
    return 0;
  }
}
