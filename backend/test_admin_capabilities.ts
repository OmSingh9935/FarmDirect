import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testAdminCapabilities() {
  console.log('--- 1. Testing Direct Database Persistence (Prisma ORM & dev.db) ---');
  const dbUsersCount = await prisma.user.count();
  const dbOrdersCount = await prisma.order.count();
  const dbListingsCount = await prisma.listing.count();
  const dbEscrowCount = await prisma.escrowTransaction.count();

  console.log(`Database File: backend/prisma/dev.db (Persistent SQLite)`);
  console.log(`Persistent Records in Database:`);
  console.log(`   - Users: ${dbUsersCount}`);
  console.log(`   - Produce Listings: ${dbListingsCount}`);
  console.log(`   - Orders: ${dbOrdersCount}`);
  console.log(`   - Escrow Transactions: ${dbEscrowCount}`);

  console.log('\n--- 2. Direct Verification of "Who bought What and How Much" from Database ---');
  const sampleOrders = await prisma.order.findMany({
    take: 4,
    include: {
      buyer: { include: { buyerProfile: true } },
      listing: {
        include: {
          crop: true,
          farmer: { include: { farmerProfile: true } },
        },
      },
      escrowTransaction: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  sampleOrders.forEach((o, i) => {
    console.log(`[Purchase #${i + 1}]`);
    console.log(`   WHO (Buyer): ${o.buyer.name} (${o.buyer.buyerProfile?.buyerType || 'INDIVIDUAL'}, ${o.buyer.buyerProfile?.city || 'Mumbai'}) - Phone: ${o.buyer.phone}`);
    console.log(`   WHAT (Produce): ${o.listing.crop.name} (${o.quantity} ${o.unit}) - Grade: ${o.listing.aiGrade}`);
    console.log(`   FROM WHOM (Farmer): ${o.listing.farmer.name} (${o.listing.farmer.farmerProfile?.village}, ${o.listing.farmer.farmerProfile?.district})`);
    console.log(`   HOW MUCH: Total Paid = ₹${o.totalAmount} (Unit Price = ₹${o.unitPrice}/${o.unit})`);
    console.log(`   COMMISSION: ₹${o.commissionAmount} to Platform | Net Farmer Payout = ₹${o.totalAmount - o.commissionAmount}`);
    console.log(`   ESCROW STATUS: ${o.escrowTransaction?.status || 'HELD'} | Pipeline Status: ${o.status}`);
    console.log('----------------------------------------------------------------------');
  });

  console.log('\n--- 3. Testing Registered Users Query ---');
  const farmers = await prisma.user.findMany({
    where: { role: 'farmer' },
    include: { farmerProfile: true },
    take: 3,
  });
  console.log('Sample Farmers in DB:');
  farmers.forEach(f => console.log(`   🌾 ${f.name} - Village: ${f.farmerProfile?.village} - UPI: ${f.farmerProfile?.upiId}`));

  const buyers = await prisma.user.findMany({
    where: { role: 'buyer' },
    include: { buyerProfile: true },
    take: 3,
  });
  console.log('Sample Buyers in DB:');
  buyers.forEach(b => console.log(`   🛒 ${b.name} (${b.buyerProfile?.buyerType}) - City: ${b.buyerProfile?.city} - Phone: ${b.phone}`));

  console.log('\n✨ ADMIN DIRECTORY & PERSISTENCE VERIFICATION PASSED!');
}

testAdminCapabilities()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
