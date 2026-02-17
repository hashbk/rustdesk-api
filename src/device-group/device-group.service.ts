import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DeviceGroup } from './entities/device-group.entity';
import { DeviceGroupQueryDto, CreateDeviceGroupDto, UpdateDeviceGroupDto } from './dto/device-group.dto';

@Injectable()
export class DeviceGroupService {
  constructor(
    @InjectRepository(DeviceGroup)
    private deviceGroupRepository: Repository<DeviceGroup>,
  ) {}

  /**
   * 获取用户可访问的设备组列表（分页）
   */
  async getAccessibleDeviceGroups(
    userId: number,
    query: DeviceGroupQueryDto,
  ): Promise<{ data: { name: string }[]; total: number }> {
    const { current, pageSize } = query;
    const skip = (current - 1) * pageSize;

    // 查询用户可访问的设备组
    // 这里简化处理：返回所有设备组
    // 实际项目中应该根据用户权限过滤
    const [groups, total] = await this.deviceGroupRepository.findAndCount({
      select: ['name'],
      order: { name: 'ASC' },
      skip,
      take: pageSize,
    });

    return {
      data: groups.map(g => ({ name: g.name })),
      total,
    };
  }

  /**
   * 获取所有设备组（管理员）
   */
  async findAll(page: number = 1, limit: number = 20): Promise<{ groups: DeviceGroup[]; total: number }> {
    const [groups, total] = await this.deviceGroupRepository.findAndCount({
      order: { id: 'ASC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { groups, total };
  }

  /**
   * 根据 ID 获取设备组
   */
  async findById(id: number): Promise<DeviceGroup | null> {
    return this.deviceGroupRepository.findOne({ where: { id } });
  }

  /**
   * 根据名称获取设备组
   */
  async findByName(name: string): Promise<DeviceGroup | null> {
    return this.deviceGroupRepository.findOne({ where: { name } });
  }

  /**
   * 创建设备组
   */
  async create(createDto: CreateDeviceGroupDto, owner?: string): Promise<DeviceGroup> {
    // 检查名称是否已存在
    const existing = await this.findByName(createDto.name);
    if (existing) {
      throw new BadRequestException('设备组名称已存在');
    }

    const group = this.deviceGroupRepository.create({
      ...createDto,
      owner,
    });

    return this.deviceGroupRepository.save(group);
  }

  /**
   * 更新设备组
   */
  async update(id: number, updateDto: UpdateDeviceGroupDto): Promise<DeviceGroup> {
    const group = await this.findById(id);
    if (!group) {
      throw new NotFoundException('设备组不存在');
    }

    // 如果要修改名称，检查是否已存在
    if (updateDto.name && updateDto.name !== group.name) {
      const existing = await this.findByName(updateDto.name);
      if (existing) {
        throw new BadRequestException('设备组名称已存在');
      }
    }

    Object.assign(group, updateDto);
    return this.deviceGroupRepository.save(group);
  }

  /**
   * 删除设备组
   */
  async delete(id: number): Promise<void> {
    const group = await this.findById(id);
    if (!group) {
      throw new NotFoundException('设备组不存在');
    }

    await this.deviceGroupRepository.remove(group);
  }
}
