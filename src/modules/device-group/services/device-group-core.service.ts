import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { DeviceGroup } from '../entities/device-group.entity';
import { DeviceGroupUserPermission } from '../entities/device-group-user-permission.entity';
import { User, UserStatus } from '../../user/entities/user.entity';
import {
  DeviceGroupQueryDto,
  CreateDeviceGroupDto,
  UpdateDeviceGroupDto,
  SetDeviceGroupUsersDto,
} from '../dto/device-group.dto';

@Injectable()
export class DeviceGroupCoreService {
  constructor(
    @InjectRepository(DeviceGroup)
    private deviceGroupRepository: Repository<DeviceGroup>,
    @InjectRepository(DeviceGroupUserPermission)
    private deviceGroupUserPermissionRepository: Repository<DeviceGroupUserPermission>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  /**
   * 获取用户可访问的设备组列表（分页）
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

  /**
   * 获取设备组的用户列表
   * 响应字段名保持 userId
   */
  async getDeviceGroupUsers(guid: string): Promise<{ userId: string; username: string }[]> {
    const permissions = await this.deviceGroupUserPermissionRepository.find({
      where: { deviceGroupGuid: guid },
      relations: ['user'],
    });

    return permissions.map(p => ({
      userId: p.userGuid,
      username: p.user?.username || '',
    }));
  }

  /**
   * 批量设置设备组的用户权限
   * 请求字段名 userIds 映射到数据库字段 userGuids
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
    if (dto.userIds.length > 0) {
      const permissions = dto.userIds.map(userId => ({
        deviceGroupGuid: dto.deviceGroupGuid,
        userGuid: userId,
      }));
      await this.deviceGroupUserPermissionRepository.insert(permissions);
    }
  }
}
