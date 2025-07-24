import { Controller, Get } from '@nestjs/common';

@Controller({
  version: '1',
})
export class AppController {
  @Get('health')
  getHealthCheck(): { status: string; timestamp: string } {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }
}
