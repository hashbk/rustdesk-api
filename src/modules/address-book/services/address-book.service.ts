import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { AddressBook, AddressBookShare, ShareRule } from '../entities';
import { User } from '../../user/entities/user.entity';
import { PaginationDto, PeersQueryDto, AddPeerDto, UpdatePeerDto, AddTagDto, UpdateTagDto, RenameTagDto } from '../dto';
import { AddressBookPeerService } from './address-book-peer.service';
import { AddressBookTagService } from './address-book-tag.service';
import { AddressBookShareService } from './address-book-share.service';
import { AddressBookLegacyService } from './address-book-legacy.service';

@Injectable()
export class AddressBookService {
  constructor(
    @InjectRepository(AddressBook)
    private addressBookRepository: Repository<AddressBook>,
    @InjectRepository(AddressBookShare)
    private addressBookShareRepository: Repository<AddressBookShare>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private readonly peerService: AddressBookPeerService,
    private readonly tagService: AddressBookTagService,
    private readonly shareService: AddressBookShareService,
    private readonly legacyService: AddressBookLegacyService,
  ) {}

  /**
   * 检查用户是否有权限访问地址簿
   * @param addressBookGuid 地址簿GUID
   * @param userId 用户ID
   * @param requiredRule 需要的权限级别
   */
  private async checkAddressBookAccess(
    addressBookGuid: string,
    userId: string,
    requiredRule: ShareRule = ShareRule.READ,
  ): Promise<AddressBook> {
    const addressBook = await this.addressBookRepository.findOne({
      where: { guid: addressBookGuid },
    });

    if (!addressBook) {
      throw new NotFoundException('地址簿不存在');
    }

    // 如果是所有者，拥有完全权限
    if (addressBook.owner === userId) {
      return addressBook;
    }

    // 检查共享权限
    const shared = await this.addressBookShareRepository.findOne({
      where: { addressBookGuid, sharedWithUserId: userId },
    });

    if (!shared) {
      throw new ForbiddenException('无权访问此地址簿');
    }

    // 检查权限级别
    if (shared.rule < requiredRule) {
      const requiredPermission = requiredRule === ShareRule.READ_WRITE ? '读写' : '完全控制';
      throw new ForbiddenException(`需要${requiredPermission}权限`);
    }

    return addressBook;
  }

  // ============ 地址簿基础管理 ============

  // 获取地址簿设置
  async getSettings() {
    return { max_peer_one_ab: 0 };
  }

  // 获取个人地址簿GUID
  async getPersonalAddressBook(userId: string) {
    let addressBook = await this.addressBookRepository.findOne({
      where: { owner: userId, isPersonal: true },
    });

    if (!addressBook) {
      addressBook = this.addressBookRepository.create({
        guid: uuidv4(),
        owner: userId,
        name: 'Personal',
        isPersonal: true,
      });
      await this.addressBookRepository.save(addressBook);
    }

    return { guid: addressBook.guid };
  }

  // ============ 设备管理（委托给 PeerService） ============

  async getPeers(query: PeersQueryDto, userId?: string) {
    return this.peerService.getPeers(query, userId, this.checkAddressBookAccess.bind(this));
  }

  async addPeer(addressBookGuid: string, dto: AddPeerDto, userId?: string) {
    return this.peerService.addPeer(
      addressBookGuid,
      dto,
      userId,
      this.checkAddressBookAccess.bind(this),
      this.tagService.getOrCreateTag.bind(this.tagService),
    );
  }

  async updatePeer(addressBookGuid: string, dto: UpdatePeerDto, userId?: string) {
    return this.peerService.updatePeer(
      addressBookGuid,
      dto,
      userId,
      this.checkAddressBookAccess.bind(this),
      this.tagService.getOrCreateTag.bind(this.tagService),
    );
  }

  async deletePeers(addressBookGuid: string, ids: string[], userId?: string) {
    return this.peerService.deletePeers(
      addressBookGuid,
      ids,
      userId,
      this.checkAddressBookAccess.bind(this),
    );
  }

  // ============ 标签管理（委托给 TagService） ============

  async getTags(addressBookGuid: string, userId?: string) {
    return this.tagService.getTags(addressBookGuid, userId, this.checkAddressBookAccess.bind(this));
  }

  async addTag(addressBookGuid: string, dto: AddTagDto, userId?: string) {
    return this.tagService.addTag(addressBookGuid, dto, userId, this.checkAddressBookAccess.bind(this));
  }

  async renameTag(addressBookGuid: string, dto: RenameTagDto, userId?: string) {
    return this.tagService.renameTag(addressBookGuid, dto, userId, this.checkAddressBookAccess.bind(this));
  }

  async updateTag(addressBookGuid: string, dto: UpdateTagDto, userId?: string) {
    return this.tagService.updateTag(addressBookGuid, dto, userId, this.checkAddressBookAccess.bind(this));
  }

  async deleteTags(addressBookGuid: string, names: string[], userId?: string) {
    return this.tagService.deleteTags(addressBookGuid, names, userId, this.checkAddressBookAccess.bind(this));
  }

  // ============ 共享管理（委托给 ShareService） ============

  async getSharedAddressBooks(userId: string, query: PaginationDto) {
    return this.shareService.getSharedAddressBooks(userId, query);
  }

  // ============ 旧版（Legacy）API（委托给 LegacyService） ============

  async getLegacyAddressBook(userId: string) {
    return this.legacyService.getLegacyAddressBook(userId);
  }

  async updateLegacyAddressBook(userId: string, data: string) {
    return this.legacyService.updateLegacyAddressBook(userId, data);
  }
}
