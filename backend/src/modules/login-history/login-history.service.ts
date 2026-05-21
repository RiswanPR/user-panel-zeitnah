import {
  Injectable,
} from '@nestjs/common';

import {
  InjectModel,
} from '@nestjs/mongoose';

import {
  Model,
} from 'mongoose';

import {

  LoginHistory,
  LoginHistoryDocument,

} from './schemas/login-history.schema';

@Injectable()

export class LoginHistoryService {

  constructor(

    @InjectModel(
      LoginHistory.name,
    )

    private loginHistoryModel:
      Model<LoginHistoryDocument>,

  ) {}

  async create(data: any) {

    return await this.loginHistoryModel.create(
      data,
    );

  }

}