import { Controller, Post, Body } from '@nestjs/common';
import { HeartbeatService } from './heartbeat.service';
import { HeartbeatDto } from './dto/heartbeat.dto';

@Controller('heartbeat')
export class HeartbeatController {
  constructor(private readonly HeartbeatService: HeartbeatService) {}

  @Post()
  receiveHeartbeat(@Body() HeartbeatDto: HeartbeatDto) {
    return this.HeartbeatService.handleHeartbeat(HeartbeatDto);
  }
}
