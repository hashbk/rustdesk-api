import { Controller, Post } from '@nestjs/common';

@Controller()
export class SystemController {
  @Post('sysinfo')
  submitSysInfo() {
    return {
      message: '提交系统信息成功',
      success: true,
      data: { submitTime: new Date().toISOString() }
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
