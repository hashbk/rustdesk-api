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

/**
 * 地址簿服务
 * 地址簿模块的核心服务，负责协调各个子服务的功能
 * 
 * 功能：
 * - 地址簿基础管理（创建、获取、权限检查）
 * - 设备管理（委托给PeerService）
 * - 标签管理（委托给TagService）
 * - 共享管理（委托给ShareService）
 * - 旧版API兼容（委托给LegacyService）
 * 
 * 架构说明：
 * 采用服务委托模式，将具体功能委托给专门的子服务处理
 * 主服务负责权限检查、协调和路由
 */
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
   * 验证用户对地址簿的访问权限，包括所有权检查和共享权限检查
   * 
   * @param addressBookGuid 地址簿GUID
   * @param userId 用户ID
   * @param requiredRule 需要的权限级别（默认为只读）
   * @returns 地址簿对象
   * @throws NotFoundException 当地址簿不存在时抛出
   * @throws ForbiddenException 当用户无权限或权限不足时抛出
   * @private
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

  /**
   * 获取地址簿设置
   * 获取地址簿的全局配置参数
   * 
   * @returns 地址簿设置对象
   */
  async getSettings() {
    return { max_peer_one_ab: 0 };
  }

  /**
   * 获取个人地址簿GUID
   * 获取或创建用户的个人地址簿
   * 
   * @param userId 用户ID
   * @returns 包含地址簿GUID的对象
   */
  async getPersonalAddressBook(userId: string) {
    let addressBook = await this.addressBookRepository.findOne({
      where: { owner: userId, isPersonal: true },
    });

    if (!addressBook) {
      // 如果个人地址簿不存在，自动创建
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

  /**
   * 获取地址簿中的设备列表
   * 委托给PeerService处理，自动进行权限验证
   * 
   * @param query 查询参数，包含分页和过滤条件
   * @param userId 用户ID（可选，用于权限验证）
   * @returns 设备列表和总数
   */
  async getPeers(query: PeersQueryDto, userId?: string) {
    return this.peerService.getPeers(query, userId, this.checkAddressBookAccess.bind(this));
  }

  /**
   * 添加设备到地址簿
   * 委托给PeerService处理，自动进行权限验证
   * 
   * @param addressBookGuid 地址簿GUID
   * @param dto 设备信息DTO
   * @param userId 用户ID（可选，用于权限验证）
   * @returns 操作结果
   */
  async addPeer(addressBookGuid: string, dto: AddPeerDto, userId?: string) {
    return this.peerService.addPeer(
      addressBookGuid,
      dto,
      userId,
      this.checkAddressBookAccess.bind(this),
      this.tagService.getOrCreateTag.bind(this.tagService),
    );
  }

  /**
   * 更新地址簿中的设备信息
   * 委托给PeerService处理，自动进行权限验证
   * 
   * @param addressBookGuid 地址簿GUID
   * @param dto 设备更新信息DTO
   * @param userId 用户ID（可选，用于权限验证）
   * @returns 操作结果
   */
  async updatePeer(addressBookGuid: string, dto: UpdatePeerDto, userId?: string) {
    return this.peerService.updatePeer(
      addressBookGuid,
      dto,
      userId,
      this.checkAddressBookAccess.bind(this),
      this.tagService.getOrCreateTag.bind(this.tagService),
    );
  }

  /**
   * 从地址簿中删除设备
   * 委托给PeerService处理，自动进行权限验证
   * 
   * @param addressBookGuid 地址簿GUID
   * @param ids 要删除的设备ID列表
   * @param userId 用户ID（可选，用于权限验证）
   * @returns 操作结果
   */
  async deletePeers(addressBookGuid: string, ids: string[], userId?: string) {
    return this.peerService.deletePeers(
      addressBookGuid,
      ids,
      userId,
      this.checkAddressBookAccess.bind(this),
    );
  }

  // ============ 标签管理（委托给 TagService） ============

  /**
   * 获取地址簿标签列表
   * 委托给TagService处理，自动进行权限验证
   * 
   * @param addressBookGuid 地址簿GUID
   * @param userId 用户ID（可选，用于权限验证）
   * @returns 标签列表
   */
  async getTags(addressBookGuid: string, userId?: string) {
    return this.tagService.getTags(addressBookGuid, userId, this.checkAddressBookAccess.bind(this));
  }

  /**
   * 添加标签到地址簿
   * 委托给TagService处理，自动进行权限验证
   * 
   * @param addressBookGuid 地址簿GUID
   * @param dto 标签信息DTO
   * @param userId 用户ID（可选，用于权限验证）
   * @returns 操作结果
   */
  async addTag(addressBookGuid: string, dto: AddTagDto, userId?: string) {
    return this.tagService.addTag(addressBookGuid, dto, userId, this.checkAddressBookAccess.bind(this));
  }

  /**
   * 重命名标签
   * 委托给TagService处理，自动进行权限验证
   * 
   * @param addressBookGuid 地址簿GUID
   * @param dto 重命名信息DTO
   * @param userId 用户ID（可选，用于权限验证）
   * @returns 操作结果
   */
  async renameTag(addressBookGuid: string, dto: RenameTagDto, userId?: string) {
    return this.tagService.renameTag(addressBookGuid, dto, userId, this.checkAddressBookAccess.bind(this));
  }

  /**
   * 更新标签颜色
   * 委托给TagService处理，自动进行权限验证
   * 
   * @param addressBookGuid 地址簿GUID
   * @param dto 标签更新信息DTO
   * @param userId 用户ID（可选，用于权限验证）
   * @returns 操作结果
   */
  async updateTag(addressBookGuid: string, dto: UpdateTagDto, userId?: string) {
    return this.tagService.updateTag(addressBookGuid, dto, userId, this.checkAddressBookAccess.bind(this));
  }

  /**
   * 删除标签
   * 委托给TagService处理，自动进行权限验证
   * 
   * @param addressBookGuid 地址簿GUID
   * @param names 要删除的标签名称列表
   * @param userId 用户ID（可选，用于权限验证）
   * @returns 操作结果
   */
  async deleteTags(addressBookGuid: string, names: string[], userId?: string) {
    return this.tagService.deleteTags(addressBookGuid, names, userId, this.checkAddressBookAccess.bind(this));
  }

  // ============ 共享管理（委托给 ShareService） ============

  /**
   * 获取共享给用户的地址簿列表
   * 委托给ShareService处理
   * 
   * @param userId 用户ID
   * @param query 分页查询参数
   * @returns 共享地址簿列表
   */
  async getSharedAddressBooks(userId: string, query: PaginationDto) {
    return this.shareService.getSharedAddressBooks(userId, query);
  }

  // ============ 旧版（Legacy）API（委托给 LegacyService） ============

  /**
   * 获取旧版地址簿数据
   * 委托给LegacyService处理，用于兼容旧版本客户端
   * 
   * @param userId 用户ID
   * @returns 旧版地址簿数据
   */
  async getLegacyAddressBook(userId: string) {
    return this.legacyService.getLegacyAddressBook(userId);
  }

  /**
   * 更新旧版地址簿数据
   * 委托给LegacyService处理，用于兼容旧版本客户端
   * 
   * @param userId 用户ID
   * @param data 地址簿数据字符串
   * @returns 操作结果
   */
  async updateLegacyAddressBook(userId: string, data: string) {
    return this.legacyService.updateLegacyAddressBook(userId, data);
  }
}
