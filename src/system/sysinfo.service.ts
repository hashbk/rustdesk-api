import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Sysinfo } from './entities/sysinfo.entity';
import { SysinfoDto } from './dto/sysinfo.dto';

@Injectable()
export class SysinfoService {
  constructor(
    @InjectRepository(Sysinfo)
    private sysinfoRepository: Repository<Sysinfo>,
  ) {}

  async createSysinfo(sysinfoDto: SysinfoDto): Promise<Sysinfo> {
    const sysinfo = this.sysinfoRepository.create({
      hostname: sysinfoDto.hostname,
      username: sysinfoDto.username,
      os: sysinfoDto.os,
      platform: sysinfoDto.platform,
      cpu: sysinfoDto.cpu,
      memory: sysinfoDto.memory,
      display: sysinfoDto.display,
      version: sysinfoDto.version,
      deviceId: sysinfoDto.id,
      uuid: sysinfoDto.uuid,
      presetAddressBookName: sysinfoDto['preset-address-book-name'],
      presetAddressBookTag: sysinfoDto['preset-address-book-tag'],
      presetAddressBookAlias: sysinfoDto['preset-address-book-alias'],
      presetAddressBookPassword: sysinfoDto['preset-address-book-password'],
      presetAddressBookNote: sysinfoDto['preset-address-book-note'],
      presetUsername: sysinfoDto['preset-username'],
      presetStrategyName: sysinfoDto['preset-strategy-name'],
      presetDeviceGroupName: sysinfoDto['preset-device-group-name'],
      presetNote: sysinfoDto['preset-note'],
    });

    return await this.sysinfoRepository.save(sysinfo);
  }

  async findAll(): Promise<Sysinfo[]> {
    return await this.sysinfoRepository.find();
  }

  async findById(id: number): Promise<Sysinfo | null> {
    return await this.sysinfoRepository.findOne({ where: { id } });
  }

  async findByDeviceId(deviceId: string): Promise<Sysinfo[]> {
    return await this.sysinfoRepository.find({ where: { deviceId } });
  }
}
