import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { DeviceGroupService } from './device-group.service';
import { PeerService } from './peer.service';
import { DeviceGroupQueryDto } from './dto/device-group.dto';
import { PeerQueryDto } from './dto/peer.dto';
import { UserQueryDto } from './dto/user.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

/**
 * 设备组控制器
 * 管理设备组相关的客户端接口，提供可访问资源的查询功能
 *
 * 端点数量：3个
 * - GET /api/device-group/accessible - 获取可访问的设备组列表
 * - GET /api/peers - 获取可访问的设备列表
 * - GET /api/users - 获取可访问的用户列表
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
   * 根据用户权限获取可访问的设备组列表，管理员可以看到所有设备组
   *
   * 功能说明：
   * - 普通用户只能看到自己有权限访问的设备组
   * - 管理员可以看到所有设备组
   * - 支持分页查询
   * - 支持按名称搜索
   *
   * @param userId 当前用户ID（从JWT令牌中提取）
   * @param isAdmin 是否为管理员（从JWT令牌中提取）
   * @param query 查询参数（分页、搜索等）
   * @returns 可访问的设备组列表（分页）
   */
  @Get('device-group/accessible')
  async getAccessibleDeviceGroups(
    @CurrentUser('id') userId: string,
    @CurrentUser('isAdmin') isAdmin: boolean,
    @Query() query: DeviceGroupQueryDto,
  ) {
    return this.deviceGroupService.getAccessibleDeviceGroups(userId, query, isAdmin);
  }

  /**
   * 获取当前用户可访问的设备列表
   * 根据用户权限获取可访问的设备列表，管理员可以看到所有设备
   *
   * 功能说明：
   * - 普通用户只能看到自己有权限访问的设备
   * - 管理员可以看到所有设备
   * - 支持分页查询
   * - 支持按名称搜索
   * - 支持按状态过滤
   *
   * @param userId 当前用户ID（从JWT令牌中提取）
   * @param isAdmin 是否为管理员（从JWT令牌中提取）
   * @param query 查询参数（分页、搜索、状态等）
   * @returns 可访问的设备列表（分页）
   */
  @Get('peers')
  async getAccessiblePeers(
    @CurrentUser('id') userId: string,
    @CurrentUser('isAdmin') isAdmin: boolean,
    @Query() query: PeerQueryDto,
  ) {
    return this.peerService.getAccessiblePeers(userId, query, isAdmin);
  }

  /**
   * 获取当前用户可访问的用户列表
   * 根据用户权限获取可访问的用户列表，管理员可以看到所有用户
   *
   * 功能说明：
   * - 普通用户只能看到自己有权限访问的用户
   * - 管理员可以看到所有用户
   * - 支持分页查询
   * - 支持按名称搜索
   * - 支持按状态过滤
   *
   * @param userId 当前用户ID（从JWT令牌中提取）
   * @param isAdmin 是否为管理员（从JWT令牌中提取）
   * @param query 查询参数（分页、搜索、状态等）
   * @returns 可访问的用户列表（分页）
   */
  @Get('users')
  async getAccessibleUsers(
    @CurrentUser('id') userId: string,
    @CurrentUser('isAdmin') isAdmin: boolean,
    @Query() query: UserQueryDto,
  ) {
    return this.deviceGroupService.getAccessibleUsers(userId, query, isAdmin);
  }
}
