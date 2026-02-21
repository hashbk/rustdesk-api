import { Controller, Post, Body } from '@nestjs/common';
import { SysinfoService } from './sysinfo.service';
import { SysinfoDto } from './dto/sysinfo.dto';
import { Public } from '../auth/decorators/public.decorator';

@Controller()
export class SysinfoController {
  constructor(private readonly sysinfoService: SysinfoService) {}

  @Public()
  @Post('sysinfo')
  async submitSysInfo(@Body() sysinfoDto: SysinfoDto) {
    const result = await this.sysinfoService.createSysinfo(sysinfoDto);
    return {
      message: '提交系统信息成功',
      success: true,
      data: { uuid: result.uuid, submitTime: result.createdAt }
    };
  }

  @Public()
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
