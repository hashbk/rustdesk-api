import { Controller, Post, Body } from '@nestjs/common';
import { HeartbeatService } from './heartbeat.service';
import { HeartbeatDto } from './dto/heartbeat.dto';
import { Public } from '../auth/decorators/public.decorator';

@Controller('heartbeat')
export class HeartbeatController {
  constructor(private readonly HeartbeatService: HeartbeatService) {}

  @Public()
  @Post()
  receiveHeartbeat(@Body() HeartbeatDto: HeartbeatDto) {
    return this.HeartbeatService.handleHeartbeat(HeartbeatDto);
  }
}
