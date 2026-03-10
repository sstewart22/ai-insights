import { Injectable, BadRequestException } from '@nestjs/common';
//import { authenticator } from 'otplib';
import { authenticator } from '@otplib/preset-default';
import * as qrcode from 'qrcode';
import { encryptSecret, decryptSecret } from '../../utils/crypto.util';
import { Repository } from 'typeorm';
import { UserAccount } from '../../db/entities/user-account.entity';
import { InjectRepository } from '@nestjs/typeorm';
authenticator.options = { step: 30, digits: 6, window: 1 };

@Injectable()
export class TwoFactorService {
  constructor(
    @InjectRepository(UserAccount)
    private readonly accountRepo: Repository<UserAccount>,
  ) {}

  async beginSetup(userId: string) {
    const user = await this.accountRepo.findOne({ where: { id: userId } });
    if (!user) throw new BadRequestException('User not found');

    const secret = authenticator.generateSecret();
    const issuer = 'ICX Agent Assistant';
    const otpauth = authenticator.keyuri(user.email, issuer, secret);
    const qrDataUrl = await qrcode.toDataURL(otpauth);

    user.twoFactorSecretEnc = encryptSecret(secret);
    user.twoFactorEnabled = false;
    user.twoFactorConfirmedAt = null;
    await this.accountRepo.save(user);

    return { qrDataUrl, manualKey: secret, otpauth };
  }

  async confirmSetup(userId: string, code: string) {
    const user = await this.accountRepo.findOne({ where: { id: userId } });
    if (!user?.twoFactorSecretEnc)
      throw new BadRequestException('2FA not started');

    const secret = decryptSecret(user.twoFactorSecretEnc);
    const ok = authenticator.check(code, secret);
    if (!ok) throw new BadRequestException('Invalid code');

    user.twoFactorEnabled = true;
    user.twoFactorConfirmedAt = new Date();
    await this.accountRepo.save(user);

    return { enabled: true };
  }

  async verifyCode(userId: string, code: string) {
    const user = await this.accountRepo.findOne({ where: { id: userId } });
    if (!user?.twoFactorEnabled || !user.twoFactorSecretEnc) return false;

    const secret = decryptSecret(user.twoFactorSecretEnc);
    return authenticator.check(code, secret);
  }
}
