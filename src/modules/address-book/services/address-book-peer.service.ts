import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { AddressBook, AddressBookPeer, AddressBookPeerTag, ShareRule } from '../entities';
import { AddPeerDto, UpdatePeerDto, PeersQueryDto } from '../dto';
import { Sysinfo, Peer } from '../../../common/entities';

@Injectable()
export class AddressBookPeerService {
  constructor(
    @InjectRepository(AddressBook)
    private addressBookRepository: Repository<AddressBook>,
    @InjectRepository(AddressBookPeer)
    private addressBookPeerRepository: Repository<AddressBookPeer>,
    @InjectRepository(AddressBookPeerTag)
    private addressBookPeerTagRepository: Repository<AddressBookPeerTag>,
    @InjectRepository(Sysinfo)
    private sysinfoRepository: Repository<Sysinfo>,
    @InjectRepository(Peer)
    private peerRepository: Repository<Peer>,
  ) {}

  /**
   * 获取地址簿中的设备列表
   */
  async getPeers(query: PeersQueryDto, userId?: string, checkAccess?: (ab: string, userId: string, rule: ShareRule) => Promise<AddressBook>) {
    const { current = 1, pageSize = 100, ab } = query;
    const skip = (current - 1) * pageSize;

    const addressBook = await this.addressBookRepository.findOne({
      where: { guid: ab },
    });

    if (!addressBook) {
      throw new NotFoundException('地址簿不存在');
    }

    // 如果提供了用户ID，验证访问权限
    if (userId && checkAccess) {
      await checkAccess(ab, userId, ShareRule.READ);
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

  /**
   * 添加设备到地址簿
   */
  async addPeer(
    addressBookGuid: string,
    dto: AddPeerDto,
    userId?: string,
    checkAccess?: (ab: string, userId: string, rule: ShareRule) => Promise<AddressBook>,
    getOrCreateTag?: (addressBookGuid: string, tagName: string) => Promise<string>,
  ) {
    // 如果提供了用户ID，验证写权限
    if (userId && checkAccess) {
      await checkAccess(addressBookGuid, userId, ShareRule.READ_WRITE);
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
    if (dto.tags && dto.tags.length > 0 && getOrCreateTag) {
      for (const tagName of dto.tags) {
        const tagGuid = await getOrCreateTag(addressBookGuid, tagName);
        const peerTag = this.addressBookPeerTagRepository.create({
          peerGuid,
          tagGuid,
        });
        await this.addressBookPeerTagRepository.save(peerTag);
      }
    }

    return {};
  }

  /**
   * 更新设备信息
   */
  async updatePeer(
    addressBookGuid: string,
    dto: UpdatePeerDto,
    userId?: string,
    checkAccess?: (ab: string, userId: string, rule: ShareRule) => Promise<AddressBook>,
    getOrCreateTag?: (addressBookGuid: string, tagName: string) => Promise<string>,
  ) {
    // 如果提供了用户ID，验证写权限
    if (userId && checkAccess) {
      await checkAccess(addressBookGuid, userId, ShareRule.READ_WRITE);
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
      if (dto.tags.length > 0 && getOrCreateTag) {
        for (const tagName of dto.tags) {
          const tagGuid = await getOrCreateTag(addressBookGuid, tagName);
          const peerTag = this.addressBookPeerTagRepository.create({
            peerGuid: peer.guid,
            tagGuid,
          });
          await this.addressBookPeerTagRepository.save(peerTag);
        }
      }
    }

    return {};
  }

  /**
   * 删除设备
   */
  async deletePeers(
    addressBookGuid: string,
    ids: string[],
    userId?: string,
    checkAccess?: (ab: string, userId: string, rule: ShareRule) => Promise<AddressBook>,
  ) {
    // 如果提供了用户ID，验证写权限
    if (userId && checkAccess) {
      await checkAccess(addressBookGuid, userId, ShareRule.READ_WRITE);
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
}
