import { Controller, Post, Body } from '@nestjs/common';
import { SysinfoService } from './sysinfo.service';
import { SysinfoDto } from './dto/sysinfo.dto';

@Controller()
export class SystemController {
  constructor(private readonly sysinfoService: SysinfoService) {}

  @Post('sysinfo')
  async submitSysInfo(@Body() sysinfoDto: SysinfoDto) {
    const result = await this.sysinfoService.createSysinfo(sysinfoDto);
    return {
      message: '提交系统信息成功',
      success: true,
      data: { id: result.id, submitTime: result.createdAt }
    };
  }

  @Post('sysinfo_ver')
  getSysInfoVer() {
    return {
      message: '获取系统版本信息接口',
      data: {
        version: 'v1.2.3',
        buildTime: '2026-02-16 10:00:00',
        os: 'linux/amd64',
        nodeVersion: 'v20.10.0'
      }
    };
  }
}
