import { Body, Controller, Get, Headers, Patch, Post } from '@nestjs/common';
import { Public } from './public.decorator';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { Verify2faDto } from './dto/verify-2fa.dto';
import { OtpCodeDto } from './dto/otp-code.dto';
import { ChangePasswordDto } from '../user/dto/change-password.dto';

@Controller('uiapi/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Public()
  @Post('refresh')
  refresh(@Body() dto: RefreshDto) {
    return this.authService.refresh(dto);
  }

  @Get('me')
  me(@Headers('authorization') auth?: string) {
    return this.authService.me(auth);
  }

  @Patch('password')
  changeMyPassword(
    @Headers('authorization') auth: string,
    @Body() dto: ChangePasswordDto,
  ) {
    return this.authService.changeMyPassword(auth, dto);
  }

  @Post('2fa/setup')
  setup2fa(@Headers('authorization') auth?: string) {
    return this.authService.setup2fa(auth);
  }

  @Post('2fa/confirm')
  confirm2fa(@Headers('authorization') auth: string, @Body() dto: OtpCodeDto) {
    return this.authService.confirm2fa(auth, dto);
  }

  @Get('2fa/status')
  twoFaStatus(@Headers('authorization') auth?: string) {
    return this.authService.twoFaStatus(auth);
  }

  @Post('2fa/verify')
  @Public()
  verify2fa(@Body() dto: Verify2faDto) {
    return this.authService.verify2fa(dto);
  }

  @Post('2fa/disable')
  disable2fa(@Headers('authorization') auth: string, @Body() dto: OtpCodeDto) {
    return this.authService.disable2fa(auth, dto);
  }

  @Post('2fa/reset')
  reset2fa(@Headers('authorization') auth: string, @Body() dto: OtpCodeDto) {
    return this.authService.reset2fa(auth, dto);
  }
}
