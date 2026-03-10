import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';

import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { UserAccount } from '../../db/entities/user-account.entity';
import { TwoFactorService } from '../../infrastructure/common/2fa.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([UserAccount]),
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'dev-secret-change-me',
      signOptions: {
        expiresIn: '15m',
      },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, TwoFactorService],
  exports: [AuthService],
})
export class AuthModule {}
