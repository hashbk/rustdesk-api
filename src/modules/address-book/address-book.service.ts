import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { AddressBook, AddressBookPeer, AddressBookTag, AddressBookShare, AddressBookPeerTag, ShareRule } from './entities';
import { AddPeerDto, UpdatePeerDto, AddTagDto, UpdateTagDto, RenameTagDto, PaginationDto, PeersQueryDto } from './dto';
import { Sysinfo, Peer } from '../../common/entities';
import { User } from '../user/entities/user.entity';

@Injectable()
export class AddressBookService {
  constructor(
    @InjectRepository(AddressBook)
    private addressBookRepository: Repository<AddressBook>,
    @InjectRepository(AddressBookPeer)
    private addressBookPeerRepository: Repository<AddressBookPeer>,
    @InjectRepository(AddressBookTag)
    private addressBookTagRepository: Repository<AddressBookTag>,
    @InjectRepository(AddressBookShare)
    private addressBookShareRepository: Repository<AddressBookShare>,
    @InjectRepository(AddressBookPeerTag)
    private addressBookPeerTagRepository: Repository<AddressBookPeerTag>,
    @InjectRepository(Sysinfo)
    private sysinfoRepository: Repository<Sysinfo>,
    @InjectRepository(Peer)
    private peerRepository: Repository<Peer>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
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

  // 获取共享地址簿列表
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

    const [peers, total] = await this.addressBookPeerRepository.findAndCount({
      where: { addressBookGuid: ab },
      relations: ['tags'],
      skip,
      take: pageSize,
    });

    // 获取所有设备ID (uuid)，用于从 peers 表和 sysinfos 表获取信息
    const deviceIds = peers.map(p => p.deviceId);
    
    // 从 peers 表获取 RustDesk ID
    const peerRecords = deviceIds.length > 0
      ? await this.peerRepository.find({
          where: { uuid: In(deviceIds) },
        })
      : [];
    const peerMap = new Map(peerRecords.map(p => [p.uuid, p]));

    // 从 sysinfos 表获取设备信息
    const sysinfos = deviceIds.length > 0
      ? await this.sysinfoRepository.find({
          where: { uuid: In(deviceIds) },
        })
      : [];
    const sysinfoMap = new Map(sysinfos.map(s => [s.uuid, s]));

    const data = peers.map(p => {
      const peerRecord = peerMap.get(p.deviceId);
      const sysinfo = sysinfoMap.get(p.deviceId);
      return {
        id: peerRecord?.id || '',  // 返回 RustDesk ID
        hash: p.hash,
        password: p.password,
        username: sysinfo?.username || '',
        hostname: sysinfo?.hostname || '',
        platform: sysinfo?.os || '',
        alias: p.alias,
        tags: p.tags?.map(t => t.name) || [],
        note: p.note,
      };
    });

    return { total, data };
  }

  // 获取地址簿标签列表
  async getTags(addressBookGuid: string, userId?: string) {
    // 如果提供了用户ID，验证访问权限
    if (userId) {
      await this.checkAddressBookAccess(addressBookGuid, userId, ShareRule.READ);
    }

    const tags = await this.addressBookTagRepository.find({
      where: { addressBookGuid },
    });

    return tags.map(t => ({
      name: t.name,
      color: t.color,
    }));
  }

  // 添加设备到地址簿
  async addPeer(addressBookGuid: string, dto: AddPeerDto, userId?: string) {
    // 如果提供了用户ID，验证写权限
    if (userId) {
      await this.checkAddressBookAccess(addressBookGuid, userId, ShareRule.READ_WRITE);
    }

    const addressBook = await this.addressBookRepository.findOne({
      where: { guid: addressBookGuid },
    });

    if (!addressBook) {
      throw new NotFoundException('地址簿不存在');
    }

    // 通过客户端发送的 id 查找 peers 表获取 uuid (deviceId)
    const peerRecord = await this.peerRepository.findOne({
      where: { id: dto.id },
    });

    if (!peerRecord) {
      throw new NotFoundException('设备不存在');
    }

    const deviceId = peerRecord.uuid;

    // 检查设备是否已存在于地址簿
    const existingPeer = await this.addressBookPeerRepository.findOne({
      where: { deviceId, addressBookGuid },
    });

    if (existingPeer) {
      throw new BadRequestException('设备已存在于地址簿中');
    }

    const peerGuid = uuidv4();
    const peer = this.addressBookPeerRepository.create({
      guid: peerGuid,
      addressBookGuid,
      deviceId,
      hash: dto.hash,
      password: dto.password,
      alias: dto.alias,
      note: dto.note,
    });

    await this.addressBookPeerRepository.save(peer);

    // 处理标签关联 - dto.tags 是标签名称数组
    if (dto.tags && dto.tags.length > 0) {
      for (const tagName of dto.tags) {
        // 查找或创建标签
        let tag = await this.addressBookTagRepository.findOne({
          where: { name: tagName, addressBookGuid },
        });

        if (!tag) {
          tag = this.addressBookTagRepository.create({
            guid: uuidv4(),
            addressBookGuid,
            name: tagName,
            color: 0,
          });
          await this.addressBookTagRepository.save(tag);
        }

        const peerTag = this.addressBookPeerTagRepository.create({
          peerGuid,
          tagGuid: tag.guid,
        });
        await this.addressBookPeerTagRepository.save(peerTag);
      }
    }

    return {};
  }

