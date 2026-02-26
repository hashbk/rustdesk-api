import { Injectable, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { AddressBook, AddressBookShare, ShareRule } from '../entities';
import { User } from '../../user/entities/user.entity';
import { PaginationDto } from '../dto';

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
      shared.rule = rule;
    } else {
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
   * 取消共享地址簿
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

    await this.addressBookShareRepository.delete({
      addressBookGuid,
      sharedWithUserId: targetUserId,
    });

    return { message: '取消共享成功' };
  }
}
