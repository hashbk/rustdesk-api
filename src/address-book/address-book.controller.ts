import { Controller, Get, Post, Put, Delete, Param, Body, Query, Req } from '@nestjs/common';
import { AddressBookService } from './address-book.service';
import { AddPeerDto, UpdatePeerDto, DeletePeersDto, AddTagDto, UpdateTagDto, RenameTagDto, DeleteTagsDto, PaginationDto, PeersQueryDto } from './dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('ab')
export class AddressBookController {
  constructor(private readonly addressBookService: AddressBookService) {}

  // 获取地址簿设置
  @Post('settings')
  getSettings() {
    return this.addressBookService.getSettings();
  }

  // 获取个人地址簿GUID
  @Post('personal')
  getPersonalAddressBook(@CurrentUser('id') userId: number) {
    return this.addressBookService.getPersonalAddressBook(String(userId));
  }

  // 获取共享地址簿列表
  @Post('shared/profiles')
  getSharedAddressBooks(@Query() query: PaginationDto, @CurrentUser('id') userId: number) {
    return this.addressBookService.getSharedAddressBooks(String(userId), query);
  }

  // 获取地址簿中的设备列表
  @Post('peers')
  getPeers(@Query() query: PeersQueryDto) {
    return this.addressBookService.getPeers(query);
  }

  // 获取地址簿标签列表
  @Post('tags/:guid')
  getTags(@Param('guid') guid: string) {
    return this.addressBookService.getTags(guid);
  }

  // 添加设备到地址簿
  @Post('peer/add/:guid')
  addPeer(@Param('guid') guid: string, @Body() dto: AddPeerDto) {
    return this.addressBookService.addPeer(guid, dto);
  }

  // 更新设备信息
  @Put('peer/update/:guid')
  updatePeer(@Param('guid') guid: string, @Body() dto: UpdatePeerDto) {
    return this.addressBookService.updatePeer(guid, dto);
  }

  // 删除设备
  @Delete('peer/:guid')
  deletePeers(@Param('guid') guid: string, @Body() ids: string[]) {
    return this.addressBookService.deletePeers(guid, ids);
  }

  // 添加标签
  @Post('tag/add/:guid')
  addTag(@Param('guid') guid: string, @Body() dto: AddTagDto) {
    return this.addressBookService.addTag(guid, dto);
  }

  // 重命名标签
  @Put('tag/rename/:guid')
  renameTag(@Param('guid') guid: string, @Body() dto: RenameTagDto) {
    return this.addressBookService.renameTag(guid, dto);
  }

  // 更新标签颜色
  @Put('tag/update/:guid')
  updateTag(@Param('guid') guid: string, @Body() dto: UpdateTagDto) {
    return this.addressBookService.updateTag(guid, dto);
  }

  // 删除标签
  @Delete('tag/:guid')
  deleteTags(@Param('guid') guid: string, @Body() names: string[]) {
    return this.addressBookService.deleteTags(guid, names);
  }
}
