import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { AddressBook, AddressBookTag, AddressBookPeerTag, ShareRule } from '../entities';
import { AddTagDto, UpdateTagDto, RenameTagDto } from '../dto';

@Injectable()
export class AddressBookTagService {
  constructor(
    @InjectRepository(AddressBook)
    private addressBookRepository: Repository<AddressBook>,
    @InjectRepository(AddressBookTag)
    private addressBookTagRepository: Repository<AddressBookTag>,
    @InjectRepository(AddressBookPeerTag)
    private addressBookPeerTagRepository: Repository<AddressBookPeerTag>,
  ) {}

  /**
   * 获取地址簿标签列表
   */
  async getTags(
    addressBookGuid: string,
    userId?: string,
    checkAccess?: (ab: string, userId: string, rule: ShareRule) => Promise<AddressBook>,
  ) {
    // 如果提供了用户ID，验证访问权限
    if (userId && checkAccess) {
      await checkAccess(addressBookGuid, userId, ShareRule.READ);
    }

    const tags = await this.addressBookTagRepository.find({
      where: { addressBookGuid },
    });

    return tags.map(t => ({
      name: t.name,
      color: t.color,
    }));
  }

  /**
   * 获取或创建标签，返回标签GUID
   */
  async getOrCreateTag(addressBookGuid: string, tagName: string): Promise<string> {
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

    return tag.guid;
  }

  /**
   * 添加标签
   */
  async addTag(
    addressBookGuid: string,
    dto: AddTagDto,
    userId?: string,
    checkAccess?: (ab: string, userId: string, rule: ShareRule) => Promise<AddressBook>,
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

  /**
   * 重命名标签
   */
  async renameTag(
    addressBookGuid: string,
    dto: RenameTagDto,
    userId?: string,
    checkAccess?: (ab: string, userId: string, rule: ShareRule) => Promise<AddressBook>,
  ) {
    // 如果提供了用户ID，验证写权限
    if (userId && checkAccess) {
      await checkAccess(addressBookGuid, userId, ShareRule.READ_WRITE);
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

  /**
   * 更新标签颜色
   */
  async updateTag(
    addressBookGuid: string,
    dto: UpdateTagDto,
    userId?: string,
    checkAccess?: (ab: string, userId: string, rule: ShareRule) => Promise<AddressBook>,
  ) {
    // 如果提供了用户ID，验证写权限
    if (userId && checkAccess) {
      await checkAccess(addressBookGuid, userId, ShareRule.READ_WRITE);
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

  /**
   * 删除标签
   */
  async deleteTags(
    addressBookGuid: string,
    names: string[],
    userId?: string,
    checkAccess?: (ab: string, userId: string, rule: ShareRule) => Promise<AddressBook>,
  ) {
    // 如果提供了用户ID，验证写权限
    if (userId && checkAccess) {
      await checkAccess(addressBookGuid, userId, ShareRule.READ_WRITE);
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
}
