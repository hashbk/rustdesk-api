import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { DeviceGroupService } from '../modules/device-group/device-group.service';
import { PeerService } from '../modules/device-group/peer.service';
import { UserService } from '../modules/user/user.service';
import { OidcService } from '../modules/oidc/oidc.service';
import { 
  CreateDeviceGroupDto, 
  UpdateDeviceGroupDto,
  AddDeviceGroupUserPermissionDto,
} from '../modules/device-group/dto/device-group.dto';
import { UpdatePeerDto, SetPeerDeviceGroupDto } from '../modules/device-group/dto/peer.dto';
import { AddUserUserPermissionDto, SetUserPermissionsDto } from '../modules/device-group/dto/user.dto';
import { AdminUpdateUserDto } from '../modules/user/dto/user.dto';
import { OidcProviderDto } from '../modules/oidc/dto/oidc.dto';
import { CurrentUser } from '../common/decorators';
import { AdminGuard } from '../common/guards';

/**
 * 管理员接口控制器
 * 统一管理所有需要管理员权限的接口
 * 使用 AdminGuard 进行权限验证
 */
@Controller('admin')
@UseGuards(AdminGuard)
export class AdminController {
  constructor(
    private readonly deviceGroupService: DeviceGroupService,
    private readonly peerService: PeerService,
    private readonly userService: UserService,
    private readonly oidcService: OidcService,
  ) {}

  // ============ 设备组管理 ============

