import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { DeviceGroupService } from './services';
import { PeerService } from './peer.service';
import { DeviceGroupQueryDto } from './dto/device-group.dto';
import { PeerQueryDto } from './dto/peer.dto';
import { UserQueryDto } from './dto/user.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

/**
 * 设备组控制器
 * 管理设备组相关的客户端接口
 */
@Controller()
export class DeviceGroupController {
  constructor(
    private readonly deviceGroupService: DeviceGroupService,
    private readonly peerService: PeerService,
  ) {}

  // ============ 客户端 API 接口 ============

  /**
   * 获取当前用户可访问的设备组列表
   * GET /api/device-group/accessible?current=1&pageSize=100
   * 管理员可以看到所有设备组
   */
  @Get('device-group/accessible')
  async getAccessibleDeviceGroups(
    @CurrentUser('id') userId: string,  // 保持原有字段名 id
    @CurrentUser('isAdmin') isAdmin: boolean,
    @Query() query: DeviceGroupQueryDto,
  ) {
    return this.deviceGroupService.getAccessibleDeviceGroups(userId, query, isAdmin);
  }

  /**
   * 获取当前用户可访问的设备列表
   * GET /api/peers?current=1&pageSize=100&accessible=&status=1
   * 管理员可以看到所有设备
   */
  @Get('peers')
  async getAccessiblePeers(
    @CurrentUser('id') userId: string,  // 保持原有字段名 id
    @CurrentUser('isAdmin') isAdmin: boolean,
    @Query() query: PeerQueryDto,
  ) {
    return this.peerService.getAccessiblePeers(userId, query, isAdmin);
  }

  /**
   * 获取当前用户可访问的用户列表
   * GET /api/users?current=1&pageSize=100&accessible=&status=1
   * 管理员可以看到所有用户
   */
  @Get('users')
  async getAccessibleUsers(
    @CurrentUser('id') userId: string,  // 保持原有字段名 id
    @CurrentUser('isAdmin') isAdmin: boolean,
    @Query() query: UserQueryDto,
  ) {
    return this.deviceGroupService.getAccessibleUsers(userId, query, isAdmin);
  }
}
