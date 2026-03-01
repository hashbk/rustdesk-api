import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { APP_GUARD } from '@nestjs/core';
import { HeartbeatModule } from './modules/heartbeat/heartbeat.module';
import { AddressBookModule } from './modules/address-book/address-book.module';
import { AuditModule } from './modules/audit/audit.module';
import { UserModule } from './modules/user/user.module';
import { DeviceGroupModule } from './modules/device-group/device-group.module';
import { AuthModule } from './modules/auth/auth.module';
import { OidcModule } from './modules/oidc/oidc.module';
import { SysinfoModule } from './modules/sysinfo/sysinfo.module';
import { VersionCheckModule } from './modules/version-check/version-check.module';
import { TemporaryPasswordModule } from './modules/temporary-password/temporary-password.module';
import { DatabaseModule } from './database/database.module';
import { Sysinfo, Peer } from './common/entities';
import { ConnectionAudit } from './modules/audit/entities/connection-audit.entity';
import { FileAudit } from './modules/audit/entities/file-audit.entity';
import { AlarmAudit } from './modules/audit/entities/alarm-audit.entity';
import { AddressBook } from './modules/address-book/entities/address-book.entity';
import { AddressBookPeer } from './modules/address-book/entities/address-book-peer.entity';
import { AddressBookTag } from './modules/address-book/entities/address-book-tag.entity';
import { AddressBookShare } from './modules/address-book/entities/address-book-share.entity';
import { AddressBookPeerTag } from './modules/address-book/entities/address-book-peer-tag.entity';
import { User } from './modules/user/entities/user.entity';
import { UserToken } from './modules/user/entities/user-token.entity';
import { OidcProvider } from './modules/oidc/entities/oidc-provider.entity';
import { OidcAuthState } from './modules/oidc/entities/oidc-auth-state.entity';
import { DeviceGroup } from './modules/device-group/entities/device-group.entity';
import { DeviceGroupUserPermission } from './modules/device-group/entities/device-group-user-permission.entity';
import { UserUserPermission } from './modules/device-group/entities/user-user-permission.entity';
import { JwtAuthGuard } from './modules/auth/guards/jwt-auth.guard';
import { EmailVerificationSession } from './modules/auth/entities/email-verification-session.entity';
import { Version } from './modules/version-check/entities/version.entity';
import { TemporaryPassword } from './modules/temporary-password/entities/temporary-password.entity';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'sqlite',
      database: 'rustdesk.db',
      entities: [Sysinfo, Peer, ConnectionAudit, FileAudit, AlarmAudit, AddressBook, AddressBookPeer, AddressBookTag, AddressBookShare, AddressBookPeerTag, User, UserToken, OidcProvider, OidcAuthState, DeviceGroup, DeviceGroupUserPermission, UserUserPermission, EmailVerificationSession, Version, TemporaryPassword],
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
    SysinfoModule,
    VersionCheckModule,
    TemporaryPasswordModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}
