import { Injectable, NotFoundException, BadRequestException, ForbiddenException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { User, UserStatus } from './entities/user.entity';
import { Peer, Sysinfo } from '../../common/entities';
import { UpdateUserDto, AdminUpdateUserDto } from './dto/user.dto';

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Peer)
    private peerRepository: Repository<Peer>,
    @InjectRepository(Sysinfo)
    private sysinfoRepository: Repository<Sysinfo>,
  ) {}

  /**
   * 根据 ID 获取用户
   */
  async findById(id: number): Promise<User | null> {
    return this.userRepository.findOne({ where: { id } });
  }

  /**
   * 根据用户名获取用户
   */
  async findByUsername(username: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { username } });
  }

  /**
   * 根据邮箱获取用户
   */
  async findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { email } });
  }

  /**
   * 获取所有用户（管理员）
   */
  async findAll(page: number = 1, limit: number = 20): Promise<{ users: User[]; total: number }> {
    const [users, total] = await this.userRepository.findAndCount({
      select: ['id', 'username', 'email', 'note', 'status', 'isAdmin', 'createdAt', 'updatedAt'],
      order: { id: 'ASC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { users, total };
  }

  /**
   * 更新用户信息
   */
  async updateUser(userId: number, updateDto: UpdateUserDto): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      select: ['id', 'username', 'email', 'password', 'note', 'status', 'isAdmin'],
    });

    if (!user) {
      throw new NotFoundException('用户不存在');
    }

    // 如果要修改密码，需要验证旧密码
    if (updateDto.password) {
      if (!updateDto.oldPassword) {
        throw new BadRequestException('请提供旧密码');
      }

      const isPasswordValid = await bcrypt.compare(updateDto.oldPassword, user.password);
      if (!isPasswordValid) {
        throw new ForbiddenException('旧密码错误');
      }

      user.password = await bcrypt.hash(updateDto.password, 10);
    }

    // 更新其他字段
    if (updateDto.username && updateDto.username !== user.username) {
      const existingUser = await this.findByUsername(updateDto.username);
      if (existingUser) {
        throw new BadRequestException('用户名已存在');
      }
      user.username = updateDto.username;
    }

    if (updateDto.email && updateDto.email !== user.email) {
      const existingUser = await this.findByEmail(updateDto.email);
      if (existingUser) {
        throw new BadRequestException('邮箱已被使用');
      }
      user.email = updateDto.email;
    }

    if (updateDto.note !== undefined) {
      user.note = updateDto.note;
    }

    return this.userRepository.save(user);
  }

  /**
   * 管理员更新用户信息
   */
  async adminUpdateUser(userId: number, updateDto: AdminUpdateUserDto): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('用户不存在');
    }

    // 更新字段
    if (updateDto.username && updateDto.username !== user.username) {
      const existingUser = await this.findByUsername(updateDto.username);
      if (existingUser) {
        throw new BadRequestException('用户名已存在');
      }
      user.username = updateDto.username;
    }

    if (updateDto.email && updateDto.email !== user.email) {
      const existingUser = await this.findByEmail(updateDto.email);
      if (existingUser) {
        throw new BadRequestException('邮箱已被使用');
      }
      user.email = updateDto.email;
    }

    if (updateDto.note !== undefined) {
      user.note = updateDto.note;
    }

    if (updateDto.status !== undefined) {
      user.status = updateDto.status;
    }

    if (updateDto.isAdmin !== undefined) {
      user.isAdmin = updateDto.isAdmin;
    }

    return this.userRepository.save(user);
  }

  /**
   * 删除用户（管理员）
   */
  async deleteUser(userId: number): Promise<void> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('用户不存在');
    }

    await this.userRepository.remove(user);
  }

  /**
   * 获取用户设备列表
   */
  async getUserDevices(userId: number): Promise<any[]> {
    // 从 peers 表查询属于该用户的设备
    const peers = await this.peerRepository.find({
      where: { userId },
      order: { updatedAt: 'DESC' },
    });

    // 获取每个设备的系统信息
    const devices = await Promise.all(
      peers.map(async (peer) => {
        const sysinfo = await this.sysinfoRepository.findOne({
          where: { uuid: peer.uuid },
        });

        return {
          uuid: peer.uuid,
          id: peer.id,
          hostname: sysinfo?.hostname,
          username: sysinfo?.username,
          os: sysinfo?.os,
          cpu: sysinfo?.cpu,
          memory: sysinfo?.memory,
          createdAt: peer.createdAt,
          updatedAt: peer.updatedAt,
        };
      })
    );

    return devices;
  }

  /**
   * 删除用户设备（将设备的 userId 设为 null）
   */
  async deleteUserDevice(userId: number, deviceUuid: string): Promise<void> {
    const peer = await this.peerRepository.findOne({
      where: { uuid: deviceUuid, userId },
    });

    if (!peer) {
      throw new NotFoundException('设备不存在');
    }

    // 将设备的 userId 设为 null，表示解除绑定
    peer.userId = null as any;
    await this.peerRepository.save(peer);
  }

  /**
   * 创建管理员用户（初始化用）
   */
  async createAdminUser(username: string, email: string, password: string): Promise<User> {
    const existingUser = await this.userRepository.findOne({
      where: [{ username }, { email }],
    });

    if (existingUser) {
      throw new BadRequestException('用户名或邮箱已存在');
    }

    const user = this.userRepository.create({
      username,
      email,
      password: await bcrypt.hash(password, 10),
      status: UserStatus.ACTIVE,
      isAdmin: true,
    });

    return this.userRepository.save(user);
  }
}
