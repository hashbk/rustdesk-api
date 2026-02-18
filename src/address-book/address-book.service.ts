import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, In } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { AddressBook, AbPeer, AbTag, SharedAddressBook, ShareRule } from './entities';
import { AddPeerDto, UpdatePeerDto, DeletePeersDto, AddTagDto, UpdateTagDto, RenameTagDto, DeleteTagsDto, PaginationDto, PeersQueryDto } from './dto';

@Injectable()
export class AddressBookService {
  constructor(
    @InjectRepository(AddressBook)
    private addressBookRepository: Repository<AddressBook>,
    @InjectRepository(AbPeer)
    private abPeerRepository: Repository<AbPeer>,
    @InjectRepository(AbTag)
    private abTagRepository: Repository<AbTag>,
    @InjectRepository(SharedAddressBook)
    private sharedAddressBookRepository: Repository<SharedAddressBook>,
  ) {}

  /**
   * 检查用户是否有权限访问地址簿
   * @param abGuid 地址簿GUID
   * @param userId 用户ID
   * @param requiredRule 需要的权限级别
   */
  private async checkAddressBookAccess(
    abGuid: string,
    userId: string,
    requiredRule: ShareRule = ShareRule.READ,
  ): Promise<AddressBook> {
    const addressBook = await this.addressBookRepository.findOne({
      where: { guid: abGuid },
    });

    if (!addressBook) {
      throw new NotFoundException('地址簿不存在');
    }

    // 如果是所有者，拥有完全权限
    if (addressBook.owner === userId) {
      return addressBook;
    }

    // 检查共享权限
    const shared = await this.sharedAddressBookRepository.findOne({
      where: { abGuid, sharedWith: userId },
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

  // 获取地址簿设置
  async getSettings() {
    return { max_peer_one_ab: 1000 };
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
        maxPeers: 1000,
      });
      await this.addressBookRepository.save(addressBook);
    }

    return { guid: addressBook.guid };
  }

  // 获取共享地址簿列表
  async getSharedAddressBooks(userId: string, query: PaginationDto) {
    const { current = 1, pageSize = 100 } = query;
    const skip = (current - 1) * pageSize;

    const [shared, total] = await this.sharedAddressBookRepository.findAndCount({
      where: { sharedWith: userId },
      relations: ['addressBook'],
      skip,
      take: pageSize,
    });

    const data = shared.map(s => ({
      guid: s.abGuid,
      name: s.addressBook?.name || '',
      owner: s.addressBook?.owner || '',
      note: s.addressBook?.note || '',
      rule: s.rule,
      info: s.addressBook?.info ? JSON.parse(s.addressBook.info) : {},
    }));

    return { total, data };
  }

  // 获取地址簿中的设备列表
  async getPeers(query: PeersQueryDto, userId?: string) {
    const { current = 1, pageSize = 100, ab } = query;
    const skip = (current - 1) * pageSize;

    const addressBook = await this.addressBookRepository.findOne({
      where: { guid: ab },
    });

    if (!addressBook) {
      throw new NotFoundException('地址簿不存在');
    }

    // 如果提供了用户ID，验证访问权限
    if (userId) {
      await this.checkAddressBookAccess(ab, userId, ShareRule.READ);
    }

    const [peers, total] = await this.abPeerRepository.findAndCount({
      where: { abGuid: ab },
      skip,
      take: pageSize,
    });

    const data = peers.map(p => ({
      id: p.id,
      hash: p.hash,
      password: p.password,
      username: p.username,
      hostname: p.hostname,
      platform: p.platform,
      alias: p.alias,
      tags: p.tags ? JSON.parse(p.tags) : [],
      forceAlwaysRelay: p.forceAlwaysRelay,
      rdpPort: p.rdpPort,
      rdpUsername: p.rdpUsername,
      loginName: p.loginName,
      device_group_name: p.deviceGroupName,
      note: p.note,
      same_server: p.sameServer,
    }));

    return { total, data };
  }

  // 获取地址簿标签列表
  async getTags(guid: string, userId?: string) {
    // 如果提供了用户ID，验证访问权限
    if (userId) {
      await this.checkAddressBookAccess(guid, userId, ShareRule.READ);
    }

    const tags = await this.abTagRepository.find({
      where: { abGuid: guid },
    });

    return tags.map(t => ({
      name: t.name,
      color: t.color,
    }));
  }

