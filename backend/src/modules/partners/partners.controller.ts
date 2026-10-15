import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { PartnersService } from './partners.service';
import {
  CreatePartnerAnnouncementDto,
  CreatePartnerDto,
  PartnerQueryDto,
  UpdatePartnerAnnouncementDto,
  UpdatePartnerDto,
} from './dto/partner.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';

@ApiTags('Partners (STUD Partners)')
@Controller('partners')
export class PartnersController {
  constructor(private readonly partners: PartnersService) {}

  // ---------- Public ----------

  @Get()
  list(@Query() q: PartnerQueryDto) {
    return this.partners.findActive(q);
  }

  // ---------- Admin (déclaré avant ':id' pour ne pas être capturé) ----------

  @Get('admin/all')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth('JWT-AUTH')
  adminList(@Query() q: PartnerQueryDto) {
    return this.partners.findAll(q);
  }

  @Get('admin/stats')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth('JWT-AUTH')
  adminStats() {
    return this.partners.stats();
  }

  @Get('me')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.PARTNER)
  @ApiBearerAuth('JWT-AUTH')
  me(@CurrentUser() user: JwtPayload) {
    return this.partners.findMe(user.sub);
  }

  @Get('me/announcements')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.PARTNER)
  @ApiBearerAuth('JWT-AUTH')
  myAnnouncements(@CurrentUser() user: JwtPayload) {
    return this.partners.listMyAnnouncements(user.sub);
  }

  @Post('me/announcements')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.PARTNER)
  @ApiBearerAuth('JWT-AUTH')
  createAnnouncement(@CurrentUser() user: JwtPayload, @Body() dto: CreatePartnerAnnouncementDto) {
    return this.partners.createAnnouncement(user.sub, dto);
  }

  @Patch('me/announcements/:announcementId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.PARTNER)
  @ApiBearerAuth('JWT-AUTH')
  updateAnnouncement(
    @CurrentUser() user: JwtPayload,
    @Param('announcementId', ParseIntPipe) announcementId: number,
    @Body() dto: UpdatePartnerAnnouncementDto,
  ) {
    return this.partners.updateAnnouncement(user.sub, announcementId, dto);
  }

  @Delete('me/announcements/:announcementId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.PARTNER)
  @ApiBearerAuth('JWT-AUTH')
  removeAnnouncement(
    @CurrentUser() user: JwtPayload,
    @Param('announcementId', ParseIntPipe) announcementId: number,
  ) {
    return this.partners.removeAnnouncement(user.sub, announcementId);
  }

  @Get('admin/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth('JWT-AUTH')
  adminGet(@Param('id', ParseIntPipe) id: number) {
    return this.partners.findById(id);
  }

  @Post(':id/click')
  @HttpCode(HttpStatus.OK)
  trackClick(@Param('id', ParseIntPipe) id: number) {
    return this.partners.trackClick(id);
  }

  @Post(':id/like')
  @HttpCode(HttpStatus.OK)
  trackLike(@Param('id', ParseIntPipe) id: number) {
    return this.partners.trackLike(id);
  }

  @Get(':id/announcements')
  listAnnouncements(@Param('id', ParseIntPipe) id: number) {
    return this.partners.listPublicAnnouncements(id);
  }

  @Get(':id')
  getById(@Param('id', ParseIntPipe) id: number) {
    return this.partners.findActiveById(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth('JWT-AUTH')
  create(@Body() dto: CreatePartnerDto) {
    return this.partners.create(dto);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth('JWT-AUTH')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdatePartnerDto) {
    return this.partners.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth('JWT-AUTH')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.partners.remove(id);
  }
}
