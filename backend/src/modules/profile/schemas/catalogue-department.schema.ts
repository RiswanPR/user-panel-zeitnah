import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type CatalogueDepartmentDocument = CatalogueDepartment & Document;

@Schema({ timestamps: true, collection: 'catalogue_departments' })
export class CatalogueDepartment {
  @Prop({ type: String, required: true, unique: true, index: true, trim: true })
  id!: string;

  @Prop({ type: String, required: true, trim: true })
  name!: string;

  @Prop({
    type: String,
    required: true,
    enum: ['active', 'retired'],
    default: 'active',
    index: true,
  })
  status!: 'active' | 'retired';

  @Prop({ type: Number, required: true, default: 0, index: true })
  displayOrder!: number;

  @Prop({ type: String, default: '2026.1' })
  catalogueVersion!: string;

  @Prop({ type: [String], default: [] })
  aliases!: string[];

  @Prop({ type: Date })
  createdAt?: Date;

  @Prop({ type: Date })
  updatedAt?: Date;
}

export const CatalogueDepartmentSchema =
  SchemaFactory.createForClass(CatalogueDepartment);
CatalogueDepartmentSchema.index({ displayOrder: 1, id: 1 });
CatalogueDepartmentSchema.index({ status: 1, displayOrder: 1 });
