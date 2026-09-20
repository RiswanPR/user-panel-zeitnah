import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type NetworkConnectionDocument = NetworkConnection & Document;
export type ConnectionDocument = NetworkConnectionDocument;

export type ConnectionStatus =
  | 'pending'
  | 'accepted'
  | 'declined'
  | 'cancelled';

@Schema({
  timestamps: true,
  collection: 'network_connections',
})
export class NetworkConnection {
  @Prop({
    type: Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  })
  requesterId: Types.ObjectId;

  @Prop({
    type: Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  })
  recipientId: Types.ObjectId;

  @Prop({
    type: Types.ObjectId,
    required: true,
    index: true,
  })
  userLow: Types.ObjectId;

  @Prop({
    type: Types.ObjectId,
    required: true,
    index: true,
  })
  userHigh: Types.ObjectId;

  @Prop({
    type: String,
    enum: ['pending', 'accepted', 'declined', 'cancelled'],
    default: 'pending',
    index: true,
  })
  status: string;
}

export const NetworkConnectionSchema = SchemaFactory.createForClass(NetworkConnection);

// Compound unique index ensuring only one connection pair exists between any two users
NetworkConnectionSchema.index({ userLow: 1, userHigh: 1 }, { unique: true });
NetworkConnectionSchema.index({ requesterId: 1, status: 1 });
NetworkConnectionSchema.index({ recipientId: 1, status: 1 });

export { NetworkConnection as Connection, NetworkConnectionSchema as ConnectionSchema };