  // 添加设备到地址簿
  async addPeer(guid: string, dto: AddPeerDto, userId?: string) {
    // 如果提供了用户ID，验证写权限
    if (userId) {
      await this.checkAddressBookAccess(guid, userId, ShareRule.READ_WRITE);
    }

    const addressBook = await this.addressBookRepository.findOne({
      where: { guid },
    });

    if (!addressBook) {
      throw new NotFoundException('地址簿不存在');
    }

    // 检查设备数量限制
    const count = await this.abPeerRepository.count({
      where: { abGuid: guid },
    });

    if (count >= addressBook.maxPeers) {
      throw new BadRequestException('已达到地址簿最大设备数限制');
    }

    // 检查设备是否已存在
    const existingPeer = await this.abPeerRepository.findOne({
      where: { id: dto.id, abGuid: guid },
    });

    if (existingPeer) {
      throw new BadRequestException('设备已存在于地址簿中');
    }

    const peer = this.abPeerRepository.create({
      id: dto.id,
      abGuid: guid,
      hash: dto.hash,
      password: dto.password,
      username: dto.username,
      hostname: dto.hostname,
      platform: dto.platform,
      alias: dto.alias,
      tags: dto.tags ? JSON.stringify(dto.tags) : undefined,
      note: dto.note,
      forceAlwaysRelay: dto.forceAlwaysRelay,
      rdpPort: dto.rdpPort,
      rdpUsername: dto.rdpUsername,
      loginName: dto.loginName,
      deviceGroupName: dto.device_group_name,
      sameServer: dto.same_server || false,
    });

    await this.abPeerRepository.save(peer);
    return {};
  }

  // 更新设备信息
  async updatePeer(guid: string, dto: UpdatePeerDto, userId?: string) {
    // 如果提供了用户ID，验证写权限
    if (userId) {
      await this.checkAddressBookAccess(guid, userId, ShareRule.READ_WRITE);
    }

    const peer = await this.abPeerRepository.findOne({
      where: { id: dto.id, abGuid: guid },
    });

    if (!peer) {
      throw new NotFoundException('设备不存在');
    }

    const updateData: Partial<AbPeer> = { id: dto.id, abGuid: guid };

    if (dto.hash !== undefined) updateData.hash = dto.hash;
    if (dto.password !== undefined) updateData.password = dto.password;
    if (dto.username !== undefined) updateData.username = dto.username;
    if (dto.hostname !== undefined) updateData.hostname = dto.hostname;
    if (dto.platform !== undefined) updateData.platform = dto.platform;
    if (dto.alias !== undefined) updateData.alias = dto.alias;
    if (dto.tags !== undefined) updateData.tags = JSON.stringify(dto.tags);
    if (dto.note !== undefined) updateData.note = dto.note;
    if (dto.forceAlwaysRelay !== undefined) updateData.forceAlwaysRelay = dto.forceAlwaysRelay;
    if (dto.rdpPort !== undefined) updateData.rdpPort = dto.rdpPort;
    if (dto.rdpUsername !== undefined) updateData.rdpUsername = dto.rdpUsername;
    if (dto.loginName !== undefined) updateData.loginName = dto.loginName;
    if (dto.device_group_name !== undefined) updateData.deviceGroupName = dto.device_group_name;
    if (dto.same_server !== undefined) updateData.sameServer = dto.same_server;

    await this.abPeerRepository.update({ id: dto.id, abGuid: guid }, updateData);
    return {};
  }

  // 删除设备
  async deletePeers(guid: string, ids: string[], userId?: string) {
    // 如果提供了用户ID，验证写权限
    if (userId) {
      await this.checkAddressBookAccess(guid, userId, ShareRule.READ_WRITE);
    }

    if (!ids || ids.length === 0) {
      throw new BadRequestException('请提供要删除的设备ID');
    }

    await this.abPeerRepository.delete({
      id: In(ids),
      abGuid: guid,
    });

    return {};
  }

