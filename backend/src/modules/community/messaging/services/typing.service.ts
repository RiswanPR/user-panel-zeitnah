import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Typing, TypingDocument } from '../schemas/typing.schema';

@Injectable()
export class TypingService {
  constructor(
    @InjectModel(Typing.name)
    private readonly typingModel: Model<TypingDocument>,
  ) {}

  async startTyping(
    conversationId: string,
    userId: string,
  ): Promise<TypingDocument> {
    return this.typingModel.findOneAndUpdate(
      { conversationId, userId } as any,
      {
        $set: { startedAt: new Date() },
      },
      { upsert: true, new: true },
    );
  }

  async stopTyping(
    conversationId: string,
    userId: string,
  ): Promise<{ success: boolean }> {
    await this.typingModel.deleteOne({ conversationId, userId } as any);
    return { success: true };
  }

  async getTypingUsers(conversationId: string): Promise<string[]> {
    const records = await this.typingModel.find({ conversationId }).exec();
    return records.map((r) => r.userId);
  }
}
