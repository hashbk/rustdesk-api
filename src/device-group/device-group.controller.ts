import { Controller, Get, Post, Put, Delete, Body, Param, Query, ParseIntPipe } from '@nestjs/common';
import { DeviceGroupService } from './device-group.service';
import { PeerService } from './peer.service';
import { 
  DeviceGroupQueryDto, 
  CreateDeviceGroupDto, 
  UpdateDeviceGroupDto,
  AddDeviceGroupUserPermissionDto,
  SetDeviceGroupUsersDto,
} from './dto/device-group.dto';
import { PeerQueryDto, UpdatePeerDto, SetPeerDeviceGroupDto } from './dto/peer.dto';
import { UserQueryDto, AddUserUserPermissionDto, SetUserPermissionsDto } from './dto/user.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

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
   */
  @Get('device-group/accessible')
  async getAccessibleDeviceGroups(
    @CurrentUser('id') userId: number,
    @Query() query: DeviceGroupQueryDto,
  ) {
    return this.deviceGroupService.getAccessibleDeviceGroups(userId, query);
  }

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

  /**
   * 获取当前用户可访问的用户列表
   * GET /api/users?current=1&pageSize=100&accessible=&status=1
   */
  @Get('users')
  async getAccessibleUsers(
    @CurrentUser('id') userId: number,
    @Query() query: UserQueryDto,
  ) {
    return this.deviceGroupService.getAccessibleUsers(userId, query);
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
        guid: g.guid,
        name: g.name,
        note: g.note,
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
   * GET /api/device-groups/:guid
   */
  @Get('device-groups/:guid')
  async getDeviceGroup(
    @Param('guid') guid: string,
    @CurrentUser('isAdmin') isAdmin: boolean,
  ) {
    if (!isAdmin) {
      return { error: '无权限访问' };
    }

    const group = await this.deviceGroupService.findByGuid(guid);
    if (!group) {
      return { error: '设备组不存在' };
    }

    // 获取设备组的用户列表
    const users = await this.deviceGroupService.getDeviceGroupUsers(guid);

    return {
      guid: group.guid,
      name: group.name,
      note: group.note,
      users,
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
  ) {
    if (!isAdmin) {
      return { error: '无权限访问' };
    }

    const group = await this.deviceGroupService.create(createDto);
    return {
      guid: group.guid,
      name: group.name,
      note: group.note,
    };
  }

  /**
   * 更新设备组
   * PUT /api/device-groups/:guid
   */
  @Put('device-groups/:guid')
  async updateDeviceGroup(
    @Param('guid') guid: string,
    @Body() updateDto: UpdateDeviceGroupDto,
    @CurrentUser('isAdmin') isAdmin: boolean,
  ) {
    if (!isAdmin) {
      return { error: '无权限访问' };
    }

    const group = await this.deviceGroupService.update(guid, updateDto);
    return {
      guid: group.guid,
      name: group.name,
      note: group.note,
    };
  }

  /**
   * 删除设备组
   * DELETE /api/device-groups/:guid
   */
  @Delete('device-groups/:guid')
  async deleteDeviceGroup(
    @Param('guid') guid: string,
    @CurrentUser('isAdmin') isAdmin: boolean,
  ) {
    if (!isAdmin) {
      return { error: '无权限访问' };
    }

    await this.deviceGroupService.delete(guid);
    return { message: '删除成功' };
  }

  /**
   * 设置设备组的用户权限
   * POST /api/device-groups/:guid/users
   */
  @Post('device-groups/:guid/users')
  async setDeviceGroupUsers(
    @Param('guid') guid: string,
    @Body() body: { userIds: number[] },
    @CurrentUser('isAdmin') isAdmin: boolean,
  ) {
    if (!isAdmin) {
      return { error: '无权限访问' };
    }

    await this.deviceGroupService.setDeviceGroupUsers({
      deviceGroupGuid: guid,
      userIds: body.userIds,
    });
    return { message: '设置成功' };
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

    // 计算一分钟前的时间
    const oneMinuteAgo = new Date(Date.now() - 60 * 1000);

    return {
      peers: peers.map(p => ({
        id: p.id,
        uuid: p.uuid,
        user_id: p.userId,
        device_group_guid: p.deviceGroupGuid,
        device_group_name: p.deviceGroup?.name || '',
        ver: p.ver,
        modified_at: p.modifiedAt,
        status: p.updatedAt > oneMinuteAgo ? 1 : 0,
        created_at: p.createdAt,
        updated_at: p.updatedAt,
      })),
      total,
      page: pageNum,
      limit: limitNum,
    };
  }

  /**
   * 更新设备信息
   * PUT /api/admin/peers/:uuid
   */
  @Put('admin/peers/:uuid')
  async updatePeer(
    @Param('uuid') uuid: string,
    @Body() updateDto: UpdatePeerDto,
    @CurrentUser('isAdmin') isAdmin: boolean,
  ) {
    if (!isAdmin) {
      return { error: '无权限访问' };
    }

    await this.peerService.updatePeerInfo(uuid, updateDto);
    return { message: '更新成功' };
  }

  /**
   * 删除设备（解除用户绑定）
   * DELETE /api/admin/peers/:uuid
   */
  @Delete('admin/peers/:uuid')
  async deletePeer(
    @Param('uuid') uuid: string,
    @CurrentUser('isAdmin') isAdmin: boolean,
  ) {
    if (!isAdmin) {
      return { error: '无权限访问' };
    }

    await this.peerService.deletePeer(uuid);
    return { message: '删除成功' };
  }

  /**
   * 批量设置设备的设备组
   * POST /api/admin/peers/device-group
   */
  @Post('admin/peers/device-group')
  async setPeerDeviceGroup(
    @Body() dto: SetPeerDeviceGroupDto,
    @CurrentUser('isAdmin') isAdmin: boolean,
  ) {
    if (!isAdmin) {
      return { error: '无权限访问' };
    }

    await this.peerService.setPeerDeviceGroup(dto);
    return { message: '设置成功' };
  }

  // ============ 管理员接口 - 用户权限 ============

  /**
   * 添加用户设备组权限
   * POST /api/admin/device-group-permissions
   */
  @Post('admin/device-group-permissions')
  async addDeviceGroupUserPermission(
    @Body() dto: AddDeviceGroupUserPermissionDto,
    @CurrentUser('isAdmin') isAdmin: boolean,
  ) {
    if (!isAdmin) {
      return { error: '无权限访问' };
    }

    await this.deviceGroupService.addUserPermission(dto);
    return { message: '添加成功' };
  }

  /**
   * 删除用户设备组权限
   * DELETE /api/admin/device-group-permissions/:deviceGroupGuid/:userId
   */
  @Delete('admin/device-group-permissions/:deviceGroupGuid/:userId')
  async removeDeviceGroupUserPermission(
    @Param('deviceGroupGuid') deviceGroupGuid: string,
    @Param('userId', ParseIntPipe) userId: number,
    @CurrentUser('isAdmin') isAdmin: boolean,
  ) {
    if (!isAdmin) {
      return { error: '无权限访问' };
    }

    await this.deviceGroupService.removeUserPermission(deviceGroupGuid, userId);
    return { message: '删除成功' };
  }

  /**
   * 添加用户间权限
   * POST /api/admin/user-permissions
   */
  @Post('admin/user-permissions')
  async addUserUserPermission(
    @Body() dto: AddUserUserPermissionDto,
    @CurrentUser('isAdmin') isAdmin: boolean,
  ) {
    if (!isAdmin) {
      return { error: '无权限访问' };
    }

    await this.deviceGroupService.addUserUserPermission(dto);
    return { message: '添加成功' };
  }

  /**
   * 删除用户间权限
   * DELETE /api/admin/user-permissions/:userId/:targetUserId
   */
  @Delete('admin/user-permissions/:userId/:targetUserId')
  async removeUserUserPermission(
    @Param('userId', ParseIntPipe) userId: number,
    @Param('targetUserId', ParseIntPipe) targetUserId: number,
    @CurrentUser('isAdmin') isAdmin: boolean,
  ) {
    if (!isAdmin) {
      return { error: '无权限访问' };
    }

    await this.deviceGroupService.removeUserUserPermission(userId, targetUserId);
    return { message: '删除成功' };
  }

  /**
   * 批量设置用户权限
   * POST /api/admin/user-permissions/batch
   */
  @Post('admin/user-permissions/batch')
  async setUserPermissions(
    @Body() dto: SetUserPermissionsDto,
    @CurrentUser('isAdmin') isAdmin: boolean,
  ) {
    if (!isAdmin) {
      return { error: '无权限访问' };
    }

    await this.deviceGroupService.setUserPermissions(dto);
    return { message: '设置成功' };
  }
}
