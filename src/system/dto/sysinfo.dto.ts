import { IsString, IsOptional } from 'class-validator';

export class SysinfoDto {
  @IsString()
  @IsOptional()
  hostname?: string;

  @IsString()
  @IsOptional()
  username?: string;

  @IsString()
  @IsOptional()
  os?: string;

  @IsString()
  @IsOptional()
  platform?: string;

  @IsString()
  @IsOptional()
  cpu?: string;

  @IsString()
  @IsOptional()
  memory?: string;

  @IsString()
  @IsOptional()
  display?: string;

  @IsString()
  @IsOptional()
  version?: string;

  @IsString()
  @IsOptional()
  id?: string;

  @IsString()
  @IsOptional()
  uuid?: string;

  @IsString()
  @IsOptional()
  'preset-address-book-name'?: string;

  @IsString()
  @IsOptional()
  'preset-address-book-tag'?: string;

  @IsString()
  @IsOptional()
  'preset-address-book-alias'?: string;

  @IsString()
  @IsOptional()
  'preset-address-book-password'?: string;

  @IsString()
  @IsOptional()
  'preset-address-book-note'?: string;

  @IsString()
  @IsOptional()
  'preset-username'?: string;

  @IsString()
  @IsOptional()
  'preset-strategy-name'?: string;

  @IsString()
  @IsOptional()
  'preset-device-group-name'?: string;

  @IsString()
  @IsOptional()
  'preset-note'?: string;
}
