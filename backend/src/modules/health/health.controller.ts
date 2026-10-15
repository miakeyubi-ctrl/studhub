import { Controller, Get } from '@nestjs/common';
import { ApiExcludeController, ApiOperation, ApiTags } from '@nestjs/swagger';
import { HealthService } from './health.service';

@ApiTags('Health')
@Controller('health')
@ApiExcludeController(false)
export class HealthController {
  constructor(private readonly health: HealthService) {}

  @Get()
  @ApiOperation({ summary: "Vérifier santé de l'API, BDD, Redis, uptime (utilisé par UptimeRobot)" })
  check() { return this.health.checkAll(); }
}
