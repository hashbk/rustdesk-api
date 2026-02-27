import { Injectable } from '@nestjs/common';
import { DeviceGroupCoreService } from './device-group-core.service';
import { DeviceGroupPermissionService } from './device-group-permission.service';
import {
  DeviceGroupQueryDto,
  CreateDeviceGroupDto,
  UpdateDeviceGroupDto,
  AddDeviceGroupUserPermissionDto,
  SetDeviceGroupUsersDto,
} from '../dto/device-group.dto';
import { AddUserUserPermissionDto, SetUserPermissionsDto } from '../dto/user.dto';
import { DeviceGroup } from '../entities/device-group.entity';

@Injectable()
export class DeviceGroupService {
  constructor(
    private readonly coreService: DeviceGroupCoreService,
    private readonly permissionService: DeviceGroupPermissionService,
  ) {}

  // ============ 设备组核心管理（委托给 CoreService） ============

  async getAccessibleDeviceGroups(
    userGuid: string,
    query: DeviceGroupQueryDto,
    isAdmin: boolean = false,
  ) {
    return this.coreService.getAccessibleDeviceGroups(userGuid, query, isAdmin);
  }

  async findAll(page: number = 1, limit: number = 20): Promise<{ groups: DeviceGroup[]; total: number }> {
    return this.coreService.findAll(page, limit);
  }

  async findByGuid(guid: string): Promise<DeviceGroup | null> {
    return this.coreService.findByGuid(guid);
  }

  async findByName(name: string): Promise<DeviceGroup | null> {
    return this.coreService.findByName(name);
  }

  async create(createDto: CreateDeviceGroupDto): Promise<DeviceGroup> {
    return this.coreService.create(createDto);
  }

  async update(guid: string, updateDto: UpdateDeviceGroupDto): Promise<DeviceGroup> {
    return this.coreService.update(guid, updateDto);
  }

  async delete(guid: string): Promise<void> {
    return this.coreService.delete(guid);
  }

  async getDeviceGroupUsers(guid: string): Promise<{ userId: string; username: string }[]> {
    return this.coreService.getDeviceGroupUsers(guid);
  }

  async setDeviceGroupUsers(dto: SetDeviceGroupUsersDto): Promise<void> {
    return this.coreService.setDeviceGroupUsers(dto);
  }

  // ============ 设备组用户权限管理（委托给 PermissionService） ============

  async addUserPermission(dto: AddDeviceGroupUserPermissionDto): Promise<void> {
    return this.permissionService.addDeviceGroupUserPermission(dto);
  }

  async removeUserPermission(deviceGroupGuid: string, userId: string): Promise<void> {
    return this.permissionService.removeDeviceGroupUserPermission(deviceGroupGuid, userId);
  }

  // ============ 用户间权限管理（委托给 PermissionService） ============

  async getAccessibleTargetUsers(userGuid: string): Promise<string[]> {
    return this.permissionService.getAccessibleTargetUsers(userGuid);
  }

  async addUserUserPermission(dto: AddUserUserPermissionDto): Promise<void> {
    return this.permissionService.addUserUserPermission(dto);
  }

  async removeUserUserPermission(userId: string, targetUserId: string): Promise<void> {
    return this.permissionService.removeUserUserPermission(userId, targetUserId);
  }

  async setUserPermissions(dto: SetUserPermissionsDto): Promise<void> {
    return this.permissionService.setUserPermissions(dto);
  }

  async getAccessibleUsers(
    userGuid: string,
    query: { current: number; pageSize: number; status: string },
    isAdmin: boolean = false,
  ) {
    return this.permissionService.getAccessibleUsers(userGuid, query, isAdmin);
  }
}
