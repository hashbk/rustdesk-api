import { Controller, Get, Post, Put, Delete, Param, Body, Query, HttpCode, HttpStatus } from '@nestjs/common';
import { AddressBookService } from './address-book.service';
import { AddPeerDto, UpdatePeerDto, AddTagDto, UpdateTagDto, RenameTagDto, PaginationDto, PeersQueryDto } from './dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ShareRule } from './entities/shared-address-book.entity';

@Controller('ab')
export class AddressBookController {
  constructor(private readonly addressBookService: AddressBookService) {}

  // ============ 旧版（Legacy）API ============

  /**
   * 获取旧版地址簿
   * GET /api/ab
   */
  @Get()
  async getLegacyAddressBook(@CurrentUser('id') userId: number) {
    return this.addressBookService.getLegacyAddressBook(String(userId));
  }

  /**
   * 更新旧版地址簿
   * POST /api/ab
   */
  @Post()
  @HttpCode(HttpStatus.OK)
  async updateLegacyAddressBook(
    @Body('data') data: string,
    @CurrentUser('id') userId: number,
  ) {
    return this.addressBookService.updateLegacyAddressBook(String(userId), data);
  }

  // ============ 新版 API ============

  // 获取地址簿设置
  @Post('settings')
  @HttpCode(HttpStatus.OK)
  getSettings() {
    return this.addressBookService.getSettings();
  }

  // 获取个人地址簿GUID
  @Post('personal')
  @HttpCode(HttpStatus.OK)
  getPersonalAddressBook(@CurrentUser('id') userId: number) {
    return this.addressBookService.getPersonalAddressBook(String(userId));
  }

  // 获取共享地址簿列表
  @Post('shared/profiles')
  @HttpCode(HttpStatus.OK)
  getSharedAddressBooks(@Query() query: PaginationDto, @CurrentUser('id') userId: number) {
    return this.addressBookService.getSharedAddressBooks(String(userId), query);
  }

  // 获取地址簿中的设备列表
  @Post('peers')
  @HttpCode(HttpStatus.OK)
  getPeers(@Query() query: PeersQueryDto, @CurrentUser('id') userId: number) {
    return this.addressBookService.getPeers(query, String(userId));
  }

  // 获取地址簿标签列表
  @Post('tags/:guid')
  @HttpCode(HttpStatus.OK)
  getTags(@Param('guid') guid: string, @CurrentUser('id') userId: number) {
    return this.addressBookService.getTags(guid, String(userId));
  }

  // 添加设备到地址簿
  @Post('peer/add/:guid')
  @HttpCode(HttpStatus.OK)
  addPeer(@Param('guid') guid: string, @Body() dto: AddPeerDto, @CurrentUser('id') userId: number) {
    return this.addressBookService.addPeer(guid, dto, String(userId));
  }

  // 更新设备信息
  @Put('peer/update/:guid')
  @HttpCode(HttpStatus.OK)
  updatePeer(@Param('guid') guid: string, @Body() dto: UpdatePeerDto, @CurrentUser('id') userId: number) {
    return this.addressBookService.updatePeer(guid, dto, String(userId));
  }

  // 删除设备
  @Delete('peer/:guid')
  @HttpCode(HttpStatus.OK)
  deletePeers(@Param('guid') guid: string, @Body() ids: string[], @CurrentUser('id') userId: number) {
    return this.addressBookService.deletePeers(guid, ids, String(userId));
  }

  // 添加标签
  @Post('tag/add/:guid')
  @HttpCode(HttpStatus.OK)
  addTag(@Param('guid') guid: string, @Body() dto: AddTagDto, @CurrentUser('id') userId: number) {
    return this.addressBookService.addTag(guid, dto, String(userId));
  }

  // 重命名标签
  @Put('tag/rename/:guid')
  @HttpCode(HttpStatus.OK)
  renameTag(@Param('guid') guid: string, @Body() dto: RenameTagDto, @CurrentUser('id') userId: number) {
    return this.addressBookService.renameTag(guid, dto, String(userId));
  }

  // 更新标签颜色
  @Put('tag/update/:guid')
  @HttpCode(HttpStatus.OK)
  updateTag(@Param('guid') guid: string, @Body() dto: UpdateTagDto, @CurrentUser('id') userId: number) {
    return this.addressBookService.updateTag(guid, dto, String(userId));
  }

  // 删除标签
  @Delete('tag/:guid')
  @HttpCode(HttpStatus.OK)
  deleteTags(@Param('guid') guid: string, @Body() names: string[], @CurrentUser('id') userId: number) {
    return this.addressBookService.deleteTags(guid, names, String(userId));
  }

  // 共享地址簿
  @Post('share/:guid')
  shareAddressBook(
    @Param('guid') guid: string,
    @Body('targetUserId') targetUserId: string,
    @Body('rule') rule: ShareRule,
    @CurrentUser('id') userId: number,
  ) {
    return this.addressBookService.shareAddressBook(guid, targetUserId, rule, String(userId));
  }

  // 取消共享地址簿
  @Delete('share/:guid')
  unshareAddressBook(
    @Param('guid') guid: string,
    @Body('targetUserId') targetUserId: string,
    @CurrentUser('id') userId: number,
  ) {
    return this.addressBookService.unshareAddressBook(guid, targetUserId, String(userId));
  }
}
