import { Controller, Get, Post, Put, Delete, Param, Body, Query, HttpCode, HttpStatus } from '@nestjs/common';
import { AddressBookService } from './services';
import { AddPeerDto, UpdatePeerDto, AddTagDto, UpdateTagDto, RenameTagDto, PaginationDto, PeersQueryDto } from './dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

/**
 * 地址簿控制器
 * 负责处理地址簿相关的HTTP请求，包括地址簿管理、设备管理和标签管理
 *
 * 端点数量：15个
 *
 * 旧版API（兼容性）：
 * - GET /api/ab - 获取旧版地址簿
 * - POST /api/ab - 更新旧版地址簿
 *
 * 新版API：
 * - POST /api/ab/settings - 获取地址簿设置
 * - POST /api/ab/personal - 获取个人地址簿GUID
 * - POST /api/ab/shared/profiles - 获取共享地址簿列表
 * - POST /api/ab/peers - 获取地址簿中的设备列表
 * - POST /api/ab/tags/{guid} - 获取地址簿标签列表
 * - POST /api/ab/peer/add/{guid} - 添加设备到地址簿
 * - PUT /api/ab/peer/update/{guid} - 更新设备信息
 * - DELETE /api/ab/peer/{guid} - 删除设备
 * - POST /api/ab/tag/add/{guid} - 添加标签
 * - PUT /api/ab/tag/rename/{guid} - 重命名标签
 * - PUT /api/ab/tag/update/{guid} - 更新标签颜色
 * - DELETE /api/ab/tag/{guid} - 删除标签
 */
@Controller('ab')
export class AddressBookController {
  constructor(private readonly addressBookService: AddressBookService) {}

  // ============ 旧版（Legacy）API ============

  /**
   * 获取旧版地址簿
   * 获取用户的旧版地址簿数据（兼容性接口）
   *
   * @param userId 当前用户ID（从JWT令牌中提取）
   * @returns 旧版地址簿的JSON字符串
   */
  @Get()
  async getLegacyAddressBook(@CurrentUser('id') userId: number) {
    return this.addressBookService.getLegacyAddressBook(String(userId));
  }

  /**
   * 更新旧版地址簿
   * 更新用户的旧版地址簿数据（兼容性接口）
   *
   * @param data 地址簿数据的JSON字符串
   * @param userId 当前用户ID（从JWT令牌中提取）
   * @returns 更新成功返回地址簿数据，失败返回错误信息
   */
  @Post()
  @HttpCode(HttpStatus.OK)
  async updateLegacyAddressBook(
    @Body('data') data: string,
    @CurrentUser('id') userId: number,
  ) {
    try {
      return await this.addressBookService.updateLegacyAddressBook(String(userId), data);
    } catch (e) {
      return { error: e.message };
    }
  }

  // ============ 新版 API ============

  /**
   * 获取地址簿设置
   * 获取地址簿的全局设置信息
   *
   * @returns 地址簿设置对象
   */
  @Post('settings')
  @HttpCode(HttpStatus.OK)
  getSettings() {
    return this.addressBookService.getSettings();
  }

  /**
   * 获取个人地址簿GUID
   * 获取当前用户的个人地址簿的唯一标识符
   *
   * @param userId 当前用户ID（从JWT令牌中提取）
   * @returns 个人地址簿的GUID
   */
  @Post('personal')
  @HttpCode(HttpStatus.OK)
  getPersonalAddressBook(@CurrentUser('id') userId: number) {
    return this.addressBookService.getPersonalAddressBook(String(userId));
  }

  /**
   * 获取共享地址簿列表
   * 获取当前用户可访问的所有共享地址簿列表
   *
   * @param query 分页查询参数
   * @param userId 当前用户ID（从JWT令牌中提取）
   * @returns 共享地址簿列表（分页）
   */
  @Post('shared/profiles')
  @HttpCode(HttpStatus.OK)
  getSharedAddressBooks(@Query() query: PaginationDto, @CurrentUser('id') userId: number) {
    return this.addressBookService.getSharedAddressBooks(String(userId), query);
  }

  /**
   * 获取地址簿中的设备列表
   * 获取指定地址簿中的所有设备信息
   *
   * @param query 查询参数（包含标签、搜索关键词等）
   * @param userId 当前用户ID（从JWT令牌中提取）
   * @returns 设备列表
   */
  @Post('peers')
  @HttpCode(HttpStatus.OK)
  getPeers(@Query() query: PeersQueryDto, @CurrentUser('id') userId: number) {
    return this.addressBookService.getPeers(query, String(userId));
  }

  /**
   * 获取地址簿标签列表
   * 获取指定地址簿中的所有标签
   *
   * @param guid 地址簿GUID
   * @param userId 当前用户ID（从JWT令牌中提取）
   * @returns 标签列表
   * @throws NotFoundException 地址簿不存在
   * @throws ForbiddenException 无权限访问该地址簿
   */
  @Post('tags/:guid')
  @HttpCode(HttpStatus.OK)
  getTags(@Param('guid') guid: string, @CurrentUser('id') userId: number) {
    return this.addressBookService.getTags(guid, String(userId));
  }

