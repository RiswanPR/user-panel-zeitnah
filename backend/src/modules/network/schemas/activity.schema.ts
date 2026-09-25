import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type NetworkActivityDocument = NetworkActivity & Document;

@Schema({ timestamps: true, collection: 'network_activities' })
export class NetworkActivity {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ type: String, required: true })
  type: string;

  @Prop({ type: Types.ObjectId })
  targetId?: Types.ObjectId;

  @Prop({ type: String, default: '' })
  targetType: string;

  @Prop({ type: Object, default: {} })
  metadata: Record<string, any>;
}

export const NetworkActivitySchema =
  SchemaFactory.createForClass(NetworkActivity);
NetworkActivitySchema.index({ userId: 1, createdAt: -1 });
