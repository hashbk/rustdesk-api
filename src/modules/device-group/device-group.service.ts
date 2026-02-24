import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { DeviceGroup } from './entities/device-group.entity';
import { DeviceGroupUserPermission } from './entities/device-group-user-permission.entity';
import { UserUserPermission } from './entities/user-user-permission.entity';
import { User, UserStatus } from '../user/entities/user.entity';
import { 
  DeviceGroupQueryDto, 
  CreateDeviceGroupDto, 
  UpdateDeviceGroupDto,
  AddDeviceGroupUserPermissionDto,
  SetDeviceGroupUsersDto,
} from './dto/device-group.dto';
import { AddUserUserPermissionDto, SetUserPermissionsDto } from './dto/user.dto';

@Injectable()
export class DeviceGroupService {
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

  /**
   * 获取用户可访问的设备组列表（分页）
   * GET /api/device-group/accessible
   * 管理员可以看到所有设备组
   */
  async getAccessibleDeviceGroups(
    userGuid: string,
    query: DeviceGroupQueryDto,
    isAdmin: boolean = false,
  ): Promise<{ data: { name: string }[]; total: number }> {
    const { current, pageSize } = query;
    const skip = (current - 1) * pageSize;

    // 管理员可以看到所有设备组
    if (isAdmin) {
      const [groups, total] = await this.deviceGroupRepository.findAndCount({
        select: ['guid', 'name'],
        order: { name: 'ASC' },
        skip,
        take: pageSize,
      });

      return {
        data: groups.map(g => ({ name: g.name })),
        total,
      };
    }

    // 普通用户只能看到有权限的设备组
    const queryBuilder = this.deviceGroupRepository
      .createQueryBuilder('dg')
      .innerJoin('device_group_user_permissions', 'udgp', 'udgp.deviceGroupGuid = dg.guid')
      .where('udgp.userGuid = :userGuid', { userGuid })
      .select(['dg.guid', 'dg.name'])
      .orderBy('dg.name', 'ASC')
      .skip(skip)
      .take(pageSize);

    const [groups, total] = await queryBuilder.getManyAndCount();

    return {
      data: groups.map(g => ({ name: g.name })),
      total,
    };
  }