  /**
   * 添加设备到地址簿
   * 向指定地址簿添加新的设备
   *
   * @param guid 地址簿GUID
   * @param dto 设备信息数据传输对象
   * @param userId 当前用户ID（从JWT令牌中提取）
   * @returns 添加成功返回空字符串，失败返回错误信息
   * @throws NotFoundException 地址簿不存在
   * @throws ForbiddenException 无权限修改该地址簿
   */
  @Post('peer/add/:guid')
  @HttpCode(HttpStatus.OK)
  async addPeer(@Param('guid') guid: string, @Body() dto: AddPeerDto, @CurrentUser('id') userId: number) {
    try {
      await this.addressBookService.addPeer(guid, dto, String(userId));
      return '';
    } catch (e) {
      return { error: e.message };
    }
  }

  /**
   * 更新设备信息
   * 更新指定地址簿中的设备信息
   *
   * @param guid 地址簿GUID
   * @param dto 设备更新信息数据传输对象
   * @param userId 当前用户ID（从JWT令牌中提取）
   * @returns 更新成功返回空字符串，失败返回错误信息
   * @throws NotFoundException 地址簿或设备不存在
   * @throws ForbiddenException 无权限修改该地址簿
   */
  @Put('peer/update/:guid')
  @HttpCode(HttpStatus.OK)
  async updatePeer(@Param('guid') guid: string, @Body() dto: UpdatePeerDto, @CurrentUser('id') userId: number) {
    try {
      await this.addressBookService.updatePeer(guid, dto, String(userId));
      return '';
    } catch (e) {
      return { error: e.message };
    }
  }

  /**
   * 删除设备
   * 从指定地址簿中删除一个或多个设备
   *
   * @param guid 地址簿GUID
   * @param ids 要删除的设备ID数组
   * @param userId 当前用户ID（从JWT令牌中提取）
   * @returns 删除成功返回空字符串，失败返回错误信息
   * @throws NotFoundException 地址簿不存在
   * @throws ForbiddenException 无权限修改该地址簿
   */
  @Delete('peer/:guid')
  @HttpCode(HttpStatus.OK)
  async deletePeers(@Param('guid') guid: string, @Body() ids: string[], @CurrentUser('id') userId: number) {
    try {
      await this.addressBookService.deletePeers(guid, ids, String(userId));
      return '';
    } catch (e) {
      return { error: e.message };
    }
  }

  /**
   * 添加标签
   * 向指定地址簿添加新的标签
   *
   * @param guid 地址簿GUID
   * @param dto 标签信息数据传输对象
   * @param userId 当前用户ID（从JWT令牌中提取）
   * @returns 添加成功返回空字符串，失败返回错误信息
   * @throws NotFoundException 地址簿不存在
   * @throws ForbiddenException 无权限修改该地址簿
   */
  @Post('tag/add/:guid')
  @HttpCode(HttpStatus.OK)
  async addTag(@Param('guid') guid: string, @Body() dto: AddTagDto, @CurrentUser('id') userId: number) {
    try {
      await this.addressBookService.addTag(guid, dto, String(userId));
      return '';
    } catch (e) {
      return { error: e.message };
    }
  }

  /**
   * 重命名标签
   * 重命名指定地址簿中的标签
   *
   * @param guid 地址簿GUID
   * @param dto 标签重命名数据传输对象
   * @param userId 当前用户ID（从JWT令牌中提取）
   * @returns 重命名成功返回空字符串，失败返回错误信息
   * @throws NotFoundException 地址簿或标签不存在
   * @throws ForbiddenException 无权限修改该地址簿
   */
  @Put('tag/rename/:guid')
  @HttpCode(HttpStatus.OK)
  async renameTag(@Param('guid') guid: string, @Body() dto: RenameTagDto, @CurrentUser('id') userId: number) {
    try {
      await this.addressBookService.renameTag(guid, dto, String(userId));
      return '';
    } catch (e) {
      return { error: e.message };
    }
  }

  /**
   * 更新标签颜色
   * 更新指定地址簿中标签的颜色
   *
   * @param guid 地址簿GUID
   * @param dto 标签颜色更新数据传输对象
   * @param userId 当前用户ID（从JWT令牌中提取）
   * @returns 更新成功返回空字符串，失败返回错误信息
   * @throws NotFoundException 地址簿或标签不存在
   * @throws ForbiddenException 无权限修改该地址簿
   */
  @Put('tag/update/:guid')
  @HttpCode(HttpStatus.OK)
  async updateTag(@Param('guid') guid: string, @Body() dto: UpdateTagDto, @CurrentUser('id') userId: number) {
    try {
      await this.addressBookService.updateTag(guid, dto, String(userId));
      return '';
    } catch (e) {
      return { error: e.message };
    }
  }

  /**
   * 删除标签
   * 从指定地址簿中删除一个或多个标签
   *
   * @param guid 地址簿GUID
   * @param names 要删除的标签名称数组
   * @param userId 当前用户ID（从JWT令牌中提取）
   * @returns 删除成功返回空字符串，失败返回错误信息
   * @throws NotFoundException 地址簿不存在
   * @throws ForbiddenException 无权限修改该地址簿
   */
  @Delete('tag/:guid')
  @HttpCode(HttpStatus.OK)
  async deleteTags(@Param('guid') guid: string, @Body() names: string[], @CurrentUser('id') userId: number) {
    try {
      await this.addressBookService.deleteTags(guid, names, String(userId));
      return '';
    } catch (e) {
      return { error: e.message };
    }
  }
}
