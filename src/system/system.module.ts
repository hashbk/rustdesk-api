import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SystemController } from './system.controller';
import { SysinfoService } from './sysinfo.service';
import { Sysinfo } from './entities/sysinfo.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Sysinfo])],
  controllers: [SystemController],
  providers: [SysinfoService],
  exports: [SysinfoService],
})
export class SystemModule {}
