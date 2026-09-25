import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type InfrastructureMarketSnapshotDocument =
  InfrastructureMarketSnapshot & Document;

export interface RoleDemandItem {
  roleTitle: string;
  activeJobCount: number;
  trend: 'UP' | 'STABLE' | 'EMERGING';
}

export interface SkillDemandItem {
  skillName: string;
  frequency: number;
  percentage: number;
  trend: 'UP' | 'STABLE';
}

export interface SoftwareDemandItem {
  softwareName: string;
  frequency: number;
  percentage: number;
  trend: 'UP' | 'STABLE';
}

export interface SectorDemandItem {
  sectorName: string;
  count: number;
}

export interface LocationDemandItem {
  location: string;
  count: number;
}

@Schema({ timestamps: true, collection: 'infrastructure_market_snapshots' })
export class InfrastructureMarketSnapshot {
  @Prop({ type: Date, default: Date.now, index: true })
  snapshotDate!: Date;

  @Prop({
    type: String,
    default:
      'Observed across active Zeitnah infrastructure jobs in the last 90 days',
  })
  observationWindow!: string;

  @Prop({ type: String, default: 'Zeitnah Infrastructure Network Platform' })
  source!: string;

  @Prop({ type: String, default: 'Previous 90 days' })
  observationPeriod!: string;

  @Prop({ type: String, default: 'Active published infrastructure jobs' })
  population!: string;

  @Prop({
    type: String,
    default:
      'Deterministic frequency distribution and percentile calculation across active Zeitnah job postings',
  })
  calculationMethod!: string;

  @Prop({ type: String, default: '' })
  disclaimer!: string;

  @Prop({ type: Number, required: true, default: 0 })
  totalActiveJobs!: number;

  @Prop({ type: [Object], default: [] })
  roleDemand!: RoleDemandItem[];

  @Prop({ type: [Object], default: [] })
  skillDemand!: SkillDemandItem[];

  @Prop({ type: [Object], default: [] })
  softwareDemand!: SoftwareDemandItem[];

  @Prop({ type: [Object], default: [] })
  sectorDemand!: SectorDemandItem[];

  @Prop({ type: [Object], default: [] })
  locationDemand!: LocationDemandItem[];

  @Prop({ type: String, default: 'v1' })
  modelVersion!: string;
}

export const InfrastructureMarketSnapshotSchema = SchemaFactory.createForClass(
  InfrastructureMarketSnapshot,
);

InfrastructureMarketSnapshotSchema.index({ snapshotDate: -1 });
