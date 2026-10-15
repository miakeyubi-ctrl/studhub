"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "ProvidersService", {
    enumerable: true,
    get: function() {
        return ProvidersService;
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
let ProvidersService = class ProvidersService {
    async findMany(q) {
        const where = {};
        if (q.category) where.category = q.category;
        if (q.tier) where.tier = q.tier;
        if (q.city) {
            const city = String(q.city).split(',')[0].trim();
            if (city) where.city = {
                contains: city,
                mode: 'insensitive'
            };
        }
        const [items, total] = await Promise.all([
            this.prisma.serviceProvider.findMany({
                where,
                orderBy: [
                    {
                        tier: 'desc'
                    },
                    {
                        ratingAvg: 'desc'
                    },
                    {
                        reviewsCount: 'desc'
                    }
                ],
                include: {
                    user: {
                        select: {
                            id: true,
                            fullName: true,
                            avatarUrl: true,
                            phone: true
                        }
                    }
                }
            }),
            this.prisma.serviceProvider.count({
                where
            })
        ]);
        return {
            items,
            total
        };
    }
    async findById(id) {
        const p = await this.prisma.serviceProvider.findUnique({
            where: {
                id
            },
            include: {
                user: true,
                reviews: true
            }
        });
        if (!p) throw new _common.NotFoundException();
        return p;
    }
    create(userId, data) {
        const payload = {
            userId,
            category: data.category,
            title: String(data.title || '').trim(),
            bio: data.bio ? String(data.bio).trim() : null,
            phoneContact: String(data.phoneContact || '').trim(),
            emailContact: data.emailContact ? String(data.emailContact).trim() : null,
            city: String(data.city || '').trim(),
            portfolioUrls: Array.isArray(data.portfolioUrls) ? data.portfolioUrls.filter((u)=>!!u) : []
        };
        if (data.priceStart != null && data.priceStart !== '') payload.priceStart = Number(data.priceStart);
        if (data.priceEnd != null && data.priceEnd !== '') payload.priceEnd = Number(data.priceEnd);
        if (data.tier) payload.tier = data.tier;
        return this.prisma.serviceProvider.create({
            data: payload,
            include: {
                user: {
                    select: {
                        id: true,
                        fullName: true,
                        avatarUrl: true,
                        phone: true
                    }
                }
            }
        });
    }
    async update(userId, id, data) {
        const p = await this.prisma.serviceProvider.findUnique({
            where: {
                id
            }
        });
        if (!p) throw new _common.NotFoundException();
        if (p.userId !== userId) throw new _common.ForbiddenException();
        return this.prisma.serviceProvider.update({
            where: {
                id
            },
            data
        });
    }
    async toggleFavorite(userId, providerId) {
        const provider = await this.prisma.serviceProvider.findUnique({
            where: {
                id: providerId
            }
        });
        if (!provider) throw new _common.NotFoundException('Prestataire introuvable');
        const existing = await this.prisma.providerFavorite.findUnique({
            where: {
                userId_providerId: {
                    userId,
                    providerId
                }
            }
        });
        if (existing) {
            await this.prisma.providerFavorite.delete({
                where: {
                    userId_providerId: {
                        userId,
                        providerId
                    }
                }
            });
            return {
                favorited: false
            };
        }
        await this.prisma.providerFavorite.create({
            data: {
                userId,
                providerId
            }
        });
        return {
            favorited: true
        };
    }
    async listFavorites(userId) {
        const rows = await this.prisma.providerFavorite.findMany({
            where: {
                userId
            },
            orderBy: {
                createdAt: 'desc'
            },
            include: {
                provider: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                fullName: true,
                                avatarUrl: true,
                                phone: true
                            }
                        }
                    }
                }
            }
        });
        return {
            items: rows.map((r)=>r.provider)
        };
    }
    constructor(prisma){
        this.prisma = prisma;
    }
};
ProvidersService = _ts_decorate([
    (0, _common.Injectable)(),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _prismaservice.PrismaService === "undefined" ? Object : _prismaservice.PrismaService
    ])
], ProvidersService);

//# sourceMappingURL=providers.service.js.map