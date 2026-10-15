import { Controller, Get, Param, ParseIntPipe, Post, Body, Patch, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ProvidersService } from './providers.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';

@ApiTags('Providers (StudServices)')
@Controller('providers')
export class ProvidersController {
  constructor(private readonly providers: ProvidersService) {}

  @Get() list(@Query() q: any) { return this.providers.findMany(q); }

  @Get('favorites/mine')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-AUTH')
  myFavorites(@CurrentUser() u: JwtPayload) {
    return this.providers.listFavorites(u.sub);
  }

  @Get(':id') getById(@Param('id', ParseIntPipe) id: number) { return this.providers.findById(id); }

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-AUTH')
  create(@CurrentUser() u: JwtPayload, @Body() b: any) {
    return this.providers.create(u.sub, b);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-AUTH')
  update(@CurrentUser() u: JwtPayload, @Param('id', ParseIntPipe) id: number, @Body() b: any) {
    return this.providers.update(u.sub, id, b);
  }

  @Post(':id/favorite')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-AUTH')
  favorite(@CurrentUser() u: JwtPayload, @Param('id', ParseIntPipe) providerId: number) {
    return this.providers.toggleFavorite(u.sub, providerId);
  }
}
