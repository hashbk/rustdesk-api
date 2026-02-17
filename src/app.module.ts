import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
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
import { Sysinfo } from './system/entities/sysinfo.entity';
import { Peer } from './heartbeat/entities/peer.entity';
import { ConnectionAudit } from './audit/entities/connection-audit.entity';
import { FileAudit } from './audit/entities/file-audit.entity';
import { AlarmAudit } from './audit/entities/alarm-audit.entity';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'sqlite',
      database: 'rustdesk.db',
      entities: [Sysinfo, Peer, ConnectionAudit, FileAudit, AlarmAudit],
      synchronize: true,
      logging: false,
    }),
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
  providers: [AppService],
})
export class AppModule {}
