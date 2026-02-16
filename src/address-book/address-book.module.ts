import { Module } from '@nestjs/common';
import { AddressBookController } from './address-book.controller';

@Module({
  controllers: [AddressBookController]
})
export class AddressBookModule {}
