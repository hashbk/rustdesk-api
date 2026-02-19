import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { APP_GUARD } from '@nestjs/core';
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
import { DatabaseModule } from './database/database.module';
import { Sysinfo } from './system/entities/sysinfo.entity';
import { Peer } from './heartbeat/entities/peer.entity';
import { ConnectionAudit } from './audit/entities/connection-audit.entity';
import { FileAudit } from './audit/entities/file-audit.entity';
import { AlarmAudit } from './audit/entities/alarm-audit.entity';
import { AddressBook } from './address-book/entities/address-book.entity';
import { AddressBookPeer } from './address-book/entities/address-book-peer.entity';
import { AddressBookTag } from './address-book/entities/address-book-tag.entity';
import { AddressBookShare } from './address-book/entities/address-book-share.entity';
import { AddressBookPeerTag } from './address-book/entities/address-book-peer-tag.entity';
import { User } from './user/entities/user.entity';
import { UserToken } from './user/entities/user-token.entity';
import { OidcProvider } from './oidc/entities/oidc-provider.entity';
import { OidcAuthState } from './oidc/entities/oidc-auth-state.entity';
import { DeviceGroup } from './device-group/entities/device-group.entity';
import { AccessiblePeer } from './device-group/entities/accessible-peer.entity';
import { GlobalJwtAuthGuard } from './auth/providers/jwt-auth-guard.provider';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'sqlite',
      database: 'rustdesk.db',
      entities: [Sysinfo, Peer, ConnectionAudit, FileAudit, AlarmAudit, AddressBook, AddressBookPeer, AddressBookTag, AddressBookShare, AddressBookPeerTag, User, UserToken, OidcProvider, OidcAuthState, DeviceGroup, AccessiblePeer],
      synchronize: true,
      logging: false,
    }),
    DatabaseModule,
    HeartbeatModule,
    AddressBookModule,
    AuditModule,
    UserModule,
    DeviceGroupModule,
    AuthModule,
    OidcModule,
    SystemModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: GlobalJwtAuthGuard,
    },
  ],
})
export class AppModule {}
