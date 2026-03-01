import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TemporaryPasswordController } from './temporary-password.controller';
import { TemporaryPasswordService } from './temporary-password.service';
import { TemporaryPassword } from './entities/temporary-password.entity';

/**
 * 临时密码模块
 * 提供客户端临时密码上传功能
 */
@Module({
  imports: [TypeOrmModule.forFeature([TemporaryPassword])],
  controllers: [TemporaryPasswordController],
  providers: [TemporaryPasswordService],
  exports: [TemporaryPasswordService],
})
export class TemporaryPasswordModule {}
