import {
  Injectable,
  BadRequestException,
} from '@nestjs/common';

import { InjectModel } from '@nestjs/mongoose';

import { Model } from 'mongoose';

import * as bcrypt from 'bcrypt';

import {
  User,
  UserDocument,
} from './schemas/user.schema';

@Injectable()
export class AuthService {

  constructor(
    @InjectModel(User.name)
    private userModel: Model<UserDocument>,
  ) {}

  async register(data: any) {

    const existingUser =
      await this.userModel.findOne({
        email: data.email,
      });

    if (existingUser) {
      throw new BadRequestException(
        'Email already exists',
      );
    }

    const hashedPassword =
      await bcrypt.hash(data.password, 10);

    const user =
      await this.userModel.create({
        ...data,
        password: hashedPassword,
      });

    return {
      message: 'User registered successfully',
      user,
    };
  }

}