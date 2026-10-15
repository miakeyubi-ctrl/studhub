"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "PostsService", {
    enumerable: true,
    get: function() {
        return PostsService;
    }
});
const _common = require("@nestjs/common");
const _prismaservice = require("../../common/prisma/prisma.service");
function _ts_decorate(decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") {
        r = Reflect.decorate(decorators, target, key, desc);
    } else {
        for(var i = decorators.length - 1; i >= 0; i--){
            if (d = decorators[i]) {
                r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
            }
        }
    }
    return c > 3 && r && Object.defineProperty(target, key, r), r;
}
function _ts_metadata(metadataKey, metadataValue) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") {
        return Reflect.metadata(metadataKey, metadataValue);
    }
}
let PostsService = class PostsService {
    async findMany(q) {
        const where = {};
        if (q.associationTag) where.associationTag = q.associationTag;
        const take = Math.min(Number(q.limit || 20), 50);
        const skip = Number(((q.page || 1) - 1) * take);
        const [items, total] = await Promise.all([
            this.prisma.feedPost.findMany({
                where,
                take,
                skip,
                orderBy: {
                    createdAt: 'desc'
                },
                include: {
                    author: {
                        select: {
                            id: true,
                            fullName: true,
                            avatarUrl: true,
                            university: true
                        }
                    },
                    likes: false,
                    comments: {
                        take: 3,
                        orderBy: {
                            createdAt: 'desc'
                        },
                        include: {
                            author: {
                                select: {
                                    id: true,
                                    fullName: true,
                                    avatarUrl: true
                                }
                            }
                        }
                    }
                }
            }),
            this.prisma.feedPost.count({
                where
            })
        ]);
        return {
            items,
            meta: {
                total,
                page: Number(q.page || 1),
                perPage: take,
                totalPages: Math.ceil(total / take)
            }
        };
    }
    async findById(id) {
        const p = await this.prisma.feedPost.findUnique({
            where: {
                id
            },
            include: {
                author: true,
                comments: {
                    include: {
                        author: true
                    }
                }
            }
        });
        if (!p) throw new _common.NotFoundException();
        return p;
    }
    create(userId, data) {
        return this.prisma.feedPost.create({
            data: {
                authorId: userId,
                text: data.text,
                imageUrl: data.imageUrl || null,
                associationTag: data.associationTag || null,
                eventDate: data.eventDate ? new Date(data.eventDate) : null
            },
            include: {
                author: {
                    select: {
                        id: true,
                        fullName: true,
                        avatarUrl: true,
                        university: true
                    }
                }
            }
        });
    }
    async delete(userId, id) {
        const p = await this.prisma.feedPost.findUnique({
            where: {
                id
            }
        });
        if (!p) throw new _common.NotFoundException();
        if (p.authorId !== userId) throw new _common.ForbiddenException();
        await this.prisma.feedPost.delete({
            where: {
                id
            }
        });
        return {
            deleted: true,
            id
        };
    }
    async toggleLike(userId, postId) {
        const post = await this.prisma.feedPost.findUnique({
            where: {
                id: postId
            }
        });
        if (!post) throw new _common.NotFoundException();
        const existing = await this.prisma.like.findUnique({
            where: {
                postId_userId: {
                    postId,
                    userId
                }
            }
        });
        if (existing) {
            await this.prisma.like.delete({
                where: {
                    postId_userId: {
                        postId,
                        userId
                    }
                }
            });
            await this.prisma.feedPost.update({
                where: {
                    id: postId
                },
                data: {
                    likesCount: {
                        decrement: 1
                    }
                }
            });
            return {
                liked: false,
                likesCount: Math.max(0, post.likesCount - 1)
            };
        }
        await this.prisma.like.create({
            data: {
                userId,
                postId
            }
        });
        const updated = await this.prisma.feedPost.update({
            where: {
                id: postId
            },
            data: {
                likesCount: {
                    increment: 1
                }
            }
        });
        return {
            liked: true,
            likesCount: updated.likesCount
        };
    }
    async addComment(userId, postId, text) {
        if (!text?.trim()) throw new _common.ForbiddenException('Commentaire vide');
        const post = await this.prisma.feedPost.findUnique({
            where: {
                id: postId
            }
        });
        if (!post) throw new _common.NotFoundException();
        const c = await this.prisma.comment.create({
            data: {
                postId,
                authorId: userId,
                text: text.trim()
            },
            include: {
                author: {
                    select: {
                        id: true,
                        fullName: true,
                        avatarUrl: true
                    }
                }
            }
        });
        await this.prisma.feedPost.update({
            where: {
                id: postId
            },
            data: {
                commentsCount: {
                    increment: 1
                }
            }
        });
        return c;
    }
    async getComments(postId, q) {
        const take = Math.min(Number(q.limit || 30), 100);
        return this.prisma.comment.findMany({
            where: {
                postId
            },
            orderBy: {
                createdAt: 'desc'
            },
            take,
            include: {
                author: {
                    select: {
                        id: true,
                        fullName: true,
                        avatarUrl: true
                    }
                }
            }
        });
    }
    constructor(prisma){
        this.prisma = prisma;
    }
};
PostsService = _ts_decorate([
    (0, _common.Injectable)(),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _prismaservice.PrismaService === "undefined" ? Object : _prismaservice.PrismaService
    ])
], PostsService);

//# sourceMappingURL=posts.service.js.map