  /**
   * 获取所有设备组（管理员）
   */
  async findAll(page: number = 1, limit: number = 20): Promise<{ groups: DeviceGroup[]; total: number }> {
    const [groups, total] = await this.deviceGroupRepository.findAndCount({
      order: { name: 'ASC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { groups, total };
  }

  /**
   * 根据 GUID 获取设备组
   */
  async findByGuid(guid: string): Promise<DeviceGroup | null> {
    return this.deviceGroupRepository.findOne({ where: { guid } });
  }

  /**
   * 根据名称获取设备组
   */
  async findByName(name: string): Promise<DeviceGroup | null> {
    return this.deviceGroupRepository.findOne({ where: { name } });
  }

  /**
   * 创建设备组
   */
  async create(createDto: CreateDeviceGroupDto): Promise<DeviceGroup> {
    // 检查名称是否已存在
    const existing = await this.findByName(createDto.name);
    if (existing) {
      throw new BadRequestException('设备组名称已存在');
    }

    const group = this.deviceGroupRepository.create({
      guid: uuidv4(),
      ...createDto,
    });

    return this.deviceGroupRepository.save(group);
  }

  /**
   * 更新设备组
   */
  async update(guid: string, updateDto: UpdateDeviceGroupDto): Promise<DeviceGroup> {
    const group = await this.findByGuid(guid);
    if (!group) {
      throw new NotFoundException('设备组不存在');
    }

    // 如果要修改名称，检查是否已存在
    if (updateDto.name && updateDto.name !== group.name) {
      const existing = await this.findByName(updateDto.name);
      if (existing) {
        throw new BadRequestException('设备组名称已存在');
      }
    }

    Object.assign(group, updateDto);
    return this.deviceGroupRepository.save(group);
  }

  /**
   * 删除设备组
   */
  async delete(guid: string): Promise<void> {
    const group = await this.findByGuid(guid);
    if (!group) {
      throw new NotFoundException('设备组不存在');
    }

    await this.deviceGroupRepository.remove(group);
  }

  // ============ 设备组用户权限管理 ============

  /**
   * 获取设备组的用户列表
   */
  async getDeviceGroupUsers(guid: string): Promise<{ userGuid: string; username: string }[]> {
    const permissions = await this.deviceGroupUserPermissionRepository.find({
      where: { deviceGroupGuid: guid },
      relations: ['user'],
    });

    return permissions.map(p => ({
      userGuid: p.userGuid,
      username: p.user?.username || '',
    }));
  }

  /**
   * 添加用户设备组权限
   */
  async addUserPermission(dto: AddDeviceGroupUserPermissionDto): Promise<void> {
    // 检查设备组是否存在
    const group = await this.findByGuid(dto.deviceGroupGuid);
    if (!group) {
      throw new NotFoundException('设备组不存在');
    }

    // 检查用户是否存在
    const user = await this.userRepository.findOne({ where: { guid: dto.userGuid } });
    if (!user) {
      throw new NotFoundException('用户不存在');
    }

    // 检查权限是否已存在
    const existing = await this.deviceGroupUserPermissionRepository.findOne({
      where: { deviceGroupGuid: dto.deviceGroupGuid, userGuid: dto.userGuid },
    });
    if (existing) {
      return; // 权限已存在，无需重复添加
    }

    const permission = this.deviceGroupUserPermissionRepository.create(dto);
    await this.deviceGroupUserPermissionRepository.save(permission);
  }

  /**
   * 移除用户设备组权限
   */
  async removeUserPermission(deviceGroupGuid: string, userGuid: string): Promise<void> {
    await this.deviceGroupUserPermissionRepository.delete({
      deviceGroupGuid,
      userGuid,
    });
  }

  /**
   * 批量设置设备组的用户权限
   */
  async setDeviceGroupUsers(dto: SetDeviceGroupUsersDto): Promise<void> {
    // 检查设备组是否存在
    const group = await this.findByGuid(dto.deviceGroupGuid);
    if (!group) {
      throw new NotFoundException('设备组不存在');
    }

    // 删除现有关联
    await this.deviceGroupUserPermissionRepository.delete({
      deviceGroupGuid: dto.deviceGroupGuid,
    });

    // 添加新关联
    if (dto.userGuids.length > 0) {
      const permissions = dto.userGuids.map(userGuid => ({
        deviceGroupGuid: dto.deviceGroupGuid,
        userGuid,
      }));
      await this.deviceGroupUserPermissionRepository.insert(permissions);
    }
  }

  // ============ 用户间权限管理 ============

  /**
   * 获取用户有权访问的其他用户列表
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
   */
  async addUserUserPermission(dto: AddUserUserPermissionDto): Promise<void> {
    // 检查用户是否存在
    const [user, targetUser] = await Promise.all([
      this.userRepository.findOne({ where: { guid: dto.userGuid } }),
      this.userRepository.findOne({ where: { guid: dto.targetUserGuid } }),
    ]);
    if (!user || !targetUser) {
      throw new NotFoundException('用户不存在');
    }

    // 不能给自己授权
    if (dto.userGuid === dto.targetUserGuid) {
      throw new BadRequestException('不能给自己授权');
    }

    // 检查权限是否已存在
    const existing = await this.userUserPermissionRepository.findOne({
      where: { userGuid: dto.userGuid, targetUserGuid: dto.targetUserGuid },
    });
    if (existing) {
      return; // 权限已存在
    }

    const permission = this.userUserPermissionRepository.create(dto);
    await this.userUserPermissionRepository.save(permission);
  }

  /**
   * 移除用户间权限
   */
  async removeUserUserPermission(userGuid: string, targetUserGuid: string): Promise<void> {
    await this.userUserPermissionRepository.delete({
      userGuid,
      targetUserGuid,
    });
  }

  /**
   * 批量设置用户权限
   */
  async setUserPermissions(dto: SetUserPermissionsDto): Promise<void> {
    // 检查目标用户是否存在
    const targetUser = await this.userRepository.findOne({ where: { guid: dto.targetUserGuid } });
    if (!targetUser) {
      throw new NotFoundException('目标用户不存在');
    }

    // 删除现有关联
    await this.userUserPermissionRepository.delete({
      targetUserGuid: dto.targetUserGuid,
    });

    // 添加新关联
    if (dto.userGuids.length > 0) {
      const permissions = dto.userGuids
        .filter(userGuid => userGuid !== dto.targetUserGuid) // 排除自己
        .map(userGuid => ({
          userGuid,
          targetUserGuid: dto.targetUserGuid,
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
