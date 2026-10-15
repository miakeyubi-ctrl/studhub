import { Controller, Get, Param, ParseIntPipe, Post, Body, Delete, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { PostsService } from './posts.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';
import { Role } from '@prisma/client';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';

@ApiTags('Feed - Posts')
@Controller('posts')
export class PostsController {
  constructor(private readonly posts: PostsService) {}

  @Get() list(@Query() q: any) { return this.posts.findMany(q); }
  @Get(':id') getById(@Param('id', ParseIntPipe) id: number) { return this.posts.findById(id); }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.STUDENT, Role.ADMIN)
  @ApiBearerAuth('JWT-AUTH')
  create(@CurrentUser() u: JwtPayload, @Body() b: any) { return this.posts.create(u.sub, b); }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-AUTH')
  remove(@CurrentUser() u: JwtPayload, @Param('id', ParseIntPipe) id: number) { return this.posts.delete(u.sub, id); }

  @Post(':id/like')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-AUTH')
  like(@CurrentUser() u: JwtPayload, @Param('id', ParseIntPipe) postId: number) { return this.posts.toggleLike(u.sub, postId); }

  @Post(':id/comments')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-AUTH')
  comment(@CurrentUser() u: JwtPayload, @Param('id', ParseIntPipe) postId: number, @Body('text') text: string) { return this.posts.addComment(u.sub, postId, text); }

  @Get(':id/comments')
  comments(@Param('id', ParseIntPipe) id: number, @Query() q: any) { return this.posts.getComments(id, q); }
}
