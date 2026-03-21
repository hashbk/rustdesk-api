import { Injectable, ForbiddenException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { AddressBook, AddressBookShare, ShareRule } from '../entities';
import { User } from '../../user/entities/user.entity';
import { PaginationDto } from '../dto';

@Injectable()
/**
 * AddressBookShareService
 * 负责地址簿共享管理的子服务
 *
 * 与主服务关系：
 * 被 AddressBookService 委托处理共享相关操作
 *
 * 调用上下文：
 * 包括共享的创建、更新、删除和权限管理
 */
export class AddressBookShareService {
  constructor(
    @InjectRepository(AddressBook)
    private addressBookRepository: Repository<AddressBook>,
    @InjectRepository(AddressBookShare)
    private addressBookShareRepository: Repository<AddressBookShare>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  /**
   * 获取共享地址簿列表
   * 查询所有共享给当前用户的地址簿
   * 
   * @param userId 用户 ID
   * @param query 分页查询参数
   * @returns 共享地址簿列表和总数
   */
  async getSharedAddressBooks(userId: string, query: PaginationDto) {
    const { current = 1, pageSize = 100 } = query;
    const skip = (current - 1) * pageSize;

    const [shared, total] = await this.addressBookShareRepository.findAndCount({
      where: { sharedWithUserId: userId },
      relations: ['addressBook'],
      skip,
      take: pageSize,
    });

    // 收集所有 owner (用户 GUID)
    const ownerGuids = [...new Set(
      shared
        .map(s => s.addressBook?.owner)
        .filter((guid): guid is string => !!guid)
    )];

    // 批量查询用户信息
    const users = ownerGuids.length > 0
      ? await this.userRepository.find({
          where: { guid: In(ownerGuids) },
          select: ['guid', 'username'],
        })
      : [];
    const userMap = new Map(users.map(u => [u.guid, u.username]));

    // 组装返回数据
    const data = shared.map(s => ({
      guid: s.addressBookGuid,
      name: s.addressBook?.name || '',
      owner: userMap.get(s.addressBook?.owner || '') || s.addressBook?.owner || '',
      note: s.addressBook?.note || '',
      rule: s.rule,
      info: s.addressBook?.info ? JSON.parse(s.addressBook.info) : {},
    }));

    return { total, data };
  }

  /**
   * 添加共享地址簿
   * 创建一个新的共享地址簿记录
   *
   * @param name 地址簿名称
   * @param ownerUserId 所有者用户 ID
   * @param note 备注（可选）
   * @param password 密码（可选）
   * @returns 新创建的地址簿 GUID
   * @throws ConflictException 如果名称已存在
   */
  async addSharedAddressBook(
    name: string,
    ownerUserId: string,
    note?: string,
    password?: string,
  ): Promise<string> {
    // 检查名称是否已存在
    const existing = await this.addressBookRepository.findOne({
      where: { name, owner: ownerUserId, isPersonal: false },
    });

    if (existing) {
      throw new ConflictException('地址簿名称已存在');
    }

    // 创建地址簿
    const addressBook = this.addressBookRepository.create({
      guid: this.generateGuid(),
      name,
      owner: ownerUserId,
      isPersonal: false,
      note,
      info: password ? JSON.stringify({ password }) : undefined,
    });

    await this.addressBookRepository.save(addressBook);
    return addressBook.guid;
  }

  /**
   * 更新共享地址簿
   * 更新现有共享地址簿的信息
   *
   * @param guid 地址簿 GUID
   * @param name 新名称（可选）
   * @param note 新备注（可选）
   * @param owner 新所有者（可选）
   * @param password 新密码（可选）
   * @throws NotFoundException 地址簿不存在
   * @throws ForbiddenException 无权限修改
   * @throws ConflictException 名称已存在
   */
  async updateSharedAddressBook(
    guid: string,
    name?: string,
    note?: string,
    owner?: string,
    password?: string,
  ): Promise<void> {
    const addressBook = await this.addressBookRepository.findOne({
      where: { guid },
    });

    if (!addressBook) {
      throw new ConflictException('地址簿不存在');
    }

    // 检查名称是否已被其他地址簿使用
    if (name && name !== addressBook.name) {
      const existing = await this.addressBookRepository.findOne({
        where: { name, owner: addressBook.owner, isPersonal: false },
      });
      if (existing && existing.guid !== guid) {
        throw new ConflictException('地址簿名称已存在');
      }
    }

    // 更新字段
    if (name !== undefined) Object.assign(addressBook, { name });
    if (note !== undefined) Object.assign(addressBook, { note });
    if (owner !== undefined) Object.assign(addressBook, { owner });
    if (password !== undefined) {
      Object.assign(addressBook, { info: password ? JSON.stringify({ password }) : undefined });
    }

    await this.addressBookRepository.save(addressBook);
  }

  /**
   * 删除共享地址簿
   * 删除一个或多个共享地址簿
   *
   * @param guids 地址簿 GUID 数组
   * @param userId 用户 ID（需要所有者权限）
   * @throws ForbiddenException 无权限删除
   */
  async deleteSharedAddressBooks(
    guids: string[],
    userId: string,
  ): Promise<void> {
    for (const guid of guids) {
      const addressBook = await this.addressBookRepository.findOne({
        where: { guid },
      });

      if (!addressBook) {
        continue; // 跳过不存在的地址簿
      }

      // 检查所有权
      if (addressBook.owner !== userId) {
        throw new ForbiddenException(`无权删除地址簿 '${addressBook.name}'`);
      }

      // 删除地址簿及其关联的共享记录
      await this.addressBookRepository.delete(guid);
      await this.addressBookShareRepository.delete({ addressBookGuid: guid });
    }
  }

  /**
   * 共享地址簿给其他用户
   * 将地址簿共享给指定用户，并设置权限级别
   * 
   * @param addressBookGuid 地址簿 GUID
   * @param targetUserId 目标用户 ID
   * @param rule 共享权限级别
   * @param ownerUserId 地址簿所有者用户 ID
   * @param checkAccess 权限检查函数（可选）
   * @returns 操作结果
   * @throws ForbiddenException 当用户没有完全控制权限时抛出
   */
  async shareAddressBook(
    addressBookGuid: string,
    targetUserId: string,
    rule: ShareRule,
    ownerUserId: string,
    checkAccess?: (ab: string, userId: string, rule: ShareRule) => Promise<AddressBook>,
  ) {
    // 验证所有权
    if (checkAccess) {
      await checkAccess(addressBookGuid, ownerUserId, ShareRule.FULL_CONTROL);
    }

    // 检查是否已共享
    let shared = await this.addressBookShareRepository.findOne({
      where: { addressBookGuid, sharedWithUserId: targetUserId },
    });

    if (shared) {
      // 已共享，更新权限级别
      shared.rule = rule;
    } else {
      // 未共享，创建新的共享记录
      shared = this.addressBookShareRepository.create({
        addressBookGuid,
        sharedWithUserId: targetUserId,
        rule,
      });
    }

    await this.addressBookShareRepository.save(shared);
    return { message: '共享成功' };
  }

  /**
   * 取消地址簿共享
   * 取消地址簿对指定用户的共享
   * 
   * @param addressBookGuid 地址簿 GUID
   * @param targetUserId 目标用户 ID
   * @param ownerUserId 地址簿所有者用户 ID
   * @param checkAccess 权限检查函数（可选）
   * @returns 操作结果
   * @throws ForbiddenException 当用户没有完全控制权限时抛出
   */
  async unshareAddressBook(
    addressBookGuid: string,
    targetUserId: string,
    ownerUserId: string,
    checkAccess?: (ab: string, userId: string, rule: ShareRule) => Promise<AddressBook>,
  ) {
    // 验证所有权
    if (checkAccess) {
      await checkAccess(addressBookGuid, ownerUserId, ShareRule.FULL_CONTROL);
    }

    // 删除共享记录
    await this.addressBookShareRepository.delete({
      addressBookGuid,
      sharedWithUserId: targetUserId,
    });

    return { message: '取消共享成功' };
  }

  /**
   * 生成 GUID
   * 使用简单的 UUID 生成方式
   *
   * @returns UUID 字符串
   */
  private generateGuid(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }
}
