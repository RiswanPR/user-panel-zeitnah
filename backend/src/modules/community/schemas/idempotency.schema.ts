import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

export type CommunityPublishIdempotencyDocument = CommunityPublishIdempotency &
  Document;

export type IdempotencyStatus = 'PENDING' | 'COMPLETED' | 'FAILED';

@Schema({ timestamps: true, collection: 'community_publish_idempotency' })
export class CommunityPublishIdempotency {
  @Prop({ type: String, default: () => uuidv4() })
  _id: string;

  @Prop({ type: String, required: true, index: true })
  userId: string;

  @Prop({
    type: String,
    required: true,
    enum: ['CREATE_POST', 'CREATE_STORY'],
    index: true,
  })
  operation: 'CREATE_POST' | 'CREATE_STORY';

  @Prop({ type: String, required: true, index: true })
  idempotencyKey: string;

  @Prop({ type: String, required: true })
  requestFingerprint: string;

  @Prop({
    type: String,
    enum: ['PENDING', 'COMPLETED', 'FAILED'],
    default: 'PENDING',
    index: true,
  })
  status: IdempotencyStatus;

  @Prop({ type: String })
  resourceId?: string;

  @Prop({ type: Object })
  responseSnapshot?: any;

  @Prop({
    type: Date,
    default: () => new Date(Date.now() + 24 * 60 * 60 * 1000), // 24-hour TTL expiration
    index: { expires: 0 },
  })
  expiresAt: Date;
}

export const CommunityPublishIdempotencySchema = SchemaFactory.createForClass(
  CommunityPublishIdempotency,
);

// Compound Unique Index: Guarantees multi-instance cluster safety per user, operation, and idempotency key
CommunityPublishIdempotencySchema.index(
  { userId: 1, operation: 1, idempotencyKey: 1 },
  { unique: true },
);
