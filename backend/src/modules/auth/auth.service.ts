import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';

import { InjectModel } from '@nestjs/mongoose';

import { Model } from 'mongoose';

import * as bcrypt from 'bcrypt';

import {
  User,
  UserDocument,
} from './schemas/user.schema';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {

  constructor(
    @InjectModel(User.name)
  private userModel: Model<UserDocument>,

  private jwtService: JwtService,
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
  async login(data: any) {

  const user =
    await this.userModel.findOne({
      email: data.email,
    });

  if (!user) {
    throw new UnauthorizedException(
      'Invalid credentials',
    );
  }

  const isMatch =
    await bcrypt.compare(
      data.password,
      user.password,
    );

  if (!isMatch) {
    throw new UnauthorizedException(
      'Invalid credentials',
    );
  }

  const token =
    this.jwtService.sign({
      userId: user._id,
      role: user.role,
    });

  return {
    message: 'Login successful',
    token,
    user,
  };
}

}