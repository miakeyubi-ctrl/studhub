import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';

@ApiTags('Users')
@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get('universities')
  @ApiOperation({ summary: 'Liste des universités / établissements' })
  listUniversities() {
    return this.users.listUniversities();
  }

  @Get('universities/stats')
  @ApiOperation({ summary: 'Effectifs étudiants par université' })
  universityStats() {
    return this.users.universityStats();
  }

  @Get('admin/accounts')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth('JWT-AUTH')
  @ApiOperation({ summary: 'Admin — liste des comptes (étudiants + agents)' })
  adminList(
    @Query('search') search?: string,
    @Query('kind') kind?: 'user' | 'agent' | 'all',
  ) {
    return this.users.adminListAccounts({ search, kind });
  }

  @Patch('admin/:kind/:id/block')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth('JWT-AUTH')
  @ApiOperation({ summary: 'Admin — bloquer un compte' })
  adminBlock(
    @CurrentUser() admin: JwtPayload,
    @Param('kind') kind: 'user' | 'agent',
    @Param('id', ParseIntPipe) id: number,
  ) {
    if (kind !== 'user' && kind !== 'agent') {
      kind = 'user';
    }
    return this.users.adminSetBlocked(admin, kind, id, true);
  }

  @Patch('admin/:kind/:id/unblock')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth('JWT-AUTH')
  @ApiOperation({ summary: 'Admin — débloquer un compte' })
  adminUnblock(
    @CurrentUser() admin: JwtPayload,
    @Param('kind') kind: 'user' | 'agent',
    @Param('id', ParseIntPipe) id: number,
  ) {
    if (kind !== 'user' && kind !== 'agent') {
      kind = 'user';
    }
    return this.users.adminSetBlocked(admin, kind, id, false);
  }

  @Get('me/privacy')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-AUTH')
  @ApiOperation({ summary: 'Lire mes préférences de confidentialité' })
  getPrivacy(@CurrentUser() user: JwtPayload) {
    return this.users.getPrivacy(user);
  }

  @Patch('me/privacy')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-AUTH')
  @ApiOperation({ summary: 'Enregistrer mes préférences de confidentialité' })
  updatePrivacy(
    @CurrentUser() user: JwtPayload,
    @Body() body: { pushEnabled?: boolean; personalizedTips?: boolean },
  ) {
    return this.users.updatePrivacy(user, body);
  }

  @Delete('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-AUTH')
  @ApiOperation({ summary: 'Supprimer mon compte (mot de passe requis)' })
  deleteMe(
    @CurrentUser() user: JwtPayload,
    @Body() body: { password?: string },
  ) {
    return this.users.deleteOwnAccount(user, String(body?.password || ''));
  }

  @Get(':id')
  @ApiOperation({ summary: 'Profil public étudiant' })
  getById(@Param('id', ParseIntPipe) id: number) {
    return this.users.findById(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-AUTH')
  @ApiOperation({ summary: 'Modifier son profil étudiant (propriétaire seulement)' })
  update(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) id: number,
    @Body()
    body: {
      fullName?: string;
      phone?: string;
      university?: string;
      studyLevel?: string;
      bio?: string;
      avatarUrl?: string;
    },
  ) {
    return this.users.updateProfile(user, id, body);
  }
}
