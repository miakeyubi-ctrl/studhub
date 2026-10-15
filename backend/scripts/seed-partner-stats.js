const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const DEMO = [
  {
    name: 'Talan Tunisie',
    category: 'Entreprise IT',
    offer: "Stages & offres d'emploi pour étudiants",
    description:
      'Talan recrute chaque année des stagiaires PFE et des jeunes diplômés en développement, data et conseil. (Démo StudHub)',
    discount: 'Stages',
    logoUrl: 'https://images.unsplash.com/photo-1560179707-f14e90ef3623?q=80&w=200&auto=format&fit=crop',
    coverUrl: 'https://images.unsplash.com/photo-1497366216548-37526070297c?q=80&w=800&auto=format&fit=crop',
    websiteUrl: 'https://talan.com',
    phone: '71234567',
    email: 'recrutement@demo.studhub.tn',
    city: 'Tunis',
    address: 'Lac 2, Tunis',
    isActive: true,
    sortOrder: 1,
    viewsCount: 128,
    likesCount: 34,
    clicksCount: 19,
  },
  {
    name: 'Club Entrepreneurs ESPRIT',
    category: 'Association étudiante',
    offer: 'Ateliers et événements networking',
    description:
      'Ateliers pitch, rencontres avec des fondateurs de startups et hackathons tout au long de l’année. (Démo StudHub)',
    discount: 'Gratuit',
    logoUrl: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?q=80&w=200&auto=format&fit=crop',
    coverUrl: 'https://images.unsplash.com/photo-1515187029135-18ee286d815b?q=80&w=800&auto=format&fit=crop',
    city: 'Ariana',
    address: 'Campus ESPRIT',
    isActive: true,
    sortOrder: 2,
    viewsCount: 96,
    likesCount: 41,
    clicksCount: 12,
  },
  {
    name: 'InstaDeco',
    category: 'Ameublement',
    offer: '-15% sur le mobilier étudiant',
    description:
      'Bureaux, lits, rangements : 15 % de réduction sur présentation de la carte étudiante ou avec le code promo. (Démo StudHub)',
    discount: '-15%',
    promoCode: 'STUDHUB15',
    logoUrl: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?q=80&w=200&auto=format&fit=crop',
    coverUrl: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?q=80&w=800&auto=format&fit=crop',
    websiteUrl: 'https://example.com',
    phone: '98765432',
    email: 'contact@instadeco.demo',
    city: 'Tunis',
    isActive: true,
    sortOrder: 3,
    viewsCount: 210,
    likesCount: 67,
    clicksCount: 54,
  },
  {
    name: 'Campus Café',
    category: 'Restauration',
    offer: '-10% sur boissons & snacks',
    description:
      'Café étudiant partenaire StudHub : -10 % sur boissons et snacks avec le code démo. (Démo StudHub)',
    discount: '-10%',
    promoCode: 'CAMPUS10',
    logoUrl: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?q=80&w=200&auto=format&fit=crop',
    coverUrl: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?q=80&w=800&auto=format&fit=crop',
    phone: '55112233',
    city: 'Sousse',
    address: 'Près du campus',
    isActive: true,
    sortOrder: 4,
    viewsCount: 74,
    likesCount: 22,
    clicksCount: 31,
  },
  {
    name: 'BookCorner',
    category: 'Librairie',
    offer: '-20% sur les manuels universitaires',
    description:
      'Librairie partenaire : -20 % sur les manuels et fournitures pour étudiants. (Démo StudHub)',
    discount: '-20%',
    promoCode: 'BOOKS20',
    logoUrl: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?q=80&w=200&auto=format&fit=crop',
    coverUrl: 'https://images.unsplash.com/photo-1481627834876-b7833e1d843b?q=80&w=800&auto=format&fit=crop',
    phone: '71220011',
    email: 'hello@bookcorner.demo',
    city: 'Sfax',
    isActive: true,
    sortOrder: 5,
    viewsCount: 58,
    likesCount: 15,
    clicksCount: 9,
  },
];

async function main() {
  for (const p of DEMO) {
    const existing = await prisma.partner.findFirst({ where: { name: p.name }, select: { id: true } });
    if (existing) {
      await prisma.partner.update({ where: { id: existing.id }, data: p });
      console.log('updated', p.name);
    } else {
      await prisma.partner.create({ data: p });
      console.log('created', p.name);
    }
  }
  const all = await prisma.partner.findMany({
    select: { id: true, name: true, viewsCount: true, likesCount: true, clicksCount: true },
    orderBy: { sortOrder: 'asc' },
  });
  console.log(JSON.stringify(all, null, 2));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
