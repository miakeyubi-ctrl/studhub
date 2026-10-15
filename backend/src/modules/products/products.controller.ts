import { Controller, Get, Param, ParseIntPipe, Post, Body, Patch, Delete, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ProductsService } from './products.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../../common/guards/optional-jwt-auth.guard';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';

@ApiTags('Marketplace')
@Controller('products')
export class ProductsController {
  constructor(private readonly products: ProductsService) {}

  @Get() list(@Query() q: any) { return this.products.findMany(q); }

  @Get('favorites/mine')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-AUTH')
  myFavorites(@CurrentUser() user: JwtPayload) {
    return this.products.listFavorites(user.sub);
  }

  @Get(':id')
  @UseGuards(OptionalJwtAuthGuard)
  getById(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: JwtPayload | null,
  ) {
    return this.products.findById(id, { user });
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-AUTH')
  create(@CurrentUser() user: JwtPayload, @Body() body: any) {
    return this.products.create(user.sub, body);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-AUTH')
  update(@CurrentUser() user: JwtPayload, @Param('id', ParseIntPipe) id: number, @Body() body: any) {
    return this.products.update(user.sub, id, body);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-AUTH')
  remove(@CurrentUser() user: JwtPayload, @Param('id', ParseIntPipe) id: number) {
    return this.products.delete(user.sub, id);
  }

  @Post(':id/like')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-AUTH')
  like(@CurrentUser() user: JwtPayload, @Param('id', ParseIntPipe) productId: number) {
    return this.products.toggleLike(user.sub, productId);
  }

  @Post(':id/favorite')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-AUTH')
  favorite(@CurrentUser() user: JwtPayload, @Param('id', ParseIntPipe) productId: number) {
    return this.products.toggleFavorite(user.sub, productId);
  }
}
