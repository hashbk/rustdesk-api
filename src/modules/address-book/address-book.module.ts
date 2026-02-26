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
