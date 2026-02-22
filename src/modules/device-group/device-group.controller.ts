import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { DeviceGroupService } from './device-group.service';
import { PeerService } from './peer.service';
import { 
  DeviceGroupQueryDto, 
  CreateDeviceGroupDto, 
  UpdateDeviceGroupDto,
} from './dto/device-group.dto';
import { PeerQueryDto } from './dto/peer.dto';
import { UserQueryDto } from './dto/user.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AdminGuard } from '../../common/guards';

/**
 * 设备组控制器
 * 管理设备组相关的客户端接口
 * 
 * 注意：管理员接口已移至 admin 模块统一管理
 * 这里保留的 /api/device-groups 接口是为了向后兼容
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
    @CurrentUser('id') userId: number,
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
    @CurrentUser('id') userId: number,
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
    @CurrentUser('id') userId: number,
    @CurrentUser('isAdmin') isAdmin: boolean,
    @Query() query: UserQueryDto,
  ) {
    return this.deviceGroupService.getAccessibleUsers(userId, query, isAdmin);
  }

  // ============ 设备组管理接口（需要管理员权限）============
  // 注意：这些接口保留是为了向后兼容，新代码应使用 /api/admin/device-groups

  /**
   * 获取所有设备组
   * GET /api/device-groups
   */
  @Get('device-groups')
  @UseGuards(AdminGuard)
  async getAllDeviceGroups(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
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
  @UseGuards(AdminGuard)
  async getDeviceGroup(@Param('guid') guid: string) {
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
  @UseGuards(AdminGuard)
  async createDeviceGroup(@Body() createDto: CreateDeviceGroupDto) {
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
  @UseGuards(AdminGuard)
  async updateDeviceGroup(
    @Param('guid') guid: string,
    @Body() updateDto: UpdateDeviceGroupDto,
  ) {
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
  @UseGuards(AdminGuard)
  async deleteDeviceGroup(@Param('guid') guid: string) {
    await this.deviceGroupService.delete(guid);
    return { message: '删除成功' };
  }

  /**
   * 设置设备组的用户权限
   * POST /api/device-groups/:guid/users
   */
  @Post('device-groups/:guid/users')
  @UseGuards(AdminGuard)
  async setDeviceGroupUsers(
    @Param('guid') guid: string,
    @Body() body: { userIds: number[] },
  ) {
    await this.deviceGroupService.setDeviceGroupUsers({
      deviceGroupGuid: guid,
      userIds: body.userIds,
    });
    return { message: '设置成功' };
  }
}
