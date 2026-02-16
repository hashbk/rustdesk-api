import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { HeartbeatModule } from './heartbeat/heartbeat.module';
import { AddressBookModule } from './address-book/address-book.module';
import { AuditModule } from './audit/audit.module';
import { UserModule } from './user/user.module';
import { DeviceGroupModule } from './device-group/device-group.module';
import { AuthModule } from './auth/auth.module';
import { OidcModule } from './oidc/oidc.module';
import { SystemModule } from './system/system.module';

@Module({
  imports: [HeartbeatModule, AddressBookModule, AuditModule, UserModule, DeviceGroupModule, AuthModule, OidcModule, SystemModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
