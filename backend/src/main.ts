import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // If you hit PayloadTooLargeError, set higher limits via body-parser / multer config.
  // For initial prototype, leave default unless you know files are large.

  await app.listen(3007);
}
bootstrap();
