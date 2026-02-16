import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { HeartbeatModule } from './heartbeat/heartbeat.module';
import { AddressBookModule } from './address-book/address-book.module';

@Module({
  imports: [HeartbeatModule, AddressBookModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
