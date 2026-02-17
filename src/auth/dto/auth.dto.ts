import { IsString, IsOptional, IsBoolean, IsObject, IsEmail } from 'class-validator';

export class LoginDto {
  @IsOptional()
  @IsString()
  username?: string;

  @IsOptional()
  @IsString()
  password?: string;

  @IsOptional()
  @IsString()
  id?: string; // 设备ID

  @IsOptional()
  @IsString()
  uuid?: string; // 设备UUID

  @IsOptional()
  @IsBoolean()
  autoLogin?: boolean;

  @IsOptional()
  @IsString()
  type?: string; // account, mobile, sms_code, email_code, tfa_code

  @IsOptional()
  @IsString()
  verificationCode?: string;

  @IsOptional()
  @IsString()
  tfaCode?: string;

  @IsOptional()
  @IsString()
  secret?: string;

  @IsOptional()
  @IsObject()
  deviceInfo?: Record<string, any>;
}

export class RegisterDto {
  @IsString()
  username: string;

  @IsEmail()
  email: string;

  @IsString()
  password: string;

  @IsOptional()
  @IsString()
  note?: string;
}

export class CurrentUserDto {
  @IsOptional()
  @IsString()
  id?: string;

  @IsOptional()
  @IsString()
  uuid?: string;
}

export class LogoutDto {
  @IsOptional()
  @IsString()
  id?: string;

  @IsOptional()
  @IsString()
  uuid?: string;
}
