import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { SUPPORT_CATEGORIES } from '../dto/create-support-ticket.dto';

export type SupportTicketDocument = SupportTicket & Document;

@Schema({ timestamps: true })
export class SupportTicket {
  @Prop({ required: true, unique: true, index: true })
  ticketNumber: string;

  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ required: true, trim: true, lowercase: true, index: true })
  email: string;

  @Prop({
    required: true,
    enum: SUPPORT_CATEGORIES,
    default: 'OTHER',
    index: true,
  })
  category: string;

  @Prop({ required: true, trim: true })
  subject: string;

  @Prop({ required: true })
  message: string;

  @Prop({
    default: 'OPEN',
    enum: ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'],
    index: true,
  })
  status: string;

  @Prop({ type: Types.ObjectId, ref: 'User', required: false })
  userId?: Types.ObjectId;

  @Prop({ type: Object, default: {} })
  metadata?: Record<string, any>;

  createdAt?: Date;
  updatedAt?: Date;
}

export const SupportTicketSchema = SchemaFactory.createForClass(SupportTicket);
SupportTicketSchema.index({ createdAt: -1 });
SupportTicketSchema.index({ email: 1, status: 1 });
