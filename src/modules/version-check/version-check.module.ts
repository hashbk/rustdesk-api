import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MulterModule } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { VersionCheckController } from './version-check.controller';
import { VersionCheckService } from './version-check.service';
import { Version } from './entities/version.entity';
import { ReleaseSyncAuthGuard } from './guards';
import { FileStorageService } from './services';

/**
 * 版本检查模块
 * 提供客户端版本更新检查功能
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([Version]),
    MulterModule.register({
      storage: memoryStorage(), // 使用内存存储，文件会保存在内存中
      limits: {
        fileSize: 524288000, // 500MB 最大文件大小
        files: 10, // 最多 10 个文件
      },
    }),
  ],
  controllers: [VersionCheckController],
  providers: [VersionCheckService, ReleaseSyncAuthGuard, FileStorageService],
  exports: [VersionCheckService, FileStorageService],
})
export class VersionCheckModule {}
