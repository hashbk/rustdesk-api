import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AddressBookController } from './address-book.controller';
import { AddressBookService } from './address-book.service';
import { AddressBook, AddressBookPeer, AddressBookTag, AddressBookShare, AddressBookPeerTag } from './entities';
import { Sysinfo } from '../system/entities/sysinfo.entity';

@Module({
  imports: [TypeOrmModule.forFeature([AddressBook, AddressBookPeer, AddressBookTag, AddressBookShare, AddressBookPeerTag, Sysinfo])],
  controllers: [AddressBookController],
  providers: [AddressBookService],
})
export class AddressBookModule {}
