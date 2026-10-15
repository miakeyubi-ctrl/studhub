"use strict";
/**
 * Script de seed STUDHUB — données fictives pour démo / présentation
 * Usage : npx prisma db seed   OU   npx ts-node prisma/seed.ts
 * Mot de passe commun démo : Azerty123
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const bcrypt = __importStar(require("bcrypt"));
const prisma = new client_1.PrismaClient();
const BCRYPT_COST = 12;
const PLAIN_PASSWORD = 'Azerty123';
async function hash(pwd) {
    return bcrypt.hash(pwd, BCRYPT_COST);
}
function daysAgo(n) {
    const d = new Date();
    d.setDate(d.getDate() - n);
    return d;
}
async function main() {
    console.log('🌱 SEED STUDHUB (démo présentation) : démarrage...');
    const passwordHash = await hash(PLAIN_PASSWORD);
    // =========================================================================
    // 1) Étudiants
    // =========================================================================
    console.log('👥 Étudiants...');
    const studentsData = [
        {
            email: 'etudiant@studhub.tn',
            fullName: 'Youssef Trabelsi',
            phone: '+21620000001',
            bio: 'Étudiant en informatique, passionné de développement mobile.',
            university: 'FST — Faculté des Sciences de Tunis',
            studyLevel: 'Licence 3',
        },
        {
            email: 'sarra@studhub.tn',
            fullName: 'Aïcha Diallo',
            phone: '+21620111222',
            bio: 'Étudiante sénégalaise en école de commerce, cherche colocation à Tunis.',
            university: 'ESC Tunis',
            studyLevel: 'Master 1',
        },
        {
            email: 'amine@studhub.tn',
            fullName: 'Amadou Koné',
            phone: '+21698123456',
            bio: 'Étudiant ivoirien en médecine, vend du matériel de cours.',
            university: 'Faculté de Médecine de Tunis',
            studyLevel: '3e année',
        },
        {
            email: 'nour@studhub.tn',
            fullName: 'Fatoumata Camara',
            phone: '+21655112233',
            bio: 'Design graphique & UX. Propose des cours particuliers.',
            university: 'ISAMM Manouba',
            studyLevel: 'Master 2',
        },
        {
            email: 'khalil@studhub.tn',
            fullName: 'Kwame Mensah',
            phone: '+21622778899',
            bio: 'Ingénieur logiciel ghanéen en formation à ESPRIT.',
            university: 'ESPRIT',
            studyLevel: '4e année',
        },
        {
            email: 'ines@studhub.tn',
            fullName: 'Mariama Sy',
            phone: '+21650443322',
            bio: 'Étudiante en architecture, active sur le feed campus.',
            university: 'ENAU Tunis',
            studyLevel: 'Licence 2',
        },
        {
            email: 'ibrahima@studhub.tn',
            fullName: 'Ibrahima Sow',
            phone: '+21650998877',
            bio: 'Étudiant à l’INSAT, passionné de réseaux.',
            university: 'INSAT',
            studyLevel: '3e année',
        },
        {
            email: 'awa@studhub.tn',
            fullName: 'Awa Ndiaye',
            phone: '+21652110022',
            bio: 'Étudiante IHEC, cherche stage finance.',
            university: 'IHEC Carthage',
            studyLevel: 'Master 1',
        },
        {
            email: 'moussa@studhub.tn',
            fullName: 'Moussa Traoré',
            phone: '+21653445566',
            bio: 'Étudiant ESPRIT, vend du matériel informatique.',
            university: 'ESPRIT',
            studyLevel: '2e année',
        },
    ];
    const students = [];
    for (const s of studentsData) {
        const u = await prisma.user.upsert({
            where: { email: s.email },
            update: {
                fullName: s.fullName,
                phone: s.phone,
                bio: s.bio,
                university: s.university,
                studyLevel: s.studyLevel,
                passwordHash,
                emailVerifiedAt: new Date(),
            },
            create: {
                ...s,
                passwordHash,
                role: client_1.Role.STUDENT,
                emailVerifiedAt: new Date(),
            },
        });
        students.push({ id: u.id, email: u.email });
    }
    const byEmail = (email) => {
        const s = students.find((x) => x.email === email);
        if (!s)
            throw new Error(`Student missing: ${email}`);
        return s.id;
    };
    await prisma.user.upsert({
        where: { email: 'admin@studhub.tn' },
        update: { passwordHash: await hash('Admin@123456'), role: client_1.Role.ADMIN },
        create: {
            email: 'admin@studhub.tn',
            passwordHash: await hash('Admin@123456'),
            fullName: 'Admin StudHub',
            role: client_1.Role.ADMIN,
            emailVerifiedAt: new Date(),
        },
    });
    // =========================================================================
    // 2) Agents
    // =========================================================================
    console.log('🏢 Agents...');
    const demoAgent = await prisma.agent.upsert({
        where: { email: 'agent@studhub.tn' },
        update: {
            passwordHash,
            agencyName: 'Teranga Habitat',
            phone: '+21622000000',
            address: '123 Avenue Habib Bourguiba, Tunis',
            licenseNumber: 'AG-2025-00001',
            websiteUrl: 'https://teranga-habitat.demo',
            description: 'Agence spécialisée dans le logement étudiant (Tunisie & Afrique de l’Ouest).',
            verified: true,
            tier: client_1.ProviderTier.PREMIUM,
            emailVerifiedAt: new Date(),
        },
        create: {
            email: 'agent@studhub.tn',
            passwordHash,
            agencyName: 'Teranga Habitat',
            phone: '+21622000000',
            address: '123 Avenue Habib Bourguiba, Tunis',
            licenseNumber: 'AG-2025-00001',
            websiteUrl: 'https://teranga-habitat.demo',
            description: 'Agence spécialisée dans le logement étudiant (Tunisie & Afrique de l’Ouest).',
            verified: true,
            tier: client_1.ProviderTier.PREMIUM,
            role: client_1.Role.AGENT,
            emailVerifiedAt: new Date(),
        },
    });
    const mariem = await prisma.agent.upsert({
        where: { email: 'mariem@studhub.tn' },
        update: {
            passwordHash,
            agencyName: 'Awa Locations Campus',
            phone: '+21622333444',
            address: 'Campus Universitaire El Manar, Tunis',
            licenseNumber: 'AG-2025-00002',
            description: 'Locations de studios près des facultés — gérée par Awa Ndiaye.',
            verified: true,
            tier: client_1.ProviderTier.STANDARD,
            emailVerifiedAt: new Date(),
        },
        create: {
            email: 'mariem@studhub.tn',
            passwordHash,
            agencyName: 'Awa Locations Campus',
            phone: '+21622333444',
            address: 'Campus Universitaire El Manar, Tunis',
            licenseNumber: 'AG-2025-00002',
            description: 'Locations de studios près des facultés — gérée par Awa Ndiaye.',
            verified: true,
            tier: client_1.ProviderTier.STANDARD,
            role: client_1.Role.AGENT,
            emailVerifiedAt: new Date(),
        },
    });
    const sofien = await prisma.agent.upsert({
        where: { email: 'sofien@studhub.tn' },
        update: {
            passwordHash,
            agencyName: 'Baobab Homes Sousse',
            phone: '+21673445566',
            address: 'Sahloul, Sousse',
            description: 'Logements étudiants à Sousse et Monastir — réseau Baobab Homes.',
            verified: true,
            emailVerifiedAt: new Date(),
        },
        create: {
            email: 'sofien@studhub.tn',
            passwordHash,
            agencyName: 'Baobab Homes Sousse',
            phone: '+21673445566',
            address: 'Sahloul, Sousse',
            description: 'Logements étudiants à Sousse et Monastir — réseau Baobab Homes.',
            verified: true,
            role: client_1.Role.AGENT,
            emailVerifiedAt: new Date(),
        },
    });
    // =========================================================================
    // 3) Propriétés
    // =========================================================================
    console.log('🏘️ Logements...');
    const properties = [
        {
            title: 'Studio cosy près de la Faculté des Sciences de Tunis',
            description: 'Studio meublé climatisé, à 5 min à pieds de la FST. Wifi fibre, cuisine équipée, salle de bain privative.',
            price: 350,
            city: 'Tunis',
            location: 'El Manar',
            category: client_1.PropertyCategory.STUDIO,
            surface: 28,
            rooms: 1,
            bedrooms: 1,
            bathrooms: 1,
            furnished: true,
            amenities: ['wifi', 'climatiseur', 'ascenseur'],
            photos: ['https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800'],
            monthlyRent: 350,
            depositFee: 700,
            agentId: demoAgent.id,
            viewsCount: 142,
            likesCount: 28,
            available: true,
        },
        {
            title: 'Chambre en colocation FST Sousse',
            description: 'Chambre individuelle dans une colocation de 3 étudiants. 10 min à pieds de la Faculté Sousse.',
            price: 180,
            city: 'Sousse',
            location: 'Sahloul 1',
            category: client_1.PropertyCategory.CHAMBRE,
            surface: 14,
            rooms: 1,
            bedrooms: 1,
            bathrooms: 0,
            furnished: true,
            amenities: ['wifi', 'parking'],
            photos: ['https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800'],
            monthlyRent: 180,
            depositFee: 360,
            agentId: sofien.id,
            viewsCount: 89,
            likesCount: 15,
            available: true,
        },
        {
            title: 'Résidence universitaire Sfax centre-ville',
            description: 'Résidence sécurisée, 24/7 gardien. Chambres individuelles avec salle de bain privative.',
            price: 250,
            city: 'Sfax',
            location: 'Centre-Ville Sfax',
            category: client_1.PropertyCategory.RESIDENCE,
            surface: 22,
            rooms: 1,
            bedrooms: 1,
            bathrooms: 1,
            furnished: true,
            amenities: ['wifi', 'parking', 'gardien', 'restauration'],
            photos: ['https://images.unsplash.com/photo-1555854877-bab0e564b8d5?w=800'],
            monthlyRent: 250,
            depositFee: 500,
            agentId: demoAgent.id,
            viewsCount: 67,
            likesCount: 11,
            available: true,
        },
        {
            title: 'Appartement F2 Monastir proche faculté',
            description: 'Appartement T2 entièrement meublé. Idéal pour 2 étudiants en colocation.',
            price: 450,
            city: 'Monastir',
            location: 'Avenue Habib Bourguiba',
            category: client_1.PropertyCategory.COLOCATION,
            surface: 55,
            rooms: 2,
            bedrooms: 2,
            bathrooms: 1,
            furnished: true,
            amenities: ['wifi', 'climatiseur', 'ascenseur'],
            photos: ['https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800'],
            monthlyRent: 450,
            depositFee: 900,
            agentId: sofien.id,
            viewsCount: 54,
            likesCount: 9,
            available: true,
        },
        {
            title: 'Studio haut standing La Marsa',
            description: 'Studio de luxe neuf, vue sur mer. Près des grandes écoles privées.',
            price: 480,
            city: 'Tunis',
            location: 'La Marsa',
            category: client_1.PropertyCategory.STUDIO,
            surface: 35,
            rooms: 1,
            bedrooms: 1,
            bathrooms: 1,
            furnished: true,
            amenities: ['wifi', 'climatiseur', 'parking', 'vue_mer'],
            photos: ['https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800'],
            monthlyRent: 480,
            depositFee: 960,
            agentId: demoAgent.id,
            viewsCount: 201,
            likesCount: 45,
            available: true,
        },
        {
            title: 'Chambre Ariana étudiante ISG',
            description: "Chambre individuelle à 2 minutes de l'ISG. Colocation mixte 4 personnes.",
            price: 160,
            city: 'Ariana',
            location: 'Soukra',
            category: client_1.PropertyCategory.CHAMBRE,
            surface: 12,
            rooms: 1,
            bedrooms: 1,
            bathrooms: 0,
            furnished: true,
            amenities: ['wifi'],
            photos: ['https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=800'],
            monthlyRent: 160,
            depositFee: 320,
            agentId: mariem.id,
            viewsCount: 73,
            likesCount: 12,
            available: true,
        },
        {
            title: 'Studio meublé El Menzah 6',
            description: 'Studio lumineux, proche bus et métro. Idéal étudiant FST / IHEC.',
            price: 390,
            city: 'Tunis',
            location: 'El Menzah 6',
            category: client_1.PropertyCategory.STUDIO,
            surface: 30,
            rooms: 1,
            bedrooms: 1,
            bathrooms: 1,
            furnished: true,
            amenities: ['wifi', 'climatiseur', 'parking'],
            photos: ['https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=800&q=80'],
            monthlyRent: 390,
            depositFee: 780,
            agentId: mariem.id,
            viewsCount: 118,
            likesCount: 22,
            available: true,
        },
        {
            title: 'Colocation 3 chambres Manouba campus',
            description: 'Grande maison partagée, jardin, 5 min à pied de l’ISAMM.',
            price: 220,
            city: 'Manouba',
            location: 'Campus Manouba',
            category: client_1.PropertyCategory.COLOCATION,
            surface: 90,
            rooms: 4,
            bedrooms: 3,
            bathrooms: 2,
            furnished: true,
            amenities: ['wifi', 'parking', 'jardin'],
            photos: ['https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&q=80'],
            monthlyRent: 220,
            depositFee: 440,
            agentId: demoAgent.id,
            viewsCount: 95,
            likesCount: 18,
            available: true,
        },
    ];
    const cityGeo = [
        { key: 'el manar', lat: 36.8185, lng: 10.152 },
        { key: 'manar', lat: 36.8185, lng: 10.152 },
        { key: 'la marsa', lat: 36.8782, lng: 10.3248 },
        { key: 'marsa', lat: 36.8782, lng: 10.3248 },
        { key: 'el menzah', lat: 36.8455, lng: 10.1705 },
        { key: 'menzah', lat: 36.8455, lng: 10.1705 },
        { key: 'soukra', lat: 36.882, lng: 10.186 },
        { key: 'ariana', lat: 36.8665, lng: 10.1647 },
        { key: 'manouba', lat: 36.808, lng: 10.097 },
        { key: 'carthage', lat: 36.852, lng: 10.323 },
        { key: 'tunis', lat: 36.8065, lng: 10.1815 },
        { key: 'sahloul', lat: 35.841, lng: 10.598 },
        { key: 'sousse', lat: 35.8256, lng: 10.6411 },
        { key: 'sfax', lat: 34.7406, lng: 10.7603 },
        { key: 'monastir', lat: 35.777, lng: 10.826 },
    ];
    const resolveSeedGeo = (city, location, title) => {
        const hay = `${location || ''} ${city || ''} ${title || ''}`
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '');
        for (const c of cityGeo) {
            if (hay.includes(c.key))
                return { latitude: c.lat, longitude: c.lng };
        }
        return { latitude: 36.8065, longitude: 10.1815 };
    };
    const propertyIds = [];
    for (const p of properties) {
        const geo = resolveSeedGeo(p.city, p.location, p.title);
        const payload = { ...p, ...geo };
        const existing = await prisma.property.findFirst({
            where: { title: p.title, agentId: p.agentId },
            select: { id: true },
        });
        if (existing) {
            await prisma.property.update({ where: { id: existing.id }, data: payload });
            propertyIds.push(existing.id);
        }
        else {
            const created = await prisma.property.create({ data: payload });
            propertyIds.push(created.id);
        }
    }
    // Favoris / likes logements
    for (let i = 0; i < Math.min(4, propertyIds.length); i++) {
        await prisma.propertyFavorite.upsert({
            where: {
                userId_propertyId: { userId: byEmail('etudiant@studhub.tn'), propertyId: propertyIds[i] },
            },
            update: {},
            create: { userId: byEmail('etudiant@studhub.tn'), propertyId: propertyIds[i] },
        });
        await prisma.propertyLike.upsert({
            where: {
                userId_propertyId: { userId: byEmail('sarra@studhub.tn'), propertyId: propertyIds[i] },
            },
            update: {},
            create: { userId: byEmail('sarra@studhub.tn'), propertyId: propertyIds[i] },
        });
    }
    // =========================================================================
    // 4) Marketplace produits
    // =========================================================================
    console.log('🛒 Marketplace...');
    const products = [
        {
            title: 'MacBook Air M1 2020 — excellent état',
            description: '8 Go RAM, 256 Go SSD. Batterie 87 %. Chargeur inclus. Vendu car upgrade.',
            price: 1850,
            category: client_1.ProductCategory.ELECTRONIQUE,
            condition: client_1.ProductCondition.LIKE_NEW,
            photos: ['https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800'],
            location: 'Tunis',
            sellerId: byEmail('khalil@studhub.tn'),
            viewsCount: 156,
            likesCount: 31,
        },
        {
            title: 'Cours Maths Analyse L1/L2 — polycopiés',
            description: 'Pack polycopiés + exercices corrigés Faculté des Sciences.',
            price: 25,
            category: client_1.ProductCategory.LIVRES,
            condition: client_1.ProductCondition.USED,
            photos: ['https://images.unsplash.com/photo-1512820790803-83ca734da794?w=800'],
            location: 'Tunis',
            sellerId: byEmail('etudiant@studhub.tn'),
            viewsCount: 48,
            likesCount: 7,
        },
        {
            title: 'Bureau étudiant + chaise',
            description: 'Bureau 120 cm + chaise de bureau. À récupérer à El Manar.',
            price: 120,
            category: client_1.ProductCategory.MEUBLES,
            condition: client_1.ProductCondition.USED,
            photos: ['https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?w=800'],
            location: 'El Manar',
            sellerId: byEmail('sarra@studhub.tn'),
            viewsCount: 72,
            likesCount: 14,
        },
        {
            title: 'iPhone 12 128 Go',
            description: 'Batterie 84 %, coque + verre trempé offerts. Face ID OK.',
            price: 950,
            category: client_1.ProductCategory.ELECTRONIQUE,
            condition: client_1.ProductCondition.LIKE_NEW,
            photos: ['https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=800'],
            location: 'Ariana',
            sellerId: byEmail('amine@studhub.tn'),
            viewsCount: 203,
            likesCount: 42,
        },
        {
            title: 'Veste campus noire taille M',
            description: 'Peu portée, idéale pour l’hiver. Marque Zara.',
            price: 45,
            category: client_1.ProductCategory.VETEMENTS,
            condition: client_1.ProductCondition.LIKE_NEW,
            photos: ['https://images.unsplash.com/photo-1551028719-00167b16eac5?w=800'],
            location: 'Sousse',
            sellerId: byEmail('ines@studhub.tn'),
            viewsCount: 33,
            likesCount: 5,
        },
        {
            title: 'Lampe de bureau LED USB',
            description: 'Lampe flexible, 3 intensités. Parfaite pour révisions.',
            price: 35,
            category: client_1.ProductCategory.AUTRES,
            condition: client_1.ProductCondition.NEW,
            photos: ['https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=800'],
            location: 'Manouba',
            sellerId: byEmail('nour@studhub.tn'),
            viewsCount: 41,
            likesCount: 8,
        },
        {
            title: 'Livre Anatomie Gray — édition FR',
            description: 'État correct, annotations au crayon seulement.',
            price: 80,
            category: client_1.ProductCategory.LIVRES,
            condition: client_1.ProductCondition.USED,
            photos: ['https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=800'],
            location: 'Tunis',
            sellerId: byEmail('amine@studhub.tn'),
            viewsCount: 59,
            likesCount: 10,
        },
        {
            title: 'Casque Bluetooth Sony WH-CH520',
            description: 'Autonomie longue, micro clair pour cours en ligne.',
            price: 180,
            category: client_1.ProductCategory.ELECTRONIQUE,
            condition: client_1.ProductCondition.LIKE_NEW,
            photos: ['https://images.unsplash.com/photo-1546435770-a3e426bf472b?w=800'],
            location: 'Tunis',
            sellerId: byEmail('khalil@studhub.tn'),
            viewsCount: 88,
            likesCount: 19,
        },
    ];
    const productIds = [];
    for (const p of products) {
        const existing = await prisma.product.findFirst({
            where: { title: p.title, sellerId: p.sellerId },
            select: { id: true },
        });
        if (existing) {
            await prisma.product.update({ where: { id: existing.id }, data: p });
            productIds.push(existing.id);
        }
        else {
            const created = await prisma.product.create({ data: p });
            productIds.push(created.id);
        }
    }
    // =========================================================================
    // 5) Prestataires StudServices
    // =========================================================================
    console.log('🛠️ Services...');
    const providers = [
        {
            userId: byEmail('nour@studhub.tn'),
            category: client_1.ProviderCategory.GRAPHISME,
            title: 'Design logo & identité visuelle',
            bio: 'Création de logos et maquettes Figma — Fatoumata Camara, studios campus.',
            tier: client_1.ProviderTier.PREMIUM,
            priceStart: 80,
            priceEnd: 350,
            phoneContact: '+21655112233',
            emailContact: 'nour@studhub.tn',
            city: 'Tunis',
            portfolioUrls: ['https://images.unsplash.com/photo-1561070791-2526d30994b5?w=600'],
            ratingAvg: 4.8,
            reviewsCount: 12,
            isVerified: true,
        },
        {
            userId: byEmail('khalil@studhub.tn'),
            category: client_1.ProviderCategory.DEVELOPPEMENT_WEB,
            title: 'Sites web & apps React / Nest',
            bio: 'Dev fullstack par Kwame Mensah — projets PFE et petits business étudiants.',
            tier: client_1.ProviderTier.STANDARD,
            priceStart: 200,
            priceEnd: 1500,
            phoneContact: '+21622778899',
            emailContact: 'khalil@studhub.tn',
            city: 'Ariana',
            portfolioUrls: ['https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=600'],
            ratingAvg: 4.6,
            reviewsCount: 8,
            isVerified: true,
        },
        {
            userId: byEmail('etudiant@studhub.tn'),
            category: client_1.ProviderCategory.COURS_PARTICULIERS,
            title: 'Cours particuliers Algo & Programmation',
            bio: 'Soutien Licence 1–3 en Python, Java et bases de données.',
            tier: client_1.ProviderTier.GRATUIT,
            priceStart: 25,
            priceEnd: 40,
            phoneContact: '+21620000001',
            emailContact: 'etudiant@studhub.tn',
            city: 'Tunis',
            portfolioUrls: [],
            ratingAvg: 4.5,
            reviewsCount: 5,
            isVerified: false,
        },
        {
            userId: byEmail('ines@studhub.tn'),
            category: client_1.ProviderCategory.PHOTOGRAPHIE,
            title: 'Photos événements campus',
            bio: 'Couverture photo pour clubs, associations et soutenances.',
            tier: client_1.ProviderTier.STANDARD,
            priceStart: 100,
            priceEnd: 400,
            phoneContact: '+21650443322',
            city: 'Tunis',
            portfolioUrls: ['https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=600'],
            ratingAvg: 4.9,
            reviewsCount: 6,
            isVerified: true,
        },
        {
            userId: byEmail('sarra@studhub.tn'),
            category: client_1.ProviderCategory.COURS_LANGUES,
            title: 'Cours d’anglais conversationnel',
            bio: 'Préparation TOEIC / entretiens. Séances en ligne ou présentiel ESC.',
            tier: client_1.ProviderTier.STANDARD,
            priceStart: 30,
            priceEnd: 50,
            phoneContact: '+21620111222',
            city: 'Tunis',
            portfolioUrls: [],
            ratingAvg: 4.4,
            reviewsCount: 4,
            isVerified: false,
        },
    ];
    const providerIds = [];
    for (const p of providers) {
        const existing = await prisma.serviceProvider.findFirst({
            where: { userId: p.userId, title: p.title },
            select: { id: true },
        });
        if (existing) {
            await prisma.serviceProvider.update({ where: { id: existing.id }, data: p });
            providerIds.push(existing.id);
        }
        else {
            const created = await prisma.serviceProvider.create({ data: p });
            providerIds.push(created.id);
        }
    }
    // =========================================================================
    // 6) Feed posts + likes + commentaires
    // =========================================================================
    console.log('📱 Feed...');
    const posts = [
        {
            authorId: byEmail('ines@studhub.tn'),
            text: 'Hackathon Design Thinking ce samedi à l’ENAU — places limitées ! Qui vient ? 🎨',
            imageUrl: 'https://images.unsplash.com/photo-1515187029135-18ee286d815b?w=800',
            associationTag: 'Club Design ENAU',
            eventDate: daysAgo(-3),
            likesCount: 24,
            commentsCount: 5,
            createdAt: daysAgo(1),
        },
        {
            authorId: byEmail('khalil@studhub.tn'),
            text: 'Je cherche un binôme PFE en IA / NLP. Niveau Master ou 4e année ESPRIT/INSAT welcome.',
            associationTag: 'ESPRIT',
            likesCount: 18,
            commentsCount: 7,
            createdAt: daysAgo(2),
        },
        {
            authorId: byEmail('sarra@studhub.tn'),
            text: 'Coloc à El Manar : chambre libre dès le 1er du mois. Meubles inclus, 180 DT. DM !',
            imageUrl: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800',
            likesCount: 31,
            commentsCount: 9,
            createdAt: daysAgo(3),
        },
        {
            authorId: byEmail('amine@studhub.tn'),
            text: 'Session révision anatomie ce soir à la BU médecine. Apportez vos fiches 📚',
            associationTag: 'Fac Médecine',
            likesCount: 42,
            commentsCount: 11,
            createdAt: daysAgo(0),
        },
        {
            authorId: byEmail('etudiant@studhub.tn'),
            text: 'Nouveau sur StudHub : j’ai publié mes polycopiés Maths L1. Lien dans la marketplace !',
            likesCount: 15,
            commentsCount: 3,
            createdAt: daysAgo(4),
        },
        {
            authorId: byEmail('nour@studhub.tn'),
            text: 'Atelier Figma gratuit demain 18h — Club Entrepreneurs. Inscrivez-vous en commentaire.',
            imageUrl: 'https://images.unsplash.com/photo-1561070791-2526d30994b5?w=800',
            associationTag: 'Club Entrepreneurs',
            eventDate: daysAgo(-1),
            likesCount: 27,
            commentsCount: 8,
            createdAt: daysAgo(1),
        },
    ];
    const postIds = [];
    for (const p of posts) {
        const existing = await prisma.feedPost.findFirst({
            where: { authorId: p.authorId, text: p.text },
            select: { id: true },
        });
        if (existing) {
            await prisma.feedPost.update({
                where: { id: existing.id },
                data: {
                    imageUrl: p.imageUrl ?? null,
                    associationTag: p.associationTag ?? null,
                    eventDate: p.eventDate ?? null,
                    likesCount: p.likesCount,
                    commentsCount: p.commentsCount,
                },
            });
            postIds.push(existing.id);
        }
        else {
            const created = await prisma.feedPost.create({ data: p });
            postIds.push(created.id);
        }
    }
    // Likes + comments démo
    const likers = [
        byEmail('etudiant@studhub.tn'),
        byEmail('sarra@studhub.tn'),
        byEmail('amine@studhub.tn'),
        byEmail('nour@studhub.tn'),
        byEmail('khalil@studhub.tn'),
    ];
    for (const postId of postIds) {
        for (const userId of likers.slice(0, 3 + (postId % 3))) {
            await prisma.like.upsert({
                where: { postId_userId: { postId, userId } },
                update: {},
                create: { postId, userId },
            });
        }
    }
    const commentSamples = [
        { postIdx: 0, author: 'nour@studhub.tn', text: 'Je viens ! Tu peux m’envoyer le lien d’inscription ?' },
        { postIdx: 0, author: 'sarra@studhub.tn', text: 'Super initiative 👏' },
        { postIdx: 1, author: 'etudiant@studhub.tn', text: 'Moi aussi en NLP, on peut en parler en MP.' },
        { postIdx: 2, author: 'ines@studhub.tn', text: 'C’est encore dispo ? Je suis intéressée.' },
        { postIdx: 3, author: 'khalil@studhub.tn', text: 'Bonne session, j’arrive vers 20h.' },
        { postIdx: 5, author: 'amine@studhub.tn', text: 'Inscrit ✅' },
    ];
    for (const c of commentSamples) {
        const postId = postIds[c.postIdx];
        if (!postId)
            continue;
        const authorId = byEmail(c.author);
        const exists = await prisma.comment.findFirst({
            where: { postId, authorId, text: c.text },
            select: { id: true },
        });
        if (!exists) {
            await prisma.comment.create({ data: { postId, authorId, text: c.text } });
        }
    }
    // =========================================================================
    // 7) Avis
    // =========================================================================
    console.log('⭐ Avis...');
    if (propertyIds[0]) {
        const exists = await prisma.review.findFirst({
            where: {
                authorId: byEmail('sarra@studhub.tn'),
                propertyId: propertyIds[0],
                targetType: client_1.ReviewTargetType.PROPERTY,
            },
        });
        if (!exists) {
            await prisma.review.create({
                data: {
                    authorId: byEmail('sarra@studhub.tn'),
                    targetType: client_1.ReviewTargetType.PROPERTY,
                    propertyId: propertyIds[0],
                    rating: 5,
                    comment: 'Studio nickel, agent très réactif. Je recommande !',
                },
            });
        }
    }
    if (productIds[0]) {
        const exists = await prisma.review.findFirst({
            where: {
                authorId: byEmail('etudiant@studhub.tn'),
                productId: productIds[0],
                targetType: client_1.ReviewTargetType.PRODUCT,
            },
        });
        if (!exists) {
            await prisma.review.create({
                data: {
                    authorId: byEmail('etudiant@studhub.tn'),
                    targetType: client_1.ReviewTargetType.PRODUCT,
                    productId: productIds[0],
                    rating: 5,
                    comment: 'MacBook comme neuf, transaction rapide.',
                },
            });
        }
    }
    if (providerIds[0]) {
        const exists = await prisma.review.findFirst({
            where: {
                authorId: byEmail('khalil@studhub.tn'),
                providerId: providerIds[0],
                targetType: client_1.ReviewTargetType.PROVIDER,
            },
        });
        if (!exists) {
            await prisma.review.create({
                data: {
                    authorId: byEmail('khalil@studhub.tn'),
                    targetType: client_1.ReviewTargetType.PROVIDER,
                    providerId: providerIds[0],
                    rating: 5,
                    comment: 'Logo parfait pour notre club, délais respectés.',
                },
            });
        }
    }
    // =========================================================================
    // 8) Conversations chat
    // =========================================================================
    console.log('💬 Messages...');
    const studentId = byEmail('etudiant@studhub.tn');
    let convAgent = await prisma.conversation.findFirst({
        where: { studentId, agentId: demoAgent.id },
    });
    if (!convAgent) {
        convAgent = await prisma.conversation.create({
            data: {
                type: client_1.ConversationType.DIRECT,
                studentId,
                agentId: demoAgent.id,
                lastMessage: 'Bonjour, le studio El Manar est-il encore disponible ?',
                lastMessageAt: daysAgo(0),
                unreadAgentCount: 1,
                messages: {
                    create: [
                        {
                            studentSenderId: studentId,
                            content: 'Bonjour, le studio El Manar est-il encore disponible ?',
                            createdAt: daysAgo(1),
                        },
                        {
                            agentSenderId: demoAgent.id,
                            content: 'Bonjour ! Oui il est libre. Je peux vous organiser une visite demain 16h.',
                            createdAt: daysAgo(0),
                            readAt: new Date(),
                        },
                        {
                            studentSenderId: studentId,
                            content: 'Parfait, merci ! Je confirme pour 16h.',
                            createdAt: daysAgo(0),
                        },
                    ],
                },
            },
        });
    }
    const peerId = byEmail('khalil@studhub.tn');
    let convPeer = await prisma.conversation.findFirst({
        where: { studentId, peerStudentId: peerId },
    });
    if (!convPeer) {
        await prisma.conversation.create({
            data: {
                type: client_1.ConversationType.DIRECT,
                studentId,
                peerStudentId: peerId,
                lastMessage: 'Le MacBook est toujours à vendre ?',
                lastMessageAt: daysAgo(1),
                unreadStudentCount: 0,
                messages: {
                    create: [
                        {
                            studentSenderId: studentId,
                            content: 'Salut, le MacBook Air est toujours dispo ?',
                            createdAt: daysAgo(2),
                        },
                        {
                            studentSenderId: peerId,
                            content: 'Oui ! On peut se voir à ESPRIT demain si tu veux.',
                            createdAt: daysAgo(1),
                        },
                    ],
                },
            },
        });
    }
    // =========================================================================
    // 9) Partenaires + annonces
    // =========================================================================
    console.log('🤝 Partenaires...');
    const partners = [
        {
            name: 'Talan Tunisie',
            category: 'Entreprise IT',
            offer: "Stages & offres d'emploi pour étudiants",
            description: 'Talan recrute chaque année des stagiaires PFE et des jeunes diplômés en développement, data et conseil.',
            discount: 'Stages',
            logoUrl: 'https://images.unsplash.com/photo-1560179707-f14e90ef3623?q=80&w=200&auto=format&fit=crop',
            coverUrl: 'https://images.unsplash.com/photo-1497366216548-37526070297c?q=80&w=800&auto=format&fit=crop',
            websiteUrl: 'https://talan.com',
            phone: '71234567',
            email: 'recrutement@demo.studhub.tn',
            city: 'Tunis',
            address: 'Lac 2, Tunis',
            sortOrder: 1,
            viewsCount: 342,
            likesCount: 78,
            clicksCount: 45,
        },
        {
            name: 'Baobab Digital Dakar',
            category: 'Startup tech',
            offer: 'Stages remote & mentoring tech',
            description: 'Hub tech sénégalais : stages remote, mentoring et bootcamps pour étudiants africains (démo StudHub).',
            discount: 'Stages',
            logoUrl: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?q=80&w=200&auto=format&fit=crop',
            coverUrl: 'https://images.unsplash.com/photo-1515187029135-18ee286d815b?q=80&w=800&auto=format&fit=crop',
            city: 'Dakar',
            address: 'Plateau, Dakar',
            sortOrder: 2,
            viewsCount: 214,
            likesCount: 66,
            clicksCount: 31,
        },
        {
            name: 'Maison Teranga',
            category: 'Ameublement',
            offer: '-15% mobilier étudiant',
            description: 'Meubles et déco par Awa Touré : bureaux, lits et rangements à prix étudiant (démo StudHub).',
            discount: '-15%',
            promoCode: 'STUDHUB15',
            logoUrl: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?q=80&w=200&auto=format&fit=crop',
            coverUrl: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?q=80&w=800&auto=format&fit=crop',
            websiteUrl: 'https://example.com',
            phone: '98765432',
            email: 'contact@maison-teranga.demo',
            city: 'Tunis',
            sortOrder: 3,
            viewsCount: 410,
            likesCount: 97,
            clicksCount: 84,
        },
        {
            name: 'Café Kola Abidjan',
            category: 'Restauration',
            offer: '-10% boissons & snacks',
            description: 'Café campus fondé par Kouassi Yao : -10 % avec le code démo pour étudiants.',
            discount: '-10%',
            promoCode: 'KOLA10',
            logoUrl: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?q=80&w=200&auto=format&fit=crop',
            coverUrl: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?q=80&w=800&auto=format&fit=crop',
            phone: '55112233',
            city: 'Abidjan',
            address: 'Cocody, près des campus',
            sortOrder: 4,
            viewsCount: 154,
            likesCount: 42,
            clicksCount: 51,
        },
        {
            name: 'Librairie Sankofa',
            category: 'Librairie',
            offer: '-20% manuels universitaires',
            description: 'Manuels et romans africains — gérée par Fatou Bamba (démo StudHub).',
            discount: '-20%',
            promoCode: 'SANKOFA20',
            logoUrl: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?q=80&w=200&auto=format&fit=crop',
            coverUrl: 'https://images.unsplash.com/photo-1481627834876-b7833e1d843b?q=80&w=800&auto=format&fit=crop',
            phone: '71220011',
            email: 'hello@sankofa.demo',
            city: 'Sfax',
            sortOrder: 5,
            viewsCount: 128,
            likesCount: 35,
            clicksCount: 22,
        },
        {
            name: 'Club Ubuntu ESPRIT',
            category: 'Association étudiante',
            offer: 'Ateliers & networking panafricain',
            description: 'Association étudiante : pitchs, hackathons et rencontres avec entrepreneurs d’Afrique de l’Ouest.',
            discount: 'Gratuit',
            logoUrl: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?q=80&w=200&auto=format&fit=crop',
            coverUrl: 'https://images.unsplash.com/photo-1515187029135-18ee286d815b?q=80&w=800&auto=format&fit=crop',
            city: 'Ariana',
            address: 'Campus ESPRIT',
            sortOrder: 6,
            viewsCount: 196,
            likesCount: 61,
            clicksCount: 28,
        },
        {
            name: 'Nexus Mobile Accra',
            category: 'Télécoms',
            offer: 'Forfait étudiant data + appels',
            description: 'Offre campus fictive : data week-end et réduction annuelle pour étudiants.',
            discount: '-25%',
            promoCode: 'NEXUSSTUD',
            logoUrl: 'https://images.unsplash.com/photo-1556656793-08538906a9f8?q=80&w=200&auto=format&fit=crop',
            coverUrl: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=800&auto=format&fit=crop',
            phone: '71000000',
            city: 'Accra',
            sortOrder: 7,
            viewsCount: 267,
            likesCount: 55,
            clicksCount: 39,
        },
        {
            name: 'FitSahel Club',
            category: 'Sport & bien-être',
            offer: '1 mois offert + -20% abonnement',
            description: 'Salle partenaire près des campus — coaching par Ibrahima Sow (démo).',
            discount: '1 mois offert',
            promoCode: 'FITSAHEL',
            logoUrl: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=200&auto=format&fit=crop',
            coverUrl: 'https://images.unsplash.com/photo-1571902943202-507ec2618e8f?q=80&w=800&auto=format&fit=crop',
            phone: '71223344',
            city: 'Ariana',
            sortOrder: 8,
            viewsCount: 189,
            likesCount: 48,
            clicksCount: 33,
        },
    ];
    const partnerIds = [];
    const activeNames = partners.map((p) => p.name);
    for (const p of partners) {
        const existing = await prisma.partner.findFirst({ where: { name: p.name }, select: { id: true } });
        if (existing) {
            await prisma.partner.update({ where: { id: existing.id }, data: { ...p, isActive: true } });
            partnerIds.push({ id: existing.id, name: p.name });
        }
        else {
            const created = await prisma.partner.create({ data: { ...p, isActive: true } });
            partnerIds.push({ id: created.id, name: p.name });
        }
    }
    // Masquer les anciennes fiches démo non renommées
    await prisma.partner.updateMany({
        where: { name: { notIn: activeNames } },
        data: { isActive: false },
    });
    // Libérer les emails de connexion démo (évite conflit unique loginEmail)
    await prisma.partner.updateMany({
        where: { loginEmail: { in: ['partner@studhub.tn', 'instadeco@studhub.tn'] } },
        data: { loginEmail: null, passwordHash: null },
    });
    const talan = partnerIds.find((p) => p.name === 'Talan Tunisie');
    if (talan) {
        await prisma.partner.update({
            where: { id: talan.id },
            data: { loginEmail: 'partner@studhub.tn', passwordHash },
        });
        const announcements = [
            {
                title: 'Ouverture stages PFE 2026',
                description: 'Plus de 40 postes PFE en développement, data et cyber. Candidatures jusqu’à fin novembre.',
                discount: 'Stages',
                promoCode: null,
                imageUrl: 'https://images.unsplash.com/photo-1521737711867-e3b97375f902?w=800',
                isActive: true,
                validUntil: daysAgo(-60),
            },
            {
                title: 'Job Dating Campus Lac',
                description: 'Rencontrez nos recruteurs le 15 octobre au Lac 2. CV papier ou LinkedIn.',
                discount: 'Gratuit',
                promoCode: null,
                imageUrl: 'https://images.unsplash.com/photo-1551836022-d5d88e9218df?w=800',
                isActive: true,
                validUntil: daysAgo(-20),
            },
            {
                title: 'Programme Young Talent',
                description: 'CDI juniors pour diplômés 2025–2026. Formation interne 3 mois incluse.',
                discount: 'CDI',
                promoCode: 'TALANYT',
                imageUrl: null,
                isActive: true,
                validUntil: null,
            },
        ];
        for (const a of announcements) {
            const exists = await prisma.partnerAnnouncement.findFirst({
                where: { partnerId: talan.id, title: a.title },
                select: { id: true },
            });
            if (exists) {
                await prisma.partnerAnnouncement.update({ where: { id: exists.id }, data: a });
            }
            else {
                await prisma.partnerAnnouncement.create({ data: { partnerId: talan.id, ...a } });
            }
        }
    }
    const maison = partnerIds.find((p) => p.name === 'Maison Teranga');
    if (maison) {
        const a = {
            title: 'Soldes rentrée étudiant',
            description: 'Jusqu’à -30 % sur bureaux et lits mezzanine avec code STUDHUB15.',
            discount: '-30%',
            promoCode: 'STUDHUB15',
            isActive: true,
            validUntil: daysAgo(-45),
        };
        const exists = await prisma.partnerAnnouncement.findFirst({
            where: { partnerId: maison.id, title: a.title },
        });
        if (!exists) {
            await prisma.partnerAnnouncement.create({ data: { partnerId: maison.id, ...a } });
        }
        await prisma.partner.update({
            where: { id: maison.id },
            data: {
                loginEmail: 'instadeco@studhub.tn',
                passwordHash,
            },
        });
    }
    console.log('');
    console.log('✅ SEED TERMINÉ — prêt pour la présentation !');
    console.log('');
    console.log('🎓 Étudiants (mdp = Azerty123) :');
    console.log('   etudiant@studhub.tn  | sarra@studhub.tn | amine@studhub.tn');
    console.log('   nour@studhub.tn      | khalil@studhub.tn | ines@studhub.tn');
    console.log('🏢 Agents (mdp = Azerty123) :');
    console.log('   agent@studhub.tn | mariem@studhub.tn | sofien@studhub.tn');
    console.log('🤝 Partenaires (mdp = Azerty123) :');
    console.log('   partner@studhub.tn (Talan) | instadeco@studhub.tn');
    console.log('🔑 Admin : admin@studhub.tn / Admin@123456');
    console.log(`📊 Contenu : ${propertyIds.length} logements, ${productIds.length} produits, ${providerIds.length} services, ${postIds.length} posts, ${partnerIds.length} partenaires.`);
}
main()
    .then(async () => {
    await prisma.$disconnect();
})
    .catch(async (e) => {
    console.error('❌ ERREUR SEED :', e);
    await prisma.$disconnect();
    process.exit(1);
});
