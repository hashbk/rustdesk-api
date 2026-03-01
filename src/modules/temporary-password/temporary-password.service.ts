import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TemporaryPassword } from './entities/temporary-password.entity';
import { TemporaryPasswordDto } from './dto';

/**
 * 临时密码服务
 * 负责处理客户端的临时密码上传、更新和查询
 *
 * 功能：
 * - 接收客户端上传的临时密码
 * - 创建或更新临时密码记录
 * - 查询设备的临时密码
 */
@Injectable()
export class TemporaryPasswordService {
  private readonly logger = new Logger(TemporaryPasswordService.name);

  constructor(
    @InjectRepository(TemporaryPassword)
    private temporaryPasswordRepository: Repository<TemporaryPassword>,
  ) {}

  /**
   * 上传或更新临时密码
   * 接收客户端上传的临时密码，创建新记录或更新已有记录
   *
   * @param dto 临时密码数据
   * @returns "OK" 字符串
   * @throws NotFoundException 当设备ID不存在时抛出异常
   */
  async uploadTemporaryPassword(dto: TemporaryPasswordDto): Promise<string> {
    this.logger.debug(
      `收到临时密码上传请求: id=${dto.id}, uuid=${dto.uuid}, ver=${dto.ver}`
    );

    try {
      // 查找是否已存在该设备的临时密码记录
      const existingRecord = await this.temporaryPasswordRepository.findOne({
        where: { uuid: dto.uuid }
      });

      if (existingRecord) {
        // 记录已存在，更新临时密码
        await this.temporaryPasswordRepository.update(
          { uuid: dto.uuid },
          {
            device_id: dto.id,
            temporary_password: dto.temporary_password,
            ver: dto.ver,
          }
        );
        this.logger.debug(`设备 ${dto.uuid} 的临时密码已更新`);
      } else {
        // 记录不存在，创建新记录
        const newRecord = this.temporaryPasswordRepository.create({
          device_id: dto.id,
          uuid: dto.uuid,
          temporary_password: dto.temporary_password,
          ver: dto.ver,
        });
        await this.temporaryPasswordRepository.save(newRecord);
        this.logger.log(`设备 ${dto.uuid} 的临时密码已创建`);
      }

      return 'OK';
    } catch (error) {
      this.logger.error(
        `临时密码上传失败: id=${dto.id}, uuid=${dto.uuid}, error=${error.message}`,
        error.stack
      );
      throw error;
    }
  }

  /**
   * 根据UUID查询临时密码
   *
   * @param uuid 设备UUID
   * @returns 临时密码记录
   */
  async getTemporaryPasswordByUuid(uuid: string): Promise<TemporaryPassword> {
    const record = await this.temporaryPasswordRepository.findOne({
      where: { uuid }
    });

    if (!record) {
      throw new NotFoundException(`未找到UUID为 ${uuid} 的临时密码记录`);
    }

    return record;
  }

  /**
   * 根据设备ID查询临时密码
   *
   * @param deviceId 设备ID
   * @returns 临时密码记录列表
   */
  async getTemporaryPasswordsByDeviceId(deviceId: string): Promise<TemporaryPassword[]> {
    return this.temporaryPasswordRepository.find({
      where: { device_id: deviceId }
    });
  }

  /**
   * 删除临时密码记录
   *
   * @param uuid 设备UUID
   */
  async deleteTemporaryPassword(uuid: string): Promise<void> {
    await this.temporaryPasswordRepository.delete({ uuid });
    this.logger.log(`设备 ${uuid} 的临时密码已删除`);
  }
}