  // 更新设备信息
  async updatePeer(addressBookGuid: string, dto: UpdatePeerDto, userId?: string) {
    // 如果提供了用户ID，验证写权限
    if (userId) {
      await this.checkAddressBookAccess(addressBookGuid, userId, ShareRule.READ_WRITE);
    }

    // 通过客户端发送的 id 查找 peers 表获取 uuid (deviceId)
    const peerRecord = await this.peerRepository.findOne({
      where: { id: dto.id },
    });

    if (!peerRecord) {
      throw new NotFoundException('设备不存在');
    }

    const deviceId = peerRecord.uuid;

    // 根据 deviceId 查找地址簿中的设备
    const peer = await this.addressBookPeerRepository.findOne({
      where: { deviceId, addressBookGuid },
    });

    if (!peer) {
      throw new NotFoundException('设备不存在于此地址簿');
    }

    const updateData: Partial<AddressBookPeer> = {};

    if (dto.hash !== undefined) updateData.hash = dto.hash;
    if (dto.password !== undefined) updateData.password = dto.password;
    if (dto.alias !== undefined) updateData.alias = dto.alias;
    if (dto.note !== undefined) updateData.note = dto.note;

    await this.addressBookPeerRepository.update({ guid: peer.guid }, updateData);

    // 更新标签关联 - dto.tags 是标签名称数组
    if (dto.tags !== undefined) {
      // 删除旧的标签关联
      await this.addressBookPeerTagRepository.delete({ peerGuid: peer.guid });

      // 添加新的标签关联
      if (dto.tags.length > 0) {
        for (const tagName of dto.tags) {
          // 查找或创建标签
          let tag = await this.addressBookTagRepository.findOne({
            where: { name: tagName, addressBookGuid },
          });

          if (!tag) {
            tag = this.addressBookTagRepository.create({
              guid: uuidv4(),
              addressBookGuid,
              name: tagName,
              color: 0,
            });
            await this.addressBookTagRepository.save(tag);
          }

          const peerTag = this.addressBookPeerTagRepository.create({
            peerGuid: peer.guid,
            tagGuid: tag.guid,
          });
          await this.addressBookPeerTagRepository.save(peerTag);
        }
      }
    }

    return {};
  }

  // 删除设备
  async deletePeers(addressBookGuid: string, ids: string[], userId?: string) {
    // 如果提供了用户ID，验证写权限
    if (userId) {
      await this.checkAddressBookAccess(addressBookGuid, userId, ShareRule.READ_WRITE);
    }

    if (!ids || ids.length === 0) {
      throw new BadRequestException('请提供要删除的设备ID');
    }

    // ids 是 RustDesk ID 数组，需要先查找对应的 uuid
    const peerRecords = await this.peerRepository.find({
      where: { id: In(ids) },
    });

    const deviceIds = peerRecords.map(p => p.uuid);

    if (deviceIds.length > 0) {
      // 根据 deviceId 删除
      await this.addressBookPeerRepository.delete({
        deviceId: In(deviceIds),
        addressBookGuid,
      });
    }

    return {};
  }

  // 添加标签
  async addTag(addressBookGuid: string, dto: AddTagDto, userId?: string) {
    // 如果提供了用户ID，验证写权限
    if (userId) {
      await this.checkAddressBookAccess(addressBookGuid, userId, ShareRule.READ_WRITE);
    }

    const addressBook = await this.addressBookRepository.findOne({
      where: { guid: addressBookGuid },
    });

    if (!addressBook) {
      throw new NotFoundException('地址簿不存在');
    }

    const existingTag = await this.addressBookTagRepository.findOne({
      where: { name: dto.name, addressBookGuid },
    });

    if (existingTag) {
      throw new BadRequestException('标签已存在');
    }

    const tag = this.addressBookTagRepository.create({
      guid: uuidv4(),
      addressBookGuid,
      name: dto.name,
      color: dto.color || 0,
    });

    await this.addressBookTagRepository.save(tag);
    return {};
  }

  // 重命名标签
  async renameTag(addressBookGuid: string, dto: RenameTagDto, userId?: string) {
    // 如果提供了用户ID，验证写权限
    if (userId) {
      await this.checkAddressBookAccess(addressBookGuid, userId, ShareRule.READ_WRITE);
    }

    // 根据旧标签名查找标签
    const tag = await this.addressBookTagRepository.findOne({
      where: { name: dto.old, addressBookGuid },
    });

    if (!tag) {
      throw new NotFoundException('标签不存在');
    }

    const existingTag = await this.addressBookTagRepository.findOne({
      where: { name: dto.new, addressBookGuid },
    });

    if (existingTag) {
      throw new BadRequestException('新标签名已存在');
    }

    await this.addressBookTagRepository.update({ guid: tag.guid }, { name: dto.new });
    return {};
  }

