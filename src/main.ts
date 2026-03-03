import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { ValidationPipe, Logger, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { join } from 'path';
import { DownloadThrottleMiddleware } from './common/middleware/download-throttle.middleware';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // 设置全局路由前缀
  app.setGlobalPrefix('api');

  // 启用 CORS
  app.enableCors({
    origin: true,
    credentials: true,
  });

  // 全局验证管道
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  // 配置静态文件服务（用于文件下载）
  const uploadDir = process.env.UPLOAD_DIR || './uploads';
  app.useStaticAssets(join(__dirname, '..', uploadDir), {
    prefix: '/downloads/',
    setHeaders: (res, path) => {
      // 设置缓存头
      res.set('Cache-Control', 'public, max-age=31536000'); // 1年缓存
    },
  });
  logger.log(`Static files served from: ${uploadDir} with prefix: /downloads/`);

  // 应用下载速率限制中间件
  const downloadThrottleMiddleware = new DownloadThrottleMiddleware();
  app.use('/downloads', (req, res, next) => downloadThrottleMiddleware.use(req, res, next));
  logger.log(`Download rate limiting middleware applied to: /downloads`);

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  logger.log(`Application is running on: http://localhost:${port}/api`);
}
bootstrap();