  // 添加标签
  async addTag(guid: string, dto: AddTagDto, userId?: string) {
    // 如果提供了用户ID，验证写权限
    if (userId) {
      await this.checkAddressBookAccess(guid, userId, ShareRule.READ_WRITE);
    }

    const addressBook = await this.addressBookRepository.findOne({
      where: { guid },
    });

    if (!addressBook) {
      throw new NotFoundException('地址簿不存在');
    }

    const existingTag = await this.abTagRepository.findOne({
      where: { name: dto.name, abGuid: guid },
    });

    if (existingTag) {
      throw new BadRequestException('标签已存在');
    }

    const tag = this.abTagRepository.create({
      name: dto.name,
      abGuid: guid,
      color: dto.color || 0,
    });

    await this.abTagRepository.save(tag);
    return {};
  }

  // 重命名标签
  async renameTag(guid: string, dto: RenameTagDto, userId?: string) {
    // 如果提供了用户ID，验证写权限
    if (userId) {
      await this.checkAddressBookAccess(guid, userId, ShareRule.READ_WRITE);
    }

    const tag = await this.abTagRepository.findOne({
      where: { name: dto.old, abGuid: guid },
    });

    if (!tag) {
      throw new NotFoundException('标签不存在');
    }

    const existingTag = await this.abTagRepository.findOne({
      where: { name: dto.new, abGuid: guid },
    });

    if (existingTag) {
      throw new BadRequestException('新标签名已存在');
    }

    // 更新标签名
    await this.abTagRepository.update({ name: dto.old, abGuid: guid }, { name: dto.new });

    // 更新所有使用该标签的设备
    const peers = await this.abPeerRepository.find({
      where: { abGuid: guid },
    });

    for (const peer of peers) {
      if (peer.tags) {
        const tags: string[] = JSON.parse(peer.tags);
        const index = tags.indexOf(dto.old);
        if (index !== -1) {
          tags[index] = dto.new;
          await this.abPeerRepository.update({ id: peer.id, abGuid: guid }, { tags: JSON.stringify(tags) });
        }
      }
    }

    return {};
  }

  // 更新标签颜色
  async updateTag(guid: string, dto: UpdateTagDto, userId?: string) {
    // 如果提供了用户ID，验证写权限
    if (userId) {
      await this.checkAddressBookAccess(guid, userId, ShareRule.READ_WRITE);
    }

    const tag = await this.abTagRepository.findOne({
      where: { name: dto.name, abGuid: guid },
    });

    if (!tag) {
      throw new NotFoundException('标签不存在');
    }

    await this.abTagRepository.update({ name: dto.name, abGuid: guid }, { color: dto.color });
    return {};
  }

  // 删除标签
  async deleteTags(guid: string, names: string[], userId?: string) {
    // 如果提供了用户ID，验证写权限
    if (userId) {
      await this.checkAddressBookAccess(guid, userId, ShareRule.READ_WRITE);
    }

    if (!names || names.length === 0) {
      throw new BadRequestException('请提供要删除的标签名');
    }

    // 删除标签
    await this.abTagRepository.delete({
      name: In(names),
      abGuid: guid,
    });

    // 从所有设备中移除这些标签
    const peers = await this.abPeerRepository.find({
      where: { abGuid: guid },
    });

    for (const peer of peers) {
      if (peer.tags) {
        const tags: string[] = JSON.parse(peer.tags);
        const newTags = tags.filter(t => !names.includes(t));
        if (newTags.length !== tags.length) {
          await this.abPeerRepository.update({ id: peer.id, abGuid: guid }, { tags: JSON.stringify(newTags) });
        }
      }
    }

    return {};
  }

  /**
   * 共享地址簿给其他用户
   */
  async shareAddressBook(
    abGuid: string,
    targetUserId: string,
    rule: ShareRule,
    ownerUserId: string,
  ) {
    // 验证所有权
    const addressBook = await this.checkAddressBookAccess(abGuid, ownerUserId, ShareRule.FULL_CONTROL);

    // 检查是否已共享
    let shared = await this.sharedAddressBookRepository.findOne({
      where: { abGuid, sharedWith: targetUserId },
    });

    if (shared) {
      shared.rule = rule;
    } else {
      shared = this.sharedAddressBookRepository.create({
        abGuid,
        sharedWith: targetUserId,
        rule,
      });
    }

    await this.sharedAddressBookRepository.save(shared);
    return { message: '共享成功' };
  }

  /**
   * 取消共享地址簿
   */
  async unshareAddressBook(abGuid: string, targetUserId: string, ownerUserId: string) {
    // 验证所有权
    await this.checkAddressBookAccess(abGuid, ownerUserId, ShareRule.FULL_CONTROL);

    await this.sharedAddressBookRepository.delete({
      abGuid,
      sharedWith: targetUserId,
    });

    return { message: '取消共享成功' };
  }

