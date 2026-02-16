import { Controller, Get, Post, Put, Delete, Param } from '@nestjs/common';

@Controller('ab')
export class AddressBookController {
  @Get()
  getAddressList() {
    return { message: '获取地址列表接口' };
  }

  @Post()
  updateAddress() {
    return { message: '地址更新接口' };
  }

  @Post('peer/add/:guid')
  addAddress(@Param('guid') guid: string) {
    return { message: `添加地址接口，GUID: ${guid}` };
  }

  @Delete('peer/add/:guid')
  deleteAddress(@Param('guid') guid: string) {
    return { message: `删除地址接口，GUID: ${guid}` };
  }

  @Put('peer/update/:guid')
  updateAddressByGuid(@Param('guid') guid: string) {
    return { message: `更新地址接口，GUID: ${guid}` };
  }

  @Post('peers')
  getAddressListByPost() {
    return { message: 'POST 方式获取地址列表接口' };
  }

  @Post('personal')
  getPersonalAddress() {
    return { message: '获取个人地址接口' };
  }

  @Post('settings')
  setAddressBookSettings() {
    return { message: '地址簿设置接口' };
  }

  @Post('shared/profiles')
  getSharedAddressBook() {
    return { message: '获取共享地址簿接口' };
  }

  @Post('tag/add/:guid')
  addTag(@Param('guid') guid: string) {
    return { message: `添加标签接口，GUID: ${guid}` };
  }

  @Put('tag/rename/:guid')
  renameTag(@Param('guid') guid: string) {
    return { message: `标签重命名接口，GUID: ${guid}` };
  }

  @Put('tag/update/:guid')
  updateTagColor(@Param('guid') guid: string) {
    return { message: `标签修改颜色接口，GUID: ${guid}` };
  }

  @Delete('tag/:guid')
  deleteTag(@Param('guid') guid: string) {
    return { message: `删除标签接口，GUID: ${guid}` };
  }

  @Post('tags/:guid')
  getTag(@Param('guid') guid: string) {
    return { message: `获取标签接口，GUID: ${guid}` };
  }
}
