import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OidcController } from './oidc.controller';
import { OidcService } from './oidc.service';
import { OidcProvider } from './entities/oidc-provider.entity';
import { OidcAuthState } from './entities/oidc-auth-state.entity';
import { User } from '../user/entities/user.entity';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([OidcProvider, OidcAuthState, User]),
    AuthModule,
  ],
  controllers: [OidcController],
  providers: [OidcService],
  exports: [OidcService],
})
export class OidcModule {}
