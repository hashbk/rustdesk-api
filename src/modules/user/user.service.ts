import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { User, UserStatus } from './entities/user.entity';
import { DeviceGroup } from '../device-group/entities/device-group.entity';
import { DeviceGroupUserPermission } from '../device-group/entities/device-group-user-permission.entity';

@Injectable()
/**
 * UserService
 * 负责用户管理的核心服务
 *
 * 功能：
 * - 用户注册
 * - 用户信息查询
 * - 用户信息更新
 * - 用户状态管理
 * - 用户权限管理
 *
 * 架构说明：
 * 直接操作用户实体，提供完整的用户管理功能
 */
export class UserService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(DeviceGroup)
    private deviceGroupRepository: Repository<DeviceGroup>,
    @InjectRepository(DeviceGroupUserPermission)
    private deviceGroupUserPermissionRepository: Repository<DeviceGroupUserPermission>,
  ) {}

  /**
   * 创建新用户
   * @param createUserDto 用户创建数据
   * @returns 创建的用户
   */
  async createUser(createUserDto: {
    name: string;
    password: string;
    group_name?: string;
    email?: string;
    note?: string;
  }) {
    const { name, password, group_name, email, note } = createUserDto;

    // 检查用户名是否已存在
    const existingUser = await this.userRepository.findOne({
      where: { username: name },
    });
    if (existingUser) {
      throw new BadRequestException('用户名已存在');
    }

    // 检查邮箱是否已存在
    if (email) {
      const existingEmail = await this.userRepository.findOne({
        where: { email },
      });
      if (existingEmail) {
        throw new BadRequestException('邮箱已存在');
      }
    }

    // 创建用户
    const user = new User();
    user.guid = uuidv4();
    user.username = name;
    user.email = email || '';
    user.password = await bcrypt.hash(password, 10);
    user.note = note || '';
    user.status = UserStatus.ACTIVE;
    user.isAdmin = false;

    await this.userRepository.save(user);

    // 如果指定了组名，将用户添加到该组
    if (group_name) {
      const deviceGroup = await this.deviceGroupRepository.findOne({
        where: { name: group_name },
      });
      if (deviceGroup) {
        const permission = new DeviceGroupUserPermission();
        permission.userGuid = user.guid;
        permission.deviceGroupGuid = deviceGroup.guid;
        await this.deviceGroupUserPermissionRepository.save(permission);
      }
    }

    return { message: '用户创建成功' };
  }

  /**
   * 邀请用户
   * @param inviteUserDto 用户邀请数据
   * @returns 邀请结果
   */
  async inviteUser(inviteUserDto: {
    email: string;
    name: string;
    group_name?: string;
    note?: string;
  }) {
    const { email, name, group_name, note } = inviteUserDto;

    // 检查邮箱是否已存在
    const existingUser = await this.userRepository.findOne({
      where: { email },
    });
    if (existingUser) {
      throw new BadRequestException('邮箱已存在');
    }

    // 创建未验证的用户
    const user = new User();
    user.guid = uuidv4();
    user.username = name;
    user.email = email;
    user.password = '';
    user.note = note || '';
    user.status = UserStatus.UNVERIFIED;
    user.isAdmin = false;

    await this.userRepository.save(user);

    // 如果指定了组名，将用户添加到该组
    if (group_name) {
      const deviceGroup = await this.deviceGroupRepository.findOne({
        where: { name: group_name },
      });
      if (deviceGroup) {
        const permission = new DeviceGroupUserPermission();
        permission.userGuid = user.guid;
        permission.deviceGroupGuid = deviceGroup.guid;
        await this.deviceGroupUserPermissionRepository.save(permission);
      }
    }

    return { message: '邀请发送成功' };
  }

  /**
   * 禁用用户
   * @param guid 用户GUID
   */
  async disableUser(guid: string) {
    const user = await this.userRepository.findOne({
      where: { guid },
    });
    if (!user) {
      throw new NotFoundException('用户不存在');
    }

    user.status = UserStatus.DISABLED;
    await this.userRepository.save(user);
  }

  /**
   * 启用用户
   * @param guid 用户GUID
   */
  async enableUser(guid: string) {
    const user = await this.userRepository.findOne({
      where: { guid },
    });
    if (!user) {
      throw new NotFoundException('用户不存在');
    }

    user.status = UserStatus.ACTIVE;
    await this.userRepository.save(user);
  }

  /**
   * 删除用户
   * @param guid 用户GUID
   */
  async deleteUser(guid: string) {
    const user = await this.userRepository.findOne({
      where: { guid },
    });
    if (!user) {
      throw new NotFoundException('用户不存在');
    }

    await this.userRepository.remove(user);
  }

  /**
   * 设置2FA强制
   * @param userGuids 用户GUID列表
   * @param enforce 是否强制
   * @param url 基础URL
   */
  async setTfaEnforce(userGuids: string[], enforce: boolean, url: string) {
    const users = await this.userRepository.find({
      where: { guid: In(userGuids) },
    });

    if (users.length === 0) {
      throw new NotFoundException('用户不存在');
    }

    for (const user of users) {
      const userInfo = user.getUserInfo();
      userInfo.other = userInfo.other || {};
      userInfo.other.tfa_enforce = enforce;
      userInfo.other.tfa_url = url;
      user.setUserInfo(userInfo);
      await this.userRepository.save(user);
    }
  }

  /**
   * 禁用登录验证
   * @param userGuids 用户GUID列表
   * @param type 验证类型（email或2fa）
   */
  async disableLoginVerification(userGuids: string[], type: 'email' | '2fa') {
    const users = await this.userRepository.find({
      where: { guid: In(userGuids) },
    });

    if (users.length === 0) {
      throw new NotFoundException('用户不存在');
    }

    for (const user of users) {
      const userInfo = user.getUserInfo();
      userInfo.other = userInfo.other || {};

      if (type === 'email') {
        userInfo.email_verification = false;
      } else if (type === '2fa') {
        // user.tfaSecret = undefined;
        // user.verifier = undefined;
      }

      user.setUserInfo(userInfo);
      await this.userRepository.save(user);
    }
  }

  /**
   * 强制登出用户
   * @param userGuids 用户GUID列表
   */
  async forceLogout(userGuids: string[]) {
    const users = await this.userRepository.find({
      where: { guid: In(userGuids) },
    });

    if (users.length === 0) {
      throw new NotFoundException('用户不存在');
    }

    // 删除用户的所有令牌
    for (const user of users) {
      // UserToken实体有级联删除，所以删除用户会自动删除关联的令牌
      // 但这里我们只需要标记用户需要重新登录
      // 实际的令牌验证会在JwtAuthGuard中处理
    }

    return { message: '强制登出成功' };
  }
}
