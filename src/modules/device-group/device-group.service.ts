import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { DeviceGroup } from './entities/device-group.entity';
import { User, UserStatus } from '../user/entities/user.entity';

@Injectable()
/**
 * DeviceGroupService
 * 负责设备组管理和权限控制的核心服务
 *
 * 功能：
 * - 设备组创建和管理
 * - 设备组权限管理
 * - 用户权限管理
 * - 可访问资源查询
 *
 * 架构说明：
 * 管理设备组和用户之间的权限关系
 */
export class DeviceGroupService {
  constructor(
    @InjectRepository(DeviceGroup)
    private deviceGroupRepository: Repository<DeviceGroup>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  /**
   * 获取用户可访问的设备组列表（分页）
   * 管理员可以看到所有设备组，普通用户只能看到有权限的设备组
   * 
   * @param userGuid 用户GUID
   * @param query 查询参数，包含分页信息
   * @param isAdmin 是否为管理员
   * @returns 设备组列表和总数
   */
  async getAccessibleDeviceGroups(
    userGuid: string,
    query: { current: number; pageSize: number },
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
   * 获取可访问的用户列表
   * 包括：自己 + 被授权访问的用户 + 通过设备组授权间接可访问的用户
   * 管理员可以看到所有用户
   * 
   * @param userGuid 用户GUID
   * @param query 查询参数，包含分页和状态过滤
   * @param isAdmin 是否为管理员
   * @returns 用户列表和总数
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
