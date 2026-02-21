import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminController } from './admin.controller';
import { DeviceGroupService } from '../modules/device-group/device-group.service';
import { PeerService } from '../modules/device-group/peer.service';
import { UserService } from '../modules/user/user.service';
import { OidcService } from '../modules/oidc/oidc.service';
import { DeviceGroup } from '../modules/device-group/entities/device-group.entity';
import { DeviceGroupUserPermission } from '../modules/device-group/entities/device-group-user-permission.entity';
import { UserUserPermission } from '../modules/device-group/entities/user-user-permission.entity';
import { User } from '../modules/user/entities/user.entity';
import { UserToken } from '../modules/user/entities/user-token.entity';
import { OidcProvider } from '../modules/oidc/entities/oidc-provider.entity';
import { OidcAuthState } from '../modules/oidc/entities/oidc-auth-state.entity';
import { Peer, Sysinfo } from '../common/entities';
import { JwtModule } from '@nestjs/jwt';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      DeviceGroup,
      DeviceGroupUserPermission,
      UserUserPermission,
      User,
      UserToken,
      OidcProvider,
      OidcAuthState,
      Peer,
      Sysinfo,
    ]),
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'rustdesk-api-secret-key-change-in-production',
      signOptions: { expiresIn: '30d' },
    }),
  ],
  controllers: [AdminController],
  providers: [DeviceGroupService, PeerService, UserService, OidcService],
  exports: [],
})
export class AdminModule {}
