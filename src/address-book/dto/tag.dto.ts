import { IsString, IsNumber, IsOptional, IsNotEmpty, IsArray } from 'class-validator';

export class AddTagDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsNumber()
  color?: number;
}

export class UpdateTagDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsNumber()
  color: number;
}

export class RenameTagDto {
  @IsString()
  @IsNotEmpty()
  old: string;

  @IsString()
  @IsNotEmpty()
  new: string;
}

export class DeleteTagsDto {
  @IsArray()
  @IsString({ each: true })
  names: string[];
}
