import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AddressBookController } from './address-book.controller';
import { AddressBookService } from './address-book.service';
import { AddressBook, AbPeer, AbTag, SharedAddressBook } from './entities';

@Module({
  imports: [TypeOrmModule.forFeature([AddressBook, AbPeer, AbTag, SharedAddressBook])],
  controllers: [AddressBookController],
  providers: [AddressBookService],
})
export class AddressBookModule {}
