import {
  Module,
} from '@nestjs/common';

import {
  MongooseModule,
} from '@nestjs/mongoose';

import {
  ProfileController,
} from './profile.controller';

import {
  ProfileService,
} from './profile.service';

import {
  User,
  UserSchema,
} from '../auth/schemas/user.schema';

import { AwsModule } from '../../common/aws/aws.module';

@Module({

  imports: [

    MongooseModule.forFeature([

      {
        name: User.name,
        schema: UserSchema,
      },

    ]),
    AwsModule,
  ],

  controllers: [
    ProfileController,
  ],

  providers: [
    ProfileService,
  ],

})

export class ProfileModule {}