import { Injectable } from '@nestjs/common';
import { DuckDBConnection } from '@duckdb/node-api';
import { DuckDbDataMartService } from './duckdb-datamart.service';

type DataMartRow = Record<string, unknown>;

@Injectable()
export class VehicleKpiService {
  constructor(private readonly dataMartService: DuckDbDataMartService) {}

  calculateRiskScore(vehicle: any): number {
    let score = 0;
    const overdue = this.toNumber(vehicle.overdueSchedules);
    const active = this.toNumber(vehicle.activeSchedules);
    const completion = this.toNumber(vehicle.completionRate);
    
    score += overdue * 35;
    score += active * 10;
    if (completion < 100) {
      score += (100 - completion) * 0.2;
    }
    
    let nextDueDate = String(vehicle.nextDueDate ?? '').trim();
    if (nextDueDate.toLowerCase() === 'null' || nextDueDate.toLowerCase() === 'undefined' || nextDueDate === 'Invalid Date') {
      nextDueDate = '';
    }
    if (!nextDueDate && active > 0) {
      score += 15;
    }
    
    return Math.min(Math.max(Math.round(score), 0), 100);
  }

  getRiskLevel(score: number): string {
    if (score > 70) return 'HIGH';
    if (score >= 40) return 'MEDIUM';
    return 'LOW';
  }

  buildVehicleRiskReason(vehicle: any): string {
    const overdueSchedules = this.toNumber(vehicle.overdueSchedules);
    const activeSchedules = this.toNumber(vehicle.activeSchedules);
    const dueWithin7Days = this.toNumber(vehicle.dueWithin7Days);
    const completionRate = this.toNumber(vehicle.completionRate);
    let nextDueDate = String(vehicle.nextDueDate ?? '').trim();
    if (nextDueDate.toLowerCase() === 'null' || nextDueDate.toLowerCase() === 'undefined' || nextDueDate === 'Invalid Date') {
      nextDueDate = '';
    }
    const status = String(vehicle.vehicleStatus ?? '').trim();
    const riskLevel = String(vehicle.riskLevel ?? '').toUpperCase();

    const parts: string[] = [];
    if (overdueSchedules > 0) {
      parts.push(`${overdueSchedules} overdue schedule${overdueSchedules === 1 ? '' : 's'}`);
    }
    if (activeSchedules > 0) {
      parts.push(`${activeSchedules} active schedule${activeSchedules === 1 ? '' : 's'}`);
    }
    if (dueWithin7Days > 0) {
      parts.push(`${dueWithin7Days} due within 7 days`);
    }
    if (status && status !== 'AVAILABLE' && parts.length === 0) {
      parts.push(`status is ${status.toLowerCase()}`);
    }

    let reason = parts.length > 0
      ? `${parts.join(', ')}.`
      : 'No active or upcoming maintenance requirements.';

    if (nextDueDate) {
      reason += ` Next due ${nextDueDate}.`;
    }
    if (!Number.isNaN(completionRate)) {
      reason += ` Completion ${completionRate}%.`;
    }

    if (reason === 'No active or upcoming maintenance requirements.' && riskLevel === 'MEDIUM') {
      reason = `Medium risk; review upcoming work and validate schedule completion. Completion ${completionRate}%${nextDueDate ? `, next due ${nextDueDate}` : ''}.`;
    }
    if (reason === 'No active or upcoming maintenance requirements.' && riskLevel === 'HIGH') {
      reason = `High risk; overdue or urgent maintenance is expected. Completion ${completionRate}%${nextDueDate ? `, next due ${nextDueDate}` : ''}.`;
    }

    return reason;
  }

  async getVehicleKpis(snapshotMetadata: any) {
    const conn = await this.dataMartService.getConnection();
    const vehicles = await this.dataMartService.query(
      `SELECT vehicleId, plateNumber, vehicleModel, vehicleStatus,
              currentOdometer, totalSchedules, activeSchedules,
              completedSchedules, overdueSchedules, dueWithin7Days,
              maintenanceCost, completionRate,
              CAST(latestMaintenanceDate AS VARCHAR) AS latestMaintenanceDate,
              CAST(nextDueDate AS VARCHAR) AS nextDueDate, riskLevel
       FROM vehicle_maintenance_kpi
       ORDER BY CASE riskLevel WHEN 'HIGH' THEN 1 WHEN 'MEDIUM' THEN 2 ELSE 3 END,
                plateNumber`,
    );

    const vehiclesWithRiskReason = (vehicles || []).map((vehicle: any) => {
      const riskScore = this.calculateRiskScore(vehicle);
      const computedRiskLevel = this.getRiskLevel(riskScore);
      const updatedVehicle = { ...vehicle, riskScore, riskLevel: computedRiskLevel };
      return {
        ...updatedVehicle,
        riskReason: this.buildVehicleRiskReason(updatedVehicle),
      };
    });
    
    vehiclesWithRiskReason.sort((a, b) => {
      const levelWeight = (lvl: string) => lvl === 'HIGH' ? 1 : lvl === 'MEDIUM' ? 2 : 3;
      const diff = levelWeight(a.riskLevel) - levelWeight(b.riskLevel);
      if (diff !== 0) return diff;
      return a.plateNumber.localeCompare(b.plateNumber);
    });

    return { dataSource: snapshotMetadata, vehicles: vehiclesWithRiskReason };
  }

  async getAlerts(snapshotMetadata: any) {
    const alerts = await this.dataMartService.query(
      `SELECT a.alertId, a.scheduleId, a.vehiclePlate, a.severity, a.alertType,
              a.maintenanceTitle, a.message, a.recommendedAction,
              CAST(a.dueDate AS VARCHAR) AS dueDate,
              CAST(a.generatedAt AS VARCHAR) AS generatedAt,
              k.totalSchedules, k.activeSchedules, k.completedSchedules, k.overdueSchedules,
              k.dueWithin7Days, k.completionRate, CAST(k.nextDueDate AS VARCHAR) AS nextDueDate,
              k.vehicleStatus, k.riskLevel as rawRiskLevel
       FROM maintenance_alerts a
       LEFT JOIN vehicle_maintenance_kpi k ON a.vehiclePlate = k.plateNumber
       ORDER BY a.dueDate NULLS LAST, a.vehiclePlate`,
    );
    
    const normalizedAlerts = alerts.map((alert: any) => {
      const vehicleForRisk = {
        overdueSchedules: alert.overdueSchedules ?? 0,
        activeSchedules: alert.activeSchedules ?? 0,
        completionRate: alert.completionRate ?? 100,
        nextDueDate: alert.nextDueDate,
        vehicleStatus: alert.vehicleStatus
      };
      const riskScore = this.calculateRiskScore(vehicleForRisk);
      const computedSeverity = this.getRiskLevel(riskScore);
      
      let severityToUse = computedSeverity;
      if (computedSeverity === 'LOW' && (alert.severity === 'HIGH' || alert.severity === 'MEDIUM')) {
        severityToUse = alert.severity;
      }

      return {
        ...alert,
        severity: severityToUse,
      };
    }).sort((a, b) => {
      const s = (sev: string) => sev === 'HIGH' ? 1 : sev === 'MEDIUM' ? 2 : 3;
      return s(a.severity) - s(b.severity);
    });

    return { dataSource: snapshotMetadata, alerts: normalizedAlerts };
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
