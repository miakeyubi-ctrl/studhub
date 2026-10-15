import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { AgentsService } from './agents.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';

@ApiTags('Agents')
@Controller('agents')
export class AgentsController {
  constructor(private readonly agents: AgentsService) {}

  @Patch('me')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.AGENT)
  @ApiBearerAuth('JWT-AUTH')
  @ApiOperation({ summary: 'Compléter / modifier mon profil professionnel' })
  updateMe(@CurrentUser() me: JwtPayload, @Body() body: Record<string, unknown>) {
    return this.agents.updateMe(me, body);
  }

  @Get(':id/follow-status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.AGENT, Role.STUDENT, Role.ADMIN)
  @ApiBearerAuth('JWT-AUTH')
  @ApiOperation({ summary: 'Savoir si je suis abonné aux alertes de cet agent' })
  followStatus(@Param('id', ParseIntPipe) id: number, @CurrentUser() me: JwtPayload) {
    return this.agents.followStatus(id, me);
  }

  @Post(':id/follow')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.AGENT, Role.STUDENT, Role.ADMIN)
  @ApiBearerAuth('JWT-AUTH')
  @ApiOperation({ summary: 'Suivre un agent (recevoir ses alertes de publication)' })
  follow(@Param('id', ParseIntPipe) id: number, @CurrentUser() me: JwtPayload) {
    return this.agents.follow(id, me);
  }

  @Delete(':id/follow')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.AGENT, Role.STUDENT, Role.ADMIN)
  @ApiBearerAuth('JWT-AUTH')
  @ApiOperation({ summary: 'Ne plus suivre un agent' })
  unfollow(@Param('id', ParseIntPipe) id: number, @CurrentUser() me: JwtPayload) {
    return this.agents.unfollow(id, me);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Profil public agent' })
  getById(@Param('id', ParseIntPipe) id: number) {
    return this.agents.findById(id);
  }
}
