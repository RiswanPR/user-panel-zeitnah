import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

export type CertificateDocument = Certificate & Document;

@Schema({ timestamps: true, collection: 'community_certificates' })
export class Certificate {
  @Prop({ type: String, default: () => uuidv4() })
  _id: string;

  @Prop({ type: String, required: true, index: true })
  userId: string;

  @Prop({ type: String, required: true, trim: true })
  title: string;

  @Prop({ type: String, required: true, trim: true })
  issuingOrganization: string;

  @Prop({ type: Date, required: true })
  issueDate: Date;

  @Prop({ type: Date, default: null })
  expirationDate?: Date;

  @Prop({ type: String, default: '' })
  credentialId: string;

  @Prop({ type: String, default: '' })
  credentialUrl: string;

  @Prop({ type: String, default: '' })
  certificateImage: string;
}

export const CertificateSchema = SchemaFactory.createForClass(Certificate);
CertificateSchema.index({ userId: 1, issueDate: -1 });
