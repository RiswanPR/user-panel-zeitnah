import { Document, Model, Types } from 'mongoose';

export abstract class BaseRepository<T extends Document> {
  constructor(protected readonly model: Model<T>) {}

  async create(data: Partial<T>): Promise<T> {
    const createdEntity = new this.model(data);
    return await createdEntity.save();
  }

  async findById(id: string): Promise<T | null> {
    if (!id) return null;
    const matches: any[] = [id];
    if (Types.ObjectId.isValid(id)) {
      matches.push(new Types.ObjectId(id));
    }
    return this.model
      .findOne({ _id: { $in: matches }, isDeleted: false })
      .exec();
  }

  async findOne(filterQuery: any): Promise<T | null> {
    return this.model.findOne({ ...filterQuery, isDeleted: false }).exec();
  }

  async find(filterQuery: any): Promise<T[]> {
    return this.model.find({ ...filterQuery, isDeleted: false }).exec();
  }

  async update(id: string, updateQuery: any): Promise<T | null> {
    return this.model
      .findOneAndUpdate({ _id: id as any, isDeleted: false }, updateQuery, {
        returnDocument: 'after',
      })
      .exec();
  }

  async softDelete(id: string): Promise<boolean> {
    const result = await this.model
      .updateOne(
        { _id: id },
        {
          $set: { isDeleted: true, deletedAt: new Date() },
        },
      )
      .exec();
    return result.modifiedCount > 0;
  }
}