  // 更新标签颜色
  async updateTag(addressBookGuid: string, dto: UpdateTagDto, userId?: string) {
    // 如果提供了用户ID，验证写权限
    if (userId) {
      await this.checkAddressBookAccess(addressBookGuid, userId, ShareRule.READ_WRITE);
    }

    // 根据标签名查找标签
    const tag = await this.addressBookTagRepository.findOne({
      where: { name: dto.name, addressBookGuid },
    });

    if (!tag) {
      throw new NotFoundException('标签不存在');
    }

    await this.addressBookTagRepository.update({ guid: tag.guid }, { color: dto.color });
    return {};
  }

  // 删除标签
  async deleteTags(addressBookGuid: string, names: string[], userId?: string) {
    // 如果提供了用户ID，验证写权限
    if (userId) {
      await this.checkAddressBookAccess(addressBookGuid, userId, ShareRule.READ_WRITE);
    }

    if (!names || names.length === 0) {
      throw new BadRequestException('请提供要删除的标签名');
    }

    // 获取要删除的标签GUID
    const tags = await this.addressBookTagRepository.find({
      where: { name: In(names), addressBookGuid },
    });

    const tagGuids = tags.map(t => t.guid);

    // 删除标签关联
    if (tagGuids.length > 0) {
      await this.addressBookPeerTagRepository.delete({
        tagGuid: In(tagGuids),
      });
    }

    // 删除标签
    await this.addressBookTagRepository.delete({
      name: In(names),
      addressBookGuid,
    });

    return {};
  }

  /**
   * 共享地址簿给其他用户
   */
  async shareAddressBook(
    addressBookGuid: string,
    targetUserId: string,
    rule: ShareRule,
    ownerUserId: string,
  ) {
    // 验证所有权
    await this.checkAddressBookAccess(addressBookGuid, ownerUserId, ShareRule.FULL_CONTROL);

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
  async unshareAddressBook(addressBookGuid: string, targetUserId: string, ownerUserId: string) {
    // 验证所有权
    await this.checkAddressBookAccess(addressBookGuid, ownerUserId, ShareRule.FULL_CONTROL);

    await this.addressBookShareRepository.delete({
      addressBookGuid,
      sharedWithUserId: targetUserId,
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
      });
      await this.addressBookRepository.save(addressBook);
    }

    // 获取所有标签
    const tags = await this.addressBookTagRepository.find({
      where: { addressBookGuid: addressBook.guid },
    });

    // 获取所有设备及其标签
    const peers = await this.addressBookPeerRepository.find({
      where: { addressBookGuid: addressBook.guid },
      relations: ['tags'],
    });

    // 获取所有设备ID，用于从sysinfos表获取信息
    const deviceIds = peers.map(p => p.deviceId);
    const sysinfos = deviceIds.length > 0
      ? await this.sysinfoRepository.find({
          where: { uuid: In(deviceIds) },
        })
      : [];

    const sysinfoMap = new Map(sysinfos.map(s => [s.uuid, s]));

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
    const peersData = peers.map(p => {
      const sysinfo = sysinfoMap.get(p.deviceId);
      return {
        id: p.deviceId,
        hash: p.hash || '',
        username: sysinfo?.username || '',
        hostname: sysinfo?.hostname || '',
        platform: sysinfo?.os || '',
        alias: p.alias || '',
        tags: p.tags?.map(t => t.name) || [],
      };
    });

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
      });
      await this.addressBookRepository.save(addressBook);
    }

    const addressBookGuid = addressBook.guid;

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
    await this.addressBookPeerTagRepository.delete({});
    await this.addressBookTagRepository.delete({ addressBookGuid });
    await this.addressBookPeerRepository.delete({ addressBookGuid });

    // 创建新标签
    const tagNameToGuid: Record<string, string> = {};
    if (parsedData.tags && parsedData.tags.length > 0) {
      for (const tagName of parsedData.tags) {
        const tagGuid = uuidv4();
        const tag = this.addressBookTagRepository.create({
          guid: tagGuid,
          addressBookGuid,
          name: tagName,
          color: tagColors[tagName] || 0,
        });
        await this.addressBookTagRepository.save(tag);
        tagNameToGuid[tagName] = tagGuid;
      }
    }

    // 创建新设备
    if (parsedData.peers && parsedData.peers.length > 0) {
      for (const peerData of parsedData.peers) {
        const peerGuid = uuidv4();
        const peer = this.addressBookPeerRepository.create({
          guid: peerGuid,
          addressBookGuid,
          deviceId: peerData.id,
          hash: peerData.hash || '',
          alias: peerData.alias || '',
        });
        await this.addressBookPeerRepository.save(peer);

        // 处理标签关联
        if (peerData.tags && peerData.tags.length > 0) {
          for (const tagName of peerData.tags) {
            const tagGuid = tagNameToGuid[tagName];
            if (tagGuid) {
              const peerTag = this.addressBookPeerTagRepository.create({
                peerGuid,
                tagGuid,
              });
              await this.addressBookPeerTagRepository.save(peerTag);
            }
          }
        }
      }
    }

    return 'null';
  }
}
