import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // 💡 CORS aktif et
  app.enableCors({
    origin: 'http://localhost:3001', // Frontend'in adresi
  });

  await app.listen(3000);
}
bootstrap();
