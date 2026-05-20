import {
  Body,
  Controller,
  Get,
  Post,
} from '@nestjs/common';

import { AuthService } from './auth.service';

import { RegisterDto } from './dto/register.dto';

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

}