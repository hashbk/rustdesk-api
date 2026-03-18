import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';

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
  ) {}
}
