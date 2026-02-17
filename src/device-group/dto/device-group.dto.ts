import { IsString, IsOptional, IsNumber, Min } from 'class-validator';

export class DeviceGroupQueryDto {
  @IsNumber()
  @Min(1)
  current: number;

  @IsNumber()
  @Min(1)
  pageSize: number;
}

export class CreateDeviceGroupDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  note?: string;
}

export class UpdateDeviceGroupDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  note?: string;
}
