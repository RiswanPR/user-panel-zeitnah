import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';

import { AuthService } from './auth.service';

import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

import { JwtAuthGuard }
from '../../common/guards/jwt-auth.guard';

@Controller('auth')

export class AuthController {

  constructor(
    private authService: AuthService,
  ) {}

  @Get()
  test() {
    return {
      message: 'Backend Connected Successfully',
    };
  }

  @Post('register')
  register(
    @Body() body: RegisterDto,
  ) {
    return this.authService.register(body);
  }

  @Post('login')
  login(
    @Body() body: LoginDto,
  ) {
    return this.authService.login(body);
  }

  @UseGuards(JwtAuthGuard)

  @Get('me')
  getMe(@Req() req: any) {

    return {
      user: req.user,
    };

  }

}