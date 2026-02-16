import { Injectable } from '@nestjs/common';
import { HeartbeatDto } from './dto/heartbeat.dto';

@Injectable()
export class HeartbeatService {
    handleHeartbeat(data: HeartbeatDto) {
    console.log('收到心跳数据：', data);

    return {
      code: 200,
      message: '心跳接收成功',
      data: {
        timestamp: Date.now(),
        device_id: data.id,
      },
    };
  }
}
