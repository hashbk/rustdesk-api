import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VersionCheckController } from './version-check.controller';
import { VersionCheckService } from './version-check.service';
import { Version } from './entities/version.entity';

/**
 * 版本检查模块
 * 提供客户端版本更新检查功能
 */
@Module({
  imports: [TypeOrmModule.forFeature([Version])],
  controllers: [VersionCheckController],
  providers: [VersionCheckService],
  exports: [VersionCheckService],
})
export class VersionCheckModule {}
