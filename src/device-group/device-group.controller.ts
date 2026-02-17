import { Controller, Get, Post, Put, Delete, Body, Param, Query, ParseIntPipe } from '@nestjs/common';
import { DeviceGroupService } from './device-group.service';
import { PeerService } from './peer.service';
import { DeviceGroupQueryDto, CreateDeviceGroupDto, UpdateDeviceGroupDto } from './dto/device-group.dto';
import { PeerQueryDto, CreatePeerDto, UpdatePeerDto } from './dto/peer.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller()
export class DeviceGroupController {
  constructor(
    private readonly deviceGroupService: DeviceGroupService,
    private readonly peerService: PeerService,
  ) {}

  // ============ 设备组接口 ============

  /**
   * 获取当前用户可访问的设备组列表
   * GET /api/device-group/accessible?current=1&pageSize=100
   */
  @Get('device-group/accessible')
  async getAccessibleDeviceGroups(
    @CurrentUser('id') userId: number,
    @Query() query: DeviceGroupQueryDto,
  ) {
    return this.deviceGroupService.getAccessibleDeviceGroups(userId, query);
  }

  // ============ 设备（Peers）接口 ============

  /**
   * 获取当前用户可访问的设备列表
   * GET /api/peers?current=1&pageSize=100&accessible=&status=1
   */
  @Get('peers')
  async getAccessiblePeers(
    @CurrentUser('id') userId: number,
    @Query() query: PeerQueryDto,
  ) {
    return this.peerService.getAccessiblePeers(userId, query);
  }

  // ============ 管理员接口 - 设备组 ============

  /**
   * 获取所有设备组
   * GET /api/device-groups
   */
  @Get('device-groups')
  async getAllDeviceGroups(
    @CurrentUser('isAdmin') isAdmin: boolean,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    if (!isAdmin) {
      return { error: '无权限访问' };
    }

    const pageNum = parseInt(page || '1', 10);
    const limitNum = parseInt(limit || '20', 10);

    const { groups, total } = await this.deviceGroupService.findAll(pageNum, limitNum);

    return {
      groups: groups.map(g => ({
        id: g.id,
        name: g.name,
        note: g.note,
        owner: g.owner,
        created_at: g.createdAt,
        updated_at: g.updatedAt,
      })),
      total,
      page: pageNum,
      limit: limitNum,
    };
  }

  /**
   * 获取设备组详情
   * GET /api/device-groups/:id
   */
  @Get('device-groups/:id')
  async getDeviceGroup(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('isAdmin') isAdmin: boolean,
  ) {
    if (!isAdmin) {
      return { error: '无权限访问' };
    }

    const group = await this.deviceGroupService.findById(id);
    if (!group) {
      return { error: '设备组不存在' };
    }

    return {
      id: group.id,
      name: group.name,
      note: group.note,
      owner: group.owner,
      created_at: group.createdAt,
      updated_at: group.updatedAt,
    };
  }

  /**
   * 创建设备组
   * POST /api/device-groups
   */
  @Post('device-groups')
  async createDeviceGroup(
    @Body() createDto: CreateDeviceGroupDto,
    @CurrentUser('isAdmin') isAdmin: boolean,
    @CurrentUser('username') username: string,
  ) {
    if (!isAdmin) {
      return { error: '无权限访问' };
    }

    const group = await this.deviceGroupService.create(createDto, username);
    return {
      id: group.id,
      name: group.name,
      note: group.note,
    };
  }

  /**
   * 更新设备组
   * PUT /api/device-groups/:id
   */
  @Put('device-groups/:id')
  async updateDeviceGroup(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateDeviceGroupDto,
    @CurrentUser('isAdmin') isAdmin: boolean,
  ) {
    if (!isAdmin) {
      return { error: '无权限访问' };
    }

    const group = await this.deviceGroupService.update(id, updateDto);
    return {
      id: group.id,
      name: group.name,
      note: group.note,
    };
  }

  /**
   * 删除设备组
   * DELETE /api/device-groups/:id
   */
  @Delete('device-groups/:id')
  async deleteDeviceGroup(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('isAdmin') isAdmin: boolean,
  ) {
    if (!isAdmin) {
      return { error: '无权限访问' };
    }

    await this.deviceGroupService.delete(id);
    return { message: '删除成功' };
  }

  // ============ 管理员接口 - 设备 ============

  /**
   * 获取所有设备
   * GET /api/admin/peers
   */
  @Get('admin/peers')
  async getAllPeers(
    @CurrentUser('isAdmin') isAdmin: boolean,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    if (!isAdmin) {
      return { error: '无权限访问' };
    }

    const pageNum = parseInt(page || '1', 10);
    const limitNum = parseInt(limit || '20', 10);

    const { peers, total } = await this.peerService.findAll(pageNum, limitNum);

    return {
      peers: peers.map(p => {
        const info = p.getInfo();
        return {
          id: p.id,
          user_id: p.userId,
          info: {
            username: info.username,
            hostname: info.hostname,
            device_name: info.device_name,
            os: info.os,
          },
          status: p.status,
          owner_username: p.ownerUsername,
          owner_name: p.ownerName,
          device_group_name: p.deviceGroupName,
          note: p.note,
          created_at: p.createdAt,
          updated_at: p.updatedAt,
        };
      }),
      total,
      page: pageNum,
      limit: limitNum,
    };
  }

  /**
   * 创建或更新设备
   * POST /api/admin/peers
   */
  @Post('admin/peers')
  async upsertPeer(
    @Body() createDto: CreatePeerDto,
    @CurrentUser('isAdmin') isAdmin: boolean,
    @CurrentUser('id') userId: number,
  ) {
    if (!isAdmin) {
      return { error: '无权限访问' };
    }

    const peer = await this.peerService.upsertPeer(userId, createDto);
    const info = peer.getInfo();
    return {
      id: peer.id,
      info: {
        username: info.username,
        hostname: info.hostname,
        device_name: info.device_name,
        os: info.os,
      },
      status: peer.status,
    };
  }

  /**
   * 更新设备
   * PUT /api/admin/peers/:id
   */
  @Put('admin/peers/:id')
  async updatePeer(
    @Param('id') peerId: string,
    @Body() updateDto: UpdatePeerDto,
    @CurrentUser('isAdmin') isAdmin: boolean,
    @CurrentUser('id') userId: number,
  ) {
    if (!isAdmin) {
      return { error: '无权限访问' };
    }

    const peer = await this.peerService.updatePeer(peerId, userId, updateDto);
    const info = peer.getInfo();
    return {
      id: peer.id,
      info: {
        username: info.username,
        hostname: info.hostname,
        device_name: info.device_name,
        os: info.os,
      },
      status: peer.status,
    };
  }

  /**
   * 删除设备
   * DELETE /api/admin/peers/:id
   */
  @Delete('admin/peers/:id')
  async deletePeer(
    @Param('id') peerId: string,
    @CurrentUser('isAdmin') isAdmin: boolean,
    @CurrentUser('id') userId: number,
  ) {
    if (!isAdmin) {
      return { error: '无权限访问' };
    }

    await this.peerService.deletePeer(peerId, userId);
    return { message: '删除成功' };
  }
}
