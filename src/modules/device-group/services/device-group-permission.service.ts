import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DeviceGroup } from '../entities/device-group.entity';
import { DeviceGroupUserPermission } from '../entities/device-group-user-permission.entity';
import { UserUserPermission } from '../entities/user-user-permission.entity';
import { User, UserStatus } from '../../user/entities/user.entity';
import { AddDeviceGroupUserPermissionDto } from '../dto/device-group.dto';
import { AddUserUserPermissionDto, SetUserPermissionsDto } from '../dto/user.dto';

@Injectable()
export class DeviceGroupPermissionService {
  constructor(
    @InjectRepository(DeviceGroup)
    private deviceGroupRepository: Repository<DeviceGroup>,
    @InjectRepository(DeviceGroupUserPermission)
    private deviceGroupUserPermissionRepository: Repository<DeviceGroupUserPermission>,
    @InjectRepository(UserUserPermission)
    private userUserPermissionRepository: Repository<UserUserPermission>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  // ============ 设备组用户权限管理 ============

  /**
   * 添加用户设备组权限
   * 请求字段名 userId 映射到数据库字段 userGuid
   */
  async addDeviceGroupUserPermission(dto: AddDeviceGroupUserPermissionDto): Promise<void> {
    // 检查设备组是否存在
    const group = await this.deviceGroupRepository.findOne({ where: { guid: dto.deviceGroupGuid } });
    if (!group) {
      throw new NotFoundException('设备组不存在');
    }

    // 检查用户是否存在（dto.userId 实际是用户的 guid）
    const user = await this.userRepository.findOne({ where: { guid: dto.userId } });
    if (!user) {
      throw new NotFoundException('用户不存在');
    }

    // 检查权限是否已存在
    const existing = await this.deviceGroupUserPermissionRepository.findOne({
      where: { deviceGroupGuid: dto.deviceGroupGuid, userGuid: dto.userId },
    });
    if (existing) {
      return; // 权限已存在，无需重复添加
    }

    const permission = this.deviceGroupUserPermissionRepository.create({
      deviceGroupGuid: dto.deviceGroupGuid,
      userGuid: dto.userId,
    });
    await this.deviceGroupUserPermissionRepository.save(permission);
  }

  /**
   * 移除用户设备组权限
   */
  async removeDeviceGroupUserPermission(deviceGroupGuid: string, userId: string): Promise<void> {
    await this.deviceGroupUserPermissionRepository.delete({
      deviceGroupGuid,
      userGuid: userId,
    });
  }

  // ============ 用户间权限管理 ============

  /**
   * 获取用户有权访问的其他用户列表
   * 响应字段名保持 targetUserId
   */
  async getAccessibleTargetUsers(userGuid: string): Promise<string[]> {
    const permissions = await this.userUserPermissionRepository.find({
      where: { userGuid },
      select: ['targetUserGuid'],
    });
    return permissions.map(p => p.targetUserGuid);
  }

  /**
   * 添加用户间权限
   * 请求字段名 userId/targetUserId 映射到数据库字段 userGuid/targetUserGuid
   */
  async addUserUserPermission(dto: AddUserUserPermissionDto): Promise<void> {
    // 检查用户是否存在
    const [user, targetUser] = await Promise.all([
      this.userRepository.findOne({ where: { guid: dto.userId } }),
      this.userRepository.findOne({ where: { guid: dto.targetUserId } }),
    ]);
    if (!user || !targetUser) {
      throw new NotFoundException('用户不存在');
    }

    // 不能给自己授权
    if (dto.userId === dto.targetUserId) {
      throw new BadRequestException('不能给自己授权');
    }

    // 检查权限是否已存在
    const existing = await this.userUserPermissionRepository.findOne({
      where: { userGuid: dto.userId, targetUserGuid: dto.targetUserId },
    });
    if (existing) {
      return; // 权限已存在
    }

    const permission = this.userUserPermissionRepository.create({
      userGuid: dto.userId,
      targetUserGuid: dto.targetUserId,
    });
    await this.userUserPermissionRepository.save(permission);
  }

  /**
   * 移除用户间权限
   */
  async removeUserUserPermission(userId: string, targetUserId: string): Promise<void> {
    await this.userUserPermissionRepository.delete({
      userGuid: userId,
      targetUserGuid: targetUserId,
    });
  }

  /**
   * 批量设置用户权限
   * 请求字段名 targetUserId/userIds 映射到数据库字段 targetUserGuid/userGuids
   */
  async setUserPermissions(dto: SetUserPermissionsDto): Promise<void> {
    // 检查目标用户是否存在
    const targetUser = await this.userRepository.findOne({ where: { guid: dto.targetUserId } });
    if (!targetUser) {
      throw new NotFoundException('目标用户不存在');
    }

    // 删除现有关联
    await this.userUserPermissionRepository.delete({
      targetUserGuid: dto.targetUserId,
    });

    // 添加新关联
    if (dto.userIds.length > 0) {
      const permissions = dto.userIds
        .filter(userId => userId !== dto.targetUserId) // 排除自己
        .map(userId => ({
          userGuid: userId,
          targetUserGuid: dto.targetUserId,
        }));
      if (permissions.length > 0) {
        await this.userUserPermissionRepository.insert(permissions);
      }
    }
  }

  /**
   * 获取可访问的用户列表
   * 包括：自己 + 被授权访问的用户 + 通过设备组授权间接可访问的用户
   * 管理员可以看到所有用户
   */
  async getAccessibleUsers(
    userGuid: string,
    query: { current: number; pageSize: number; status: string },
    isAdmin: boolean = false,
  ): Promise<{ data: any[]; total: number }> {
    const { current, pageSize, status } = query;
    const skip = (current - 1) * pageSize;

    // 管理员可以看到所有用户
    if (isAdmin) {
      const [users, total] = await this.userRepository.findAndCount({
        where: { status: parseInt(status) || UserStatus.ACTIVE },
        order: { username: 'ASC' },
        skip,
        take: pageSize,
      });

      return {
        data: users.map(u => ({
          name: u.username,
          email: u.email || '',
          note: u.note || '',
          status: u.status,
          is_admin: u.isAdmin,
        })),
        total,
      };
    }

    // 普通用户只能看到有权限访问的用户
    const queryBuilder = this.userRepository
      .createQueryBuilder('user')
      .where('user.status = :status', { status: parseInt(status) || UserStatus.ACTIVE })
      .andWhere(
        `(user.guid = :userGuid 
          OR EXISTS (
            SELECT 1 FROM user_user_permissions uup 
            WHERE uup.userGuid = :userGuid AND uup.targetUserGuid = user.guid
          )
          OR EXISTS (
            SELECT 1 FROM peers p 
            INNER JOIN device_group_user_permissions udgp ON p.deviceGroupGuid = udgp.deviceGroupGuid
            WHERE udgp.userGuid = :userGuid AND p.userGuid = user.guid
          )
        )`,
        { userGuid },
      )
      .orderBy('user.username', 'ASC')
      .skip(skip)
      .take(pageSize);

    const [users, total] = await queryBuilder.getManyAndCount();

    return {
      data: users.map(u => ({
        name: u.username,
        email: u.email || '',
        note: u.note || '',
        status: u.status,
        is_admin: u.isAdmin,
      })),
      total,
    };
  }
}
