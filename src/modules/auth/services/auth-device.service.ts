import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Peer } from '../../../common/entities';

@Injectable()
export class AuthDeviceService {
  private readonly logger = new Logger(AuthDeviceService.name);

  constructor(
    @InjectRepository(Peer)
    private peerRepository: Repository<Peer>,
  ) {}

  /**
   * 创建或更新设备记录（绑定设备到用户）
   */
  async createOrUpdateDevice(
    userGuid: string,
    deviceId?: string,
    deviceUuid?: string,
    deviceInfo?: Record<string, any>,
  ): Promise<void> {
    if (!deviceUuid) return;

    // 查找 peer 记录
    const peer = await this.peerRepository.findOne({
      where: { uuid: deviceUuid },
    });

    if (peer) {
      // 更新 peer 的 userGuid，绑定设备到用户
      peer.userGuid = userGuid;
      await this.peerRepository.save(peer);
    }
    // 如果 peer 不存在，设备会在心跳时自动创建
  }

  /**
   * 解除设备与用户的绑定
   */
  async unbindDevice(userGuid: string, deviceUuid: string): Promise<void> {
    const peer = await this.peerRepository.findOne({
      where: { uuid: deviceUuid, userGuid },
    });

    if (peer) {
      peer.userGuid = null as any;
      await this.peerRepository.save(peer);
      this.logger.log(`用户 ${userGuid} 退出登录，已解除设备 ${deviceUuid} 的绑定`);
    }
  }
}
