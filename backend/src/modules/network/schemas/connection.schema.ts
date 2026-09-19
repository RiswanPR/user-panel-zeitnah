import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ConnectionDocument = Connection &
  Document & {
    createdAt: Date;
    updatedAt: Date;
  };

export type ConnectionStatus =
  'pending' | 'accepted' | 'declined' | 'cancelled';

@Schema({
  timestamps: true,
  collection: 'network_connections',
})
export class Connection {
  @Prop({
    type: Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  })
  requesterId!: Types.ObjectId;

  @Prop({
    type: Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  })
  recipientId!: Types.ObjectId;

  @Prop({
    type: String,
    required: true,
    index: true,
  })
  userLow!: string;

  @Prop({
    type: String,
    required: true,
    index: true,
  })
  userHigh!: string;

  @Prop({
    type: String,
    enum: ['pending', 'accepted', 'declined', 'cancelled'],
    default: 'pending',
    index: true,
  })
  status!: ConnectionStatus;
}

export const ConnectionSchema = SchemaFactory.createForClass(Connection);

// Unique canonical pair index guarantees no duplicate relationships between any two users
ConnectionSchema.index({ userLow: 1, userHigh: 1 }, { unique: true });

// Query indexes for fast request lookups and connection queries
ConnectionSchema.index({ requesterId: 1, status: 1 });
ConnectionSchema.index({ recipientId: 1, status: 1 });
