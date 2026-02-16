import { Controller, Get } from '@nestjs/common';

@Controller()
export class DeviceGroupController {
  @Get('device-group/accessible')
  getAccessibleDeviceGroup() {
    return {
      message: '获取可访问的设备群组接口',
      data: [
        { groupId: 'g001', name: '默认设备组', desc: '所有设备' },
        { groupId: 'g002', name: '测试设备组', desc: '测试用设备' }
      ]
    };
  }

  @Get('peers')
  getPeers() {
    return {
      message: '获取机器列表接口',
      data: [
        { peerId: 'p001', name: '服务器01', ip: '192.168.1.100', status: 'online' },
        { peerId: 'p002', name: '客户端01', ip: '192.168.1.101', status: 'offline' }
      ]
    };
  }
}
