import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
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
  async getPeers(query: PeersQueryDto) {
    const { current = 1, pageSize = 100, ab } = query;
    const skip = (current - 1) * pageSize;

    const addressBook = await this.addressBookRepository.findOne({
      where: { guid: ab },
    });

    if (!addressBook) {
      throw new NotFoundException('地址簿不存在');
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
  async getTags(guid: string) {
    const tags = await this.abTagRepository.find({
      where: { abGuid: guid },
    });

    return tags.map(t => ({
      name: t.name,
      color: t.color,
    }));
  }

  // 添加设备到地址簿
  async addPeer(guid: string, dto: AddPeerDto) {
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
  async updatePeer(guid: string, dto: UpdatePeerDto) {
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
  async deletePeers(guid: string, ids: string[]) {
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
  async addTag(guid: string, dto: AddTagDto) {
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
  async renameTag(guid: string, dto: RenameTagDto) {
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
  async updateTag(guid: string, dto: UpdateTagDto) {
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
  async deleteTags(guid: string, names: string[]) {
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
}
