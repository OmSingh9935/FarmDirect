import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🧹 Purging all legacy demo & mock accounts...');

  // Find all legacy demo users (*.test or mock profiles)
  const demoUsers = await prisma.user.findMany({
    where: {
      OR: [
        { email: { endsWith: '@farmdirect.test' } },
        { email: { contains: '.test' } },
        {
          email: {
            in: [
              'ramesh.farmer@farmdirect.test',
              'priya.buyer@farmdirect.test',
              'greenfresh.fpo@farmdirect.test',
              'rajesh.admin@farmdirect.test',
              'balwinder.singh@farmdirect.test',
              'anandi.patel@farmdirect.test',
              'suresh.ghorpade@farmdirect.test',
              'mahendra.yadav@farmdirect.test',
              'jagdish.prasad@farmdirect.test',
              'manjula.devi@farmdirect.test',
              'harpreet.kaur@farmdirect.test',
              'pandurang.shinde@farmdirect.test',
              'narayan.murthy@farmdirect.test',
              'ashok.jadhav@farmdirect.test',
              'ramratan.meena@farmdirect.test',
              'govind.kelkar@farmdirect.test',
              'dilip.patil@farmdirect.test',
              'bhikaji.sawant@farmdirect.test',
              'amit.deshmukh@farmdirect.test',
              'sahyadri.fpo@farmdirect.test',
              'sunita.reddy@farmdirect.test',
              'urbanharvest@farmdirect.test',
              'vikas.malhotra@farmdirect.test',
              'ananya.sen@farmdirect.test',
              'freshroots@farmdirect.test',
              'deepak.joshi@farmdirect.test',
            ],
          },
        },
      ],
    },
  });

  const demoUserIds = demoUsers.map((u) => u.id);

  if (demoUserIds.length > 0) {
    console.log(`Found ${demoUserIds.length} demo accounts to purge.`);

    await prisma.dispute.deleteMany({
      where: {
        order: {
          OR: [
            { buyerId: { in: demoUserIds } },
            { listing: { farmerId: { in: demoUserIds } } },
          ],
        },
      },
    });

    await prisma.rating.deleteMany({
      where: {
        OR: [
          { authorId: { in: demoUserIds } },
          { farmerProfile: { userId: { in: demoUserIds } } },
        ],
      },
    });

    await prisma.dispatch.deleteMany({
      where: {
        order: {
          OR: [
            { buyerId: { in: demoUserIds } },
            { listing: { farmerId: { in: demoUserIds } } },
          ],
        },
      },
    });

    await prisma.hubIntake.deleteMany({
      where: {
        order: {
          OR: [
            { buyerId: { in: demoUserIds } },
            { listing: { farmerId: { in: demoUserIds } } },
          ],
        },
      },
    });

    await prisma.escrowTransaction.deleteMany({
      where: {
        order: {
          OR: [
            { buyerId: { in: demoUserIds } },
            { listing: { farmerId: { in: demoUserIds } } },
          ],
        },
      },
    });

    await prisma.order.deleteMany({
      where: {
        OR: [
          { buyerId: { in: demoUserIds } },
          { listing: { farmerId: { in: demoUserIds } } },
        ],
      },
    });

    await prisma.listing.deleteMany({
      where: { farmerId: { in: demoUserIds } },
    });

    await prisma.farmerProfile.deleteMany({
      where: { userId: { in: demoUserIds } },
    });

    await prisma.buyerProfile.deleteMany({
      where: { userId: { in: demoUserIds } },
    });

    await prisma.notification.deleteMany({
      where: { userId: { in: demoUserIds } },
    });

    await prisma.user.deleteMany({
      where: { id: { in: demoUserIds } },
    });

    console.log('✅ Purged all demo accounts, mock listings, and test orders.');
  }

  // Clear any legacy OTP codes
  await prisma.otpCode.deleteMany();

  console.log('🏛️ Initializing / Updating Platform Admin (Om Singh)...');
  const adminPasswordHash = await bcrypt.hash('Omsingh@123', 10);
  await prisma.user.upsert({
    where: { email: 'omsingh203090@gmail.com' },
    update: {
      password: adminPasswordHash,
      role: 'hub_admin',
      name: 'Om Singh (Platform Admin & Hub Lead)',
      phone: '+91 98200 11223',
    },
    create: {
      email: 'omsingh203090@gmail.com',
      name: 'Om Singh (Platform Admin & Hub Lead)',
      role: 'hub_admin',
      phone: '+91 98200 11223',
      password: adminPasswordHash,
    },
  });
  console.log('✅ Official Platform Admin ready: omsingh203090@gmail.com');

  console.log('🌾 Ensuring Standard Agricultural Crops & Threshold Configurations...');
  const cropsData = [
    {
      name: 'Tomatoes (Hybrid Ripe)',
      category: 'Vegetables',
      unit: 'kg',
      basePricePerKg: 28.0,
      description: 'Firm, glossy red hybrid tomatoes ideal for retail, cooking, and institutional use.',
      thresholdQuintal: 0.5,
      commission: 5.0,
      mandiModal: 28,
    },
    {
      name: 'Red Onions (Nashik Quality)',
      category: 'Vegetables',
      unit: 'kg',
      basePricePerKg: 34.0,
      description: 'Pungent, high-dry-matter pink-red onions from Nashik belt with extended shelf life.',
      thresholdQuintal: 0.5,
      commission: 5.0,
      mandiModal: 33,
    },
    {
      name: 'Potatoes (Chipsona/Jyoti)',
      category: 'Vegetables',
      unit: 'kg',
      basePricePerKg: 24.0,
      description: 'Uniform oval tubers, low sugar content, perfect for culinary and commercial use.',
      thresholdQuintal: 0.5,
      commission: 4.5,
      mandiModal: 24,
    },
    {
      name: 'Basmati Rice (1121 Steam)',
      category: 'Grains',
      unit: 'kg',
      basePricePerKg: 88.0,
      description: 'Aromatic extra-long grain aged basmati, exceptional aroma and elongation on cooking.',
      thresholdQuintal: 0.5,
      commission: 4.0,
      mandiModal: 86,
    },
    {
      name: 'Alphonso Mangoes (Devgad GI)',
      category: 'Fruits',
      unit: 'kg',
      basePricePerKg: 260.0,
      description: 'Geographically indicated authentic Devgad Hapus, naturally ripened with saffron pulp.',
      thresholdQuintal: 0.5,
      commission: 6.0,
      mandiModal: 255,
    },
    {
      name: 'Green G4 Hot Chillies',
      category: 'Spices',
      unit: 'kg',
      basePricePerKg: 68.0,
      description: 'High pungency shiny green chillies, harvested fresh with green calyx intact.',
      thresholdQuintal: 0.3,
      commission: 5.0,
      mandiModal: 67,
    },
    {
      name: 'Sharbati Wheat Grain',
      category: 'Grains',
      unit: 'kg',
      basePricePerKg: 42.0,
      description: 'Golden heavy grains from black soil belt, high protein and gluten index for soft rotis.',
      thresholdQuintal: 0.5,
      commission: 4.0,
      mandiModal: 41,
    },
  ];

  for (const c of cropsData) {
    let crop = await prisma.crop.findFirst({ where: { name: c.name } });
    if (!crop) {
      crop = await prisma.crop.create({
        data: {
          name: c.name,
          category: c.category,
          unit: c.unit,
          basePricePerKg: c.basePricePerKg,
          description: c.description,
          threshold: {
            create: {
              quintalEquivalentThreshold: c.thresholdQuintal,
              commissionPercentage: c.commission,
            },
          },
        },
      });
    }

    // Ensure Mandi Reference Prices
    const existingMandi = await prisma.mandiReferencePrice.findFirst({ where: { cropId: crop.id } });
    if (!existingMandi) {
      await prisma.mandiReferencePrice.create({
        data: {
          cropId: crop.id,
          region: 'State APMC Central Market',
          state: 'Maharashtra',
          minPrice: Math.round(c.basePricePerKg * 0.88),
          maxPrice: Math.round(c.basePricePerKg * 1.15),
          modalPrice: c.mandiModal,
        },
      });
    }
  }

  console.log('✨ Seed complete: Real accounts only! All real user listings and orders are preserved.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
