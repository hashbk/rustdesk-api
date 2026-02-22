import { User } from '../../modules/user/entities/user.entity';

/**
 * 用户响应格式化接口
 */
export interface UserResponse {
  id?: number;
  name: string;
  email?: string;
  note?: string;
  status?: number;
  is_admin?: boolean;
  third_auth_type?: string;
  created_at?: Date;
  updated_at?: Date;
}

/**
 * 用户响应格式化器
 * 统一处理用户数据的响应格式
 */
export class UserFormatter {
  /**
   * 格式化单个用户
   */
  static format(user: User, options: { includeId?: boolean; includeDates?: boolean } = {}): UserResponse {
    const response: UserResponse = {
      name: user.username,
      email: user.email || undefined,
      note: user.note || undefined,
      status: user.status,
      is_admin: user.isAdmin,
    };

    if (options.includeId) {
      response.id = user.id;
    }

    if (user.thirdAuthType) {
      response.third_auth_type = user.thirdAuthType;
    }

    if (options.includeDates) {
      response.created_at = user.createdAt;
      response.updated_at = user.updatedAt;
    }

    return response;
  }

  /**
   * 格式化用户列表
   */
  static formatList(users: User[], options: { includeId?: boolean; includeDates?: boolean } = {}): UserResponse[] {
    return users.map(user => this.format(user, options));
  }

  /**
   * 格式化登录响应中的用户信息
   */
  static formatForLogin(user: User): UserResponse {
    return {
      name: user.username,
      email: user.email || undefined,
      note: user.note || undefined,
      status: user.status,
      info: user.getUserInfo ? user.getUserInfo() : undefined,
      is_admin: user.isAdmin,
      third_auth_type: user.thirdAuthType || undefined,
    } as any;
  }

  /**
   * 格式化管理端用户列表
   */
  static formatForAdmin(user: User): UserResponse {
    return {
      id: user.id,
      name: user.username,
      email: user.email,
      note: user.note,
      status: user.status,
      is_admin: user.isAdmin,
      created_at: user.createdAt,
      updated_at: user.updatedAt,
    };
  }

  /**
   * 格式化管理端用户列表
   */
  static formatListForAdmin(users: User[]): UserResponse[] {
    return users.map(user => this.formatForAdmin(user));
  }
}
