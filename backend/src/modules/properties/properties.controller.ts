import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Body,
  Patch,
  Delete,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { PropertiesService } from './properties.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../../common/guards/optional-jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';
import { Role } from '@prisma/client';

@ApiTags('Properties')
@Controller('properties')
export class PropertiesController {
  constructor(private readonly properties: PropertiesService) {}

  @Get()
  @ApiOperation({ summary: "Liste paginée des logements avec filtres (public)" })
  list(@Query() query: any) {
    return this.properties.findMany(query);
  }

  // Routes statiques AVANT :id (sinon Nest parse "agent" / "me" comme id)
  @Get('agent/me')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.AGENT)
  @ApiBearerAuth('JWT-AUTH')
  @ApiOperation({ summary: "Liste des biens publiés par l'agent connecté" })
  listAgentProperties(@CurrentUser() agent: JwtPayload, @Query() query: any) {
    return this.properties.findMany({ ...query, agentId: agent.sub });
  }

  @Get(':id')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: "Détail d'un bien (1 vue / utilisateur connecté)" })
  getById(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: JwtPayload | null,
  ) {
    return this.properties.findById(id, { user });
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.AGENT)
  @ApiBearerAuth('JWT-AUTH')
  @ApiOperation({ summary: "Publier un bien immobilier - AGENT ONLY" })
  create(@CurrentUser() agent: JwtPayload, @Body() body: any) {
    return this.properties.create(agent.sub, body);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.AGENT)
  @ApiBearerAuth('JWT-AUTH')
  @ApiOperation({ summary: "Modifier un bien (agent propriétaire seulement)" })
  update(@CurrentUser() agent: JwtPayload, @Param('id', ParseIntPipe) id: number, @Body() body: any) {
    return this.properties.update(agent.sub, id, body);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.AGENT)
  @ApiBearerAuth('JWT-AUTH')
  @ApiOperation({ summary: "Supprimer un bien (agent propriétaire seulement)" })
  delete(@CurrentUser() agent: JwtPayload, @Param('id', ParseIntPipe) id: number) {
    return this.properties.delete(agent.sub, id);
  }

  @Post(':id/favorite')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.STUDENT, Role.ADMIN)
  @ApiBearerAuth('JWT-AUTH')
  @ApiOperation({ summary: "Ajouter/retirer un logement des favoris étudiant" })
  favorite(@CurrentUser() user: JwtPayload, @Param('id', ParseIntPipe) propertyId: number) {
    return this.properties.toggleFavorite(user.sub, propertyId);
  }

  @Post(':id/like')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.STUDENT, Role.ADMIN)
  @ApiBearerAuth('JWT-AUTH')
  @ApiOperation({ summary: "Liker / unliker un logement" })
  like(@CurrentUser() user: JwtPayload, @Param('id', ParseIntPipe) propertyId: number) {
    return this.properties.toggleLike(user.sub, propertyId);
  }
}
