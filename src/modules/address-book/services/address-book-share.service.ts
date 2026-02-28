import { Injectable, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { AddressBook, AddressBookShare, ShareRule } from '../entities';
import { User } from '../../user/entities/user.entity';
import { PaginationDto } from '../dto';

/**
 * 地址簿共享服务
 * 负责地址簿的共享功能管理
 * 
 * 功能：
 * - 获取共享给用户的地址簿列表
 * - 共享地址簿给其他用户
 * - 取消地址簿共享
 * 
 * 权限级别：
 * - READ: 只读权限，可以查看地址簿内容
 * - READ_WRITE: 读写权限，可以查看和编辑地址簿内容
 * - FULL_CONTROL: 完全控制权限，可以查看、编辑和管理共享
 * 
 * 共享特性：
 * - 只有地址簿所有者可以共享地址簿
 * - 可以设置不同的共享权限级别
 * - 同一用户多次共享会更新权限级别
 */
@Injectable()
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
   * @param userId 用户ID
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

    // 收集所有 owner (用户GUID)
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
   * 共享地址簿给其他用户
   * 将地址簿共享给指定用户，并设置权限级别
   * 
   * @param addressBookGuid 地址簿GUID
   * @param targetUserId 目标用户ID
   * @param rule 共享权限级别
   * @param ownerUserId 地址簿所有者用户ID
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
   * @param addressBookGuid 地址簿GUID
   * @param targetUserId 目标用户ID
   * @param ownerUserId 地址簿所有者用户ID
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
}
