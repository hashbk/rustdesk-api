import { Controller, Get, Post, Put, Delete, Body, Param, Query, ParseIntPipe, UseGuards } from '@nestjs/common';
import { UserService } from './user.service';
import { UpdateUserDto, AdminUpdateUserDto } from './dto/user.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User, UserStatus } from './entities/user.entity';

@Controller('api')
@UseGuards(JwtAuthGuard)
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('users')
  async getUsers(
    @CurrentUser('isAdmin') isAdmin: boolean,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    if (!isAdmin) {
      return { error: '无权限访问' };
    }

    const pageNum = parseInt(page || '1', 10);
    const limitNum = parseInt(limit || '20', 10);

    const { users, total } = await this.userService.findAll(pageNum, limitNum);

    return {
      users: users.map(user => ({
        id: user.id,
        name: user.username,
        email: user.email,
        note: user.note,
        status: user.status,
        is_admin: user.isAdmin,
        created_at: user.createdAt,
        updated_at: user.updatedAt,
      })),
      total,
      page: pageNum,
      limit: limitNum,
    };
  }

  @Get('users/:id')
  async getUser(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('id') currentUserId: number,
    @CurrentUser('isAdmin') isAdmin: boolean,
  ) {
    // 只有管理员或用户本人可以查看用户详情
    if (!isAdmin && id !== currentUserId) {
      return { error: '无权限访问' };
    }

    const user = await this.userService.findById(id);
    if (!user) {
      return { error: '用户不存在' };
    }

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

  @Put('users/:id')
  async updateUser(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateUserDto,
    @CurrentUser('id') currentUserId: number,
    @CurrentUser('isAdmin') isAdmin: boolean,
  ) {
    // 只有管理员或用户本人可以更新用户信息
    if (!isAdmin && id !== currentUserId) {
      return { error: '无权限访问' };
    }

    const user = await this.userService.updateUser(id, updateDto);
    return {
      id: user.id,
      name: user.username,
      email: user.email,
      note: user.note,
      status: user.status,
      is_admin: user.isAdmin,
    };
  }

  @Delete('users/:id')
  async deleteUser(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('id') currentUserId: number,
    @CurrentUser('isAdmin') isAdmin: boolean,
  ) {
    // 只有管理员可以删除用户
    if (!isAdmin) {
      return { error: '无权限访问' };
    }

    // 不能删除自己
    if (id === currentUserId) {
      return { error: '不能删除自己' };
    }

    await this.userService.deleteUser(id);
    return { message: '删除成功' };
  }

  @Put('users/:id/status')
  async updateUserStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body('status') status: UserStatus,
    @CurrentUser('id') currentUserId: number,
    @CurrentUser('isAdmin') isAdmin: boolean,
  ) {
    // 只有管理员可以修改用户状态
    if (!isAdmin) {
      return { error: '无权限访问' };
    }

    // 不能修改自己的状态
    if (id === currentUserId) {
      return { error: '不能修改自己的状态' };
    }

    const user = await this.userService.adminUpdateUser(id, { status });
    return {
      id: user.id,
      status: user.status,
    };
  }

  @Get('users/:id/devices')
  async getUserDevices(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('id') currentUserId: number,
    @CurrentUser('isAdmin') isAdmin: boolean,
  ) {
    // 只有管理员或用户本人可以查看设备列表
    if (!isAdmin && id !== currentUserId) {
      return { error: '无权限访问' };
    }

    const devices = await this.userService.getUserDevices(id);
    return devices.map(device => ({
      id: device.id,
      device_id: device.deviceId,
      device_uuid: device.deviceUuid,
      device_name: device.deviceName,
      platform: device.platform,
      os_version: device.osVersion,
      last_ip: device.lastIp,
      created_at: device.createdAt,
      updated_at: device.updatedAt,
    }));
  }

  @Delete('users/:id/devices/:deviceId')
  async deleteUserDevice(
    @Param('id', ParseIntPipe) userId: number,
    @Param('deviceId', ParseIntPipe) deviceId: number,
    @CurrentUser('id') currentUserId: number,
    @CurrentUser('isAdmin') isAdmin: boolean,
  ) {
    // 只有管理员或用户本人可以删除设备
    if (!isAdmin && userId !== currentUserId) {
      return { error: '无权限访问' };
    }

    await this.userService.deleteUserDevice(userId, deviceId);
    return { message: '删除成功' };
  }
}
