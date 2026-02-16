import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { HeartbeatModule } from './heartbeat/heartbeat.module';
import { AddressBookModule } from './address-book/address-book.module';
import { AuditModule } from './audit/audit.module';
import { UserModule } from './user/user.module';

@Module({
  imports: [HeartbeatModule, AddressBookModule, AuditModule, UserModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