  // ============ 旧版（Legacy）API ============

  /**
   * 获取旧版地址簿
   * 返回格式兼容旧版 RustDesk 客户端
   */
  async getLegacyAddressBook(userId: string) {
    // 获取用户的个人地址簿
    let addressBook = await this.addressBookRepository.findOne({
      where: { owner: userId, isPersonal: true },
    });

    // 如果不存在则创建
    if (!addressBook) {
      addressBook = this.addressBookRepository.create({
        guid: uuidv4(),
        owner: userId,
        name: 'Personal',
        isPersonal: true,
        maxPeers: 1000,
      });
      await this.addressBookRepository.save(addressBook);
    }

    // 获取所有标签
    const tags = await this.abTagRepository.find({
      where: { abGuid: addressBook.guid },
    });

    // 获取所有设备
    const peers = await this.abPeerRepository.find({
      where: { abGuid: addressBook.guid },
    });

    // 如果地址簿为空，返回 "null"
    if (tags.length === 0 && peers.length === 0) {
      return 'null';
    }

    // 构建标签颜色映射
    const tagColors: Record<string, number> = {};
    for (const tag of tags) {
      tagColors[tag.name] = tag.color;
    }

    // 构建设备列表
    const peersData = peers.map(p => ({
      id: p.id,
      hash: p.hash || '',
      username: p.username || '',
      hostname: p.hostname || '',
      platform: p.platform || '',
      alias: p.alias || '',
      tags: p.tags ? JSON.parse(p.tags) : [],
    }));

    // 构建标签列表
    const tagsList = tags.map(t => t.name);

    return {
      licensed_devices: 100,
      data: JSON.stringify({
        tags: tagsList,
        peers: peersData,
        tag_colors: JSON.stringify(tagColors),
      }),
    };
  }

  /**
   * 更新旧版地址簿
   * 接收双重 JSON 编码的数据
   */
  async updateLegacyAddressBook(userId: string, data: string) {
    if (!data) {
      return 'null';
    }

    // 解析双重 JSON 编码的数据
    let parsedData: {
      tags?: string[];
      peers?: Array<{
        id: string;
        hash?: string;
        username?: string;
        hostname?: string;
        platform?: string;
        alias?: string;
        tags?: string[];
      }>;
      tag_colors?: string;
    };

    try {
      parsedData = JSON.parse(data);
    } catch (e) {
      throw new BadRequestException('无效的 JSON 数据');
    }

    // 获取用户的个人地址簿
    let addressBook = await this.addressBookRepository.findOne({
      where: { owner: userId, isPersonal: true },
    });

    // 如果不存在则创建
    if (!addressBook) {
      addressBook = this.addressBookRepository.create({
        guid: uuidv4(),
        owner: userId,
        name: 'Personal',
        isPersonal: true,
        maxPeers: 1000,
      });
      await this.addressBookRepository.save(addressBook);
    }

    const abGuid = addressBook.guid;

    // 解析标签颜色
    let tagColors: Record<string, number> = {};
    if (parsedData.tag_colors) {
      try {
        tagColors = JSON.parse(parsedData.tag_colors);
      } catch (e) {
        // 忽略解析错误
      }
    }

    // 删除所有现有标签和设备
    await this.abTagRepository.delete({ abGuid });
    await this.abPeerRepository.delete({ abGuid });

    // 创建新标签
    if (parsedData.tags && parsedData.tags.length > 0) {
      for (const tagName of parsedData.tags) {
        const tag = this.abTagRepository.create({
          name: tagName,
          abGuid,
          color: tagColors[tagName] || 0,
        });
        await this.abTagRepository.save(tag);
      }
    }

    // 创建新设备
    if (parsedData.peers && parsedData.peers.length > 0) {
      for (const peerData of parsedData.peers) {
        const peer = this.abPeerRepository.create({
          id: peerData.id,
          abGuid,
          hash: peerData.hash || '',
          username: peerData.username || '',
          hostname: peerData.hostname || '',
          platform: peerData.platform || '',
          alias: peerData.alias || '',
          tags: peerData.tags ? JSON.stringify(peerData.tags) : '[]',
        });
        await this.abPeerRepository.save(peer);
      }
    }

    return 'null';
  }
}
