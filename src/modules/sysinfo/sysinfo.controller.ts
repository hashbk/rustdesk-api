import { Controller, Post, Body } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { SysinfoService } from './sysinfo.service';
import { SysinfoDto } from './dto/sysinfo.dto';
import { Public } from '../auth/decorators/public.decorator';

@Controller()
export class SysinfoController {
  constructor(private readonly sysinfoService: SysinfoService) {}

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('sysinfo')
  async submitSysInfo(@Body() sysinfoDto: SysinfoDto) {
    const result = await this.sysinfoService.createSysinfo(sysinfoDto);
    return {
      message: '提交系统信息成功',
      success: true,
      data: { uuid: result.uuid, submitTime: result.createdAt }
    };
  }
}
