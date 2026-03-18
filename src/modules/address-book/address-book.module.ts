import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AddressBookController } from './address-book.controller';
import {
  AddressBookService,
  AddressBookPeerService,
  AddressBookTagService,
  AddressBookShareService,
  AddressBookLegacyService,
} from './services';
import { AddressBook, AddressBookPeer, AddressBookTag, AddressBookShare, AddressBookPeerTag } from './entities';
import { Sysinfo, Peer } from '../../common/entities';
import { User } from '../user/entities/user.entity';

/**
 * 地址簿模块
 * 负责地址簿管理、设备管理和标签管理
 *
 * 导入模块：
 * - TypeOrmModule
 *
 * 导出服务：
 * - AddressBookService
 *
 * 提供服务：
 * - AddressBookService
 * - PeerService
 * - TagService
 * - ShareService
 * - LegacyService
 */
@Module({
  imports: [TypeOrmModule.forFeature([AddressBook, AddressBookPeer, AddressBookTag, AddressBookShare, AddressBookPeerTag, Sysinfo, Peer, User])],
  controllers: [AddressBookController],
  providers: [
    AddressBookService,
    AddressBookPeerService,
    AddressBookTagService,
    AddressBookShareService,
    AddressBookLegacyService,
  ],
  exports: [AddressBookService],
})
export class AddressBookModule {}
