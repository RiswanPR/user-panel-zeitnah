import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type CatalogueTitleDocument = CatalogueTitle & Document;

@Schema({ timestamps: true, collection: 'catalogue_titles' })
export class CatalogueTitle {
  @Prop({ type: String, required: true, unique: true, index: true, trim: true })
  id!: string;

  @Prop({ type: String, required: true, index: true, trim: true })
  departmentId!: string;

  @Prop({ type: String, required: true, trim: true })
  label!: string;

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

export const CatalogueTitleSchema =
  SchemaFactory.createForClass(CatalogueTitle);
CatalogueTitleSchema.index({ departmentId: 1, displayOrder: 1, id: 1 });
CatalogueTitleSchema.index({ status: 1, departmentId: 1 });