  /**
   * 获取所有设备组
   * GET /api/admin/device-groups
   */
  @Get('device-groups')
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
   * GET /api/admin/device-groups/:guid
   */
  @Get('device-groups/:guid')
  async getDeviceGroup(@Param('guid') guid: string) {
    const group = await this.deviceGroupService.findByGuid(guid);
    if (!group) {
      return { error: '设备组不存在' };
    }

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
   * POST /api/admin/device-groups
   */
  @Post('device-groups')
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
   * PUT /api/admin/device-groups/:guid
   */
  @Put('device-groups/:guid')
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
   * DELETE /api/admin/device-groups/:guid
   */
  @Delete('device-groups/:guid')
  async deleteDeviceGroup(@Param('guid') guid: string) {
    await this.deviceGroupService.delete(guid);
    return { message: '删除成功' };
  }

  /**
   * 设置设备组的用户权限
   * POST /api/admin/device-groups/:guid/users
   */
  @Post('device-groups/:guid/users')
  async setDeviceGroupUsers(
    @Param('guid') guid: string,
    @Body() body: { userGuids: string[] },
  ) {
    await this.deviceGroupService.setDeviceGroupUsers({
      deviceGroupGuid: guid,
      userGuids: body.userGuids,
    });
    return { message: '设置成功' };
  }

  // ============ 设备管理 ============

  /**
   * 获取所有设备
   * GET /api/admin/peers
   */
  @Get('peers')
  async getAllPeers(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const pageNum = parseInt(page || '1', 10);
    const limitNum = parseInt(limit || '20', 10);

    const { peers, total } = await this.peerService.findAll(pageNum, limitNum);

    const oneMinuteAgo = new Date(Date.now() - 60 * 1000);

    return {
      peers: peers.map(p => ({
        id: p.id,
        uuid: p.uuid,
        user_guid: p.userGuid,
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
  @Put('peers/:uuid')
  async updatePeer(
    @Param('uuid') uuid: string,
    @Body() updateDto: UpdatePeerDto,
  ) {
    await this.peerService.updatePeerInfo(uuid, updateDto);
    return { message: '更新成功' };
  }

  /**
   * 删除设备（解除用户绑定）
   * DELETE /api/admin/peers/:uuid
   */
  @Delete('peers/:uuid')
  async deletePeer(@Param('uuid') uuid: string) {
    await this.peerService.deletePeer(uuid);
    return { message: '删除成功' };
  }

  /**
   * 批量设置设备的设备组
   * POST /api/admin/peers/device-group
   */
  @Post('peers/device-group')
  async setPeerDeviceGroup(@Body() dto: SetPeerDeviceGroupDto) {
    await this.peerService.setPeerDeviceGroup(dto);
    return { message: '设置成功' };
  }

  // ============ 用户权限管理 ============

  /**
   * 添加用户设备组权限
   * POST /api/admin/device-group-permissions
   */
  @Post('device-group-permissions')
  async addDeviceGroupUserPermission(@Body() dto: AddDeviceGroupUserPermissionDto) {
    await this.deviceGroupService.addUserPermission(dto);
    return { message: '添加成功' };
  }

  /**
   * 删除用户设备组权限
   * DELETE /api/admin/device-group-permissions/:deviceGroupGuid/:userGuid
   */
  @Delete('device-group-permissions/:deviceGroupGuid/:userGuid')
  async removeDeviceGroupUserPermission(
    @Param('deviceGroupGuid') deviceGroupGuid: string,
    @Param('userGuid') userGuid: string,
  ) {
    await this.deviceGroupService.removeUserPermission(deviceGroupGuid, userGuid);
    return { message: '删除成功' };
  }

  /**
   * 添加用户间权限
   * POST /api/admin/user-permissions
   */
  @Post('user-permissions')
  async addUserUserPermission(@Body() dto: AddUserUserPermissionDto) {
    await this.deviceGroupService.addUserUserPermission(dto);
    return { message: '添加成功' };
  }

  /**
   * 删除用户间权限
   * DELETE /api/admin/user-permissions/:userGuid/:targetUserGuid
   */
  @Delete('user-permissions/:userGuid/:targetUserGuid')
  async removeUserUserPermission(
    @Param('userGuid') userGuid: string,
    @Param('targetUserGuid') targetUserGuid: string,
  ) {
    await this.deviceGroupService.removeUserUserPermission(userGuid, targetUserGuid);
    return { message: '删除成功' };
  }

  /**
   * 批量设置用户权限
   * POST /api/admin/user-permissions/batch
   */
  @Post('user-permissions/batch')
  async setUserPermissions(@Body() dto: SetUserPermissionsDto) {
    await this.deviceGroupService.setUserPermissions(dto);
    return { message: '设置成功' };
  }

  // ============ 用户管理 ============

  /**
   * 获取所有用户
   * GET /api/admin/users
   */
  @Get('users')
  async getAllUsers(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const pageNum = parseInt(page || '1', 10);
    const limitNum = parseInt(limit || '20', 10);

    const { users, total } = await this.userService.findAll(pageNum, limitNum);

    return {
      users: users.map(u => ({
        guid: u.guid,
        name: u.username,
        email: u.email,
        note: u.note,
        status: u.status,
        is_admin: u.isAdmin,
        created_at: u.createdAt,
        updated_at: u.updatedAt,
      })),
      total,
      page: pageNum,
      limit: limitNum,
    };
  }

  /**
   * 更新用户信息（管理员）
   * PUT /api/admin/users/:guid
   */
  @Put('users/:guid')
  async updateUser(
    @Param('guid') guid: string,
    @Body() updateDto: AdminUpdateUserDto,
  ) {
    const user = await this.userService.adminUpdateUser(guid, updateDto);
    return {
      guid: user.guid,
      name: user.username,
      email: user.email,
      note: user.note,
      status: user.status,
      is_admin: user.isAdmin,
    };
  }

  /**
   * 删除用户
   * DELETE /api/admin/users/:guid
   */
  @Delete('users/:guid')
  async deleteUser(
    @Param('guid') guid: string,
    @CurrentUser('guid') currentUserGuid: string,
  ) {
    if (guid === currentUserGuid) {
      return { error: '不能删除自己' };
    }

    await this.userService.deleteUser(guid);
    return { message: '删除成功' };
  }

  // ============ OIDC 提供商管理 ============

  /**
   * 获取所有 OIDC 提供商
   * GET /api/admin/oidc/providers
   */
  @Get('oidc/providers')
  async getAllOidcProviders() {
    const providers = await this.oidcService.getAllProviders();
    return providers.map(p => ({
      guid: p.guid,
      name: p.name,
      issuer: p.issuer,
      client_id: p.clientId,
      scope: p.scope,
      enabled: p.enabled,
      priority: p.priority,
      created_at: p.createdAt,
      updated_at: p.updatedAt,
    }));
  }

  /**
   * 创建 OIDC 提供商
   * POST /api/admin/oidc/providers
   */
  @Post('oidc/providers')
  async createOidcProvider(@Body() providerData: OidcProviderDto) {
    const provider = await this.oidcService.upsertProvider(providerData);
    return {
      guid: provider.guid,
      name: provider.name,
      issuer: provider.issuer,
      enabled: provider.enabled,
    };
  }

  /**
   * 更新 OIDC 提供商
   * PUT /api/admin/oidc/providers/:name
   */
  @Put('oidc/providers/:name')
  async updateOidcProvider(
    @Param('name') name: string,
    @Body() providerData: OidcProviderDto,
  ) {
    const provider = await this.oidcService.upsertProvider({
      ...providerData,
      name,
    });

    return {
      guid: provider.guid,
      name: provider.name,
      issuer: provider.issuer,
      enabled: provider.enabled,
    };
  }

  /**
   * 删除 OIDC 提供商
   * DELETE /api/admin/oidc/providers/:name
   */
  @Delete('oidc/providers/:name')
  async deleteOidcProvider(@Param('name') name: string) {
    await this.oidcService.deleteProvider(name);
    return { message: '删除成功' };
  }
}
