import { Controller, Post, Body } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { HeartbeatService } from './heartbeat.service';
import { HeartbeatDto } from './dto/heartbeat.dto';
import { Public } from '../auth/decorators/public.decorator';

@Controller('heartbeat')
export class HeartbeatController {
  constructor(private readonly HeartbeatService: HeartbeatService) {}

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post()
  receiveHeartbeat(@Body() HeartbeatDto: HeartbeatDto) {
    return this.HeartbeatService.handleHeartbeat(HeartbeatDto);
  }
}
