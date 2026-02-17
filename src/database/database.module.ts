import { Module, Global } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../user/entities/user.entity';
import { UserToken } from '../user/entities/user-token.entity';
import { UserDevice } from '../user/entities/user-device.entity';
import { OidcProvider } from '../oidc/entities/oidc-provider.entity';
import { DatabaseInitService } from './database-init.service';

@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([User, UserToken, UserDevice, OidcProvider]),
  ],
  providers: [DatabaseInitService],
  exports: [DatabaseInitService],
})
export class DatabaseModule {}
