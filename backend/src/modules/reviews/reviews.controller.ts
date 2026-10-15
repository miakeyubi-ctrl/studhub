import { Body, Controller, Get, Param, ParseIntPipe, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ReviewsService } from './reviews.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';
import { ReviewTargetType } from '@prisma/client';

@ApiTags('Reviews')
@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviews: ReviewsService) {}

  @Get()
  list(
    @Query('targetType') targetType: ReviewTargetType,
    @Query('targetId', ParseIntPipe) targetId: number,
  ) {
    return this.reviews.list(targetType, targetId);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-AUTH')
  create(@CurrentUser() u: JwtPayload, @Body() body: any) {
    return this.reviews.create(u.sub, body);
  }
}
