"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function main() {
    console.log('🌱 Clearing existing database tables...');
    await prisma.notification.deleteMany();
    await prisma.dispute.deleteMany();
    await prisma.rating.deleteMany();
    await prisma.dispatch.deleteMany();
    await prisma.hubIntake.deleteMany();
    await prisma.escrowTransaction.deleteMany();
    await prisma.order.deleteMany();
    await prisma.listing.deleteMany();
    await prisma.mandiReferencePrice.deleteMany();
    await prisma.cropThreshold.deleteMany();
    await prisma.crop.deleteMany();
    await prisma.otpCode.deleteMany();
    await prisma.farmerProfile.deleteMany();
    await prisma.buyerProfile.deleteMany();
    await prisma.user.deleteMany();
    console.log('🏛️ Creating Hub Operations Admin...');
    const adminUser = await prisma.user.create({
        data: {
            email: 'rajesh.admin@farmdirect.test',
            name: 'Rajesh Verma (Hub Operations Lead)',
            role: 'hub_admin',
            phone: '+91 98200 11223',
        },
    });
    console.log('🌾 Seeding Crops & DB Threshold Configurations (0.5 quintal default)...');
    const cropsData = [
        {
            name: 'Tomatoes (Hybrid Ripe)',
            category: 'Vegetables',
            unit: 'kg',
            basePricePerKg: 28.0,
            description: 'Firm, glossy red hybrid tomatoes ideal for salads, cooking, and canning.',
            thresholdQuintal: 0.5, // 50 kg
            commission: 5.0,
        },
        {
            name: 'Red Onions (Nashik Quality)',
            category: 'Vegetables',
            unit: 'kg',
            basePricePerKg: 34.0,
            description: 'Pungent, high-dry-matter pink-red onions from Nashik belt with 3-month shelf life.',
            thresholdQuintal: 0.5,
            commission: 5.0,
        },
        {
            name: 'Potatoes (Chipsona/Jyoti)',
            category: 'Vegetables',
            unit: 'kg',
            basePricePerKg: 24.0,
            description: 'Uniform oval tubers, low sugar content, perfect for culinary and commercial use.',
            thresholdQuintal: 0.5,
            commission: 4.5,
        },
        {
            name: 'Basmati Rice (1121 Steam)',
            category: 'Grains',
            unit: 'kg',
            basePricePerKg: 88.0,
            description: 'Aromatic extra-long grain aged basmati, grain elongation up to 22mm on cooking.',
            thresholdQuintal: 0.5,
            commission: 4.0,
        },
        {
            name: 'Alphonso Mangoes (Devgad GI)',
            category: 'Fruits',
            unit: 'kg',
            basePricePerKg: 260.0,
            description: 'Geographically indicated authentic Devgad Hapus, naturally ripened with saffron pulp.',
            thresholdQuintal: 0.5,
            commission: 6.0,
        },
        {
            name: 'Green G4 Hot Chillies',
            category: 'Spices',
            unit: 'kg',
            basePricePerKg: 68.0,
            description: 'High pungency shiny green chillies, harvested fresh with green calyx intact.',
            thresholdQuintal: 0.3, // 30 kg for high value spice
            commission: 5.0,
        },
        {
            name: 'Sharbati Wheat Grain',
            category: 'Grains',
            unit: 'kg',
            basePricePerKg: 42.0,
            description: 'Golden heavy grains from Sehore black soil, high gluten index for soft rotis.',
            thresholdQuintal: 0.5,
            commission: 4.0,
        },
    ];
    const createdCrops = {};
    for (const c of cropsData) {
        const crop = await prisma.crop.create({
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
        createdCrops[c.name] = crop;
    }
    console.log('📊 Seeding APMC Mandi Benchmark Feeds...');
    const mandiEntries = [
        { cropName: 'Tomatoes (Hybrid Ripe)', region: 'Nashik APMC', state: 'Maharashtra', min: 24, max: 32, modal: 28 },
        { cropName: 'Tomatoes (Hybrid Ripe)', region: 'Azadpur Mandi', state: 'Delhi', min: 26, max: 35, modal: 30 },
        { cropName: 'Tomatoes (Hybrid Ripe)', region: 'Vashi APMC', state: 'Maharashtra', min: 25, max: 33, modal: 29 },
        { cropName: 'Red Onions (Nashik Quality)', region: 'Lasalgaon APMC', state: 'Maharashtra', min: 29, max: 38, modal: 33 },
        { cropName: 'Red Onions (Nashik Quality)', region: 'Pune APMC', state: 'Maharashtra', min: 31, max: 40, modal: 35 },
        { cropName: 'Potatoes (Chipsona/Jyoti)', region: 'Agra Mandi', state: 'Uttar Pradesh', min: 20, max: 27, modal: 23 },
        { cropName: 'Potatoes (Chipsona/Jyoti)', region: 'Vashi APMC', state: 'Maharashtra', min: 22, max: 29, modal: 25 },
        { cropName: 'Basmati Rice (1121 Steam)', region: 'Karnal Grain Mandi', state: 'Haryana', min: 82, max: 94, modal: 87 },
        { cropName: 'Alphonso Mangoes (Devgad GI)', region: 'Vashi Fruit Market', state: 'Maharashtra', min: 220, max: 300, modal: 255 },
        { cropName: 'Green G4 Hot Chillies', region: 'Guntur APMC', state: 'Andhra Pradesh', min: 60, max: 76, modal: 67 },
        { cropName: 'Sharbati Wheat Grain', region: 'Sehore APMC', state: 'Madhya Pradesh', min: 38, max: 46, modal: 41 },
    ];
    for (const m of mandiEntries) {
        const crop = createdCrops[m.cropName];
        if (crop) {
            await prisma.mandiReferencePrice.create({
                data: {
                    cropId: crop.id,
                    region: m.region,
                    state: m.state,
                    minPrice: m.min,
                    maxPrice: m.max,
                    modalPrice: m.modal,
                },
            });
        }
    }
    console.log('👨‍🌾 Seeding 15 Farmers with Regional Profiles & Bank Accounts...');
    const farmersList = [
        { name: 'Ramesh Kumar', email: 'ramesh.farmer@farmdirect.test', phone: '+91 98220 44551', village: 'Dindori', district: 'Nashik', state: 'Maharashtra', pin: '422202', upi: 'ramesh.kumar@okhdfcbank', lang: 'mr' },
        { name: 'Balwinder Singh', email: 'balwinder.singh@farmdirect.test', phone: '+91 98140 12345', village: 'Taraori', district: 'Karnal', state: 'Haryana', pin: '132116', upi: 'balwinder.grain@paytm', lang: 'en' },
        { name: 'Anandi Patel', email: 'anandi.patel@farmdirect.test', phone: '+91 98250 99887', village: 'Vasna', district: 'Anand', state: 'Gujarat', pin: '388306', upi: 'anandi.patel@icici', lang: 'en' },
        { name: 'Suresh Ghorpade', email: 'suresh.ghorpade@farmdirect.test', phone: '+91 97650 33221', village: 'Shirol', district: 'Kolhapur', state: 'Maharashtra', pin: '416103', upi: 'suresh.ghorpade@sbi', lang: 'mr' },
        { name: 'Mahendra Yadav', email: 'mahendra.yadav@farmdirect.test', phone: '+91 94250 88776', village: 'Sanwer', district: 'Indore', state: 'Madhya Pradesh', pin: '453551', upi: 'mahendra.yadav@ybl', lang: 'hi' },
        { name: 'Jagdish Prasad', email: 'jagdish.prasad@farmdirect.test', phone: '+91 94140 55443', village: 'Ramgarh', district: 'Alwar', state: 'Rajasthan', pin: '301026', upi: 'jagdish.agri@barodampay', lang: 'hi' },
        { name: 'Manjula Devi', email: 'manjula.devi@farmdirect.test', phone: '+91 98450 66778', village: 'Bhadravathi', district: 'Shimoga', state: 'Karnataka', pin: '577301', upi: 'manjula.devi@axisbank', lang: 'kn' },
        { name: 'Harpreet Kaur', email: 'harpreet.kaur@farmdirect.test', phone: '+91 98760 11990', village: 'Samrala', district: 'Ludhiana', state: 'Punjab', pin: '141114', upi: 'harpreet.farm@pnb', lang: 'en' },
        { name: 'Pandurang Shinde', email: 'pandurang.shinde@farmdirect.test', phone: '+91 99220 77889', village: 'Junnar', district: 'Pune', state: 'Maharashtra', pin: '410502', upi: 'pandurang.shinde@kotak', lang: 'mr' },
        { name: 'Narayan Murthy G.', email: 'narayan.murthy@farmdirect.test', phone: '+91 98480 33445', village: 'Tenali', district: 'Guntur', state: 'Andhra Pradesh', pin: '522201', upi: 'nmurthy.chillies@apl', lang: 'te' },
        { name: 'Ashok Jadhav', email: 'ashok.jadhav@farmdirect.test', phone: '+91 98230 66554', village: 'Kalmeshwar', district: 'Nagpur', state: 'Maharashtra', pin: '441501', upi: 'ashok.jadhav@boi', lang: 'mr' },
        { name: 'Ramratan Meena', email: 'ramratan.meena@farmdirect.test', phone: '+91 94130 22110', village: 'Ladpura', district: 'Kota', state: 'Rajasthan', pin: '324001', upi: 'rmeena.farm@sbi', lang: 'hi' },
        { name: 'Govind Kelkar', email: 'govind.kelkar@farmdirect.test', phone: '+91 98225 88991', village: 'Pawapuri', district: 'Ratnagiri', state: 'Maharashtra', pin: '415612', upi: 'kelkar.mango@okhdfcbank', lang: 'mr' },
        { name: 'Dilip Patil', email: 'dilip.patil@farmdirect.test', phone: '+91 98231 44778', village: 'Raver', district: 'Jalgaon', state: 'Maharashtra', pin: '425508', upi: 'dilip.patil@paytm', lang: 'mr' },
        { name: 'Bhikaji Sawant', email: 'bhikaji.sawant@farmdirect.test', phone: '+91 98201 55667', village: 'Shirgaon', district: 'Sindhudurg', state: 'Maharashtra', pin: '416613', upi: 'bhikaji.sawant@icici', lang: 'mr' },
    ];
    const createdFarmers = [];
    for (const f of farmersList) {
        const user = await prisma.user.create({
            data: {
                name: f.name,
                email: f.email,
                phone: f.phone,
                role: 'farmer',
                farmerProfile: {
                    create: {
                        village: f.village,
                        district: f.district,
                        state: f.state,
                        pincode: f.pin,
                        bankAccountNumber: '9188' + Math.floor(10000000 + Math.random() * 90000000),
                        ifscCode: 'HDFC0001234',
                        upiId: f.upi,
                        preferredLanguage: f.lang,
                        verified: true,
                    },
                },
            },
            include: { farmerProfile: true },
        });
        createdFarmers.push(user);
    }
    console.log('🛒 Seeding 10 Buyers (Individual Consumers + Bulk FPOs)...');
    const buyersList = [
        { name: 'Priya Sharma', email: 'priya.buyer@farmdirect.test', phone: '+91 98200 45678', type: 'INDIVIDUAL', city: 'Mumbai', state: 'Maharashtra', pin: '400050', addr: 'B-402, Sea Breeze Apts, Bandra West' },
        { name: 'GreenFresh FPO Cooperative', email: 'greenfresh.fpo@farmdirect.test', phone: '+91 98190 77889', type: 'BULK_FPO', org: 'GreenFresh Farmers Producer Org Ltd', gst: '27AABCG1234F1Z5', city: 'Mumbai', state: 'Maharashtra', pin: '400001', addr: 'Plot 42, APMC Cold Complex, Turbhe' },
        { name: 'Amit Deshmukh', email: 'amit.deshmukh@farmdirect.test', phone: '+91 98221 88990', type: 'INDIVIDUAL', city: 'Pune', state: 'Maharashtra', pin: '411038', addr: '12, Kothrud Green Enclave' },
        { name: 'Sahyadri Agro Union', email: 'sahyadri.fpo@farmdirect.test', phone: '+91 94222 11002', type: 'BULK_FPO', org: 'Sahyadri Agro Producers Consortium', gst: '27AABCS5678K1Z2', city: 'Nashik', state: 'Maharashtra', pin: '422003', addr: 'Agro Industrial Estate, Ambad' },
        { name: 'Sunita Reddy', email: 'sunita.reddy@farmdirect.test', phone: '+91 98451 22334', type: 'INDIVIDUAL', city: 'Bengaluru', state: 'Karnataka', pin: '560034', addr: '104, Palm Meadows, Koramangala' },
        { name: 'UrbanHarvest Kitchens', email: 'urbanharvest@farmdirect.test', phone: '+91 98330 99112', type: 'BULK_FPO', org: 'UrbanHarvest Commercial Kitchens Pvt Ltd', gst: '27AABCU9012M1Z8', city: 'Navi Mumbai', state: 'Maharashtra', pin: '400705', addr: 'Unit 7, MIDC Commercial Hub, Sanpada' },
        { name: 'Vikas Malhotra', email: 'vikas.malhotra@farmdirect.test', phone: '+91 98110 55667', type: 'INDIVIDUAL', city: 'New Delhi', state: 'Delhi', pin: '110017', addr: 'H-18, Saket Residential Area' },
        { name: 'Ananya Sen', email: 'ananya.sen@farmdirect.test', phone: '+91 98300 44332', type: 'INDIVIDUAL', city: 'Kolkata', state: 'West Bengal', pin: '700029', addr: 'Flat 3B, Southern Avenue' },
        { name: 'FreshRoots Organic Mart', email: 'freshroots@farmdirect.test', phone: '+91 98205 66778', type: 'BULK_FPO', org: 'FreshRoots Retail Chains Ltd', gst: '27AABCF3456P1Z4', city: 'Thane', state: 'Maharashtra', pin: '400601', addr: 'G-12, Viviana Mart Hub' },
        { name: 'Deepak Joshi', email: 'deepak.joshi@farmdirect.test', phone: '+91 98240 77665', type: 'INDIVIDUAL', city: 'Ahmedabad', state: 'Gujarat', pin: '380015', addr: '204, Satellite Towers, Bodakdev' },
    ];
    const createdBuyers = [];
    for (const b of buyersList) {
        const user = await prisma.user.create({
            data: {
                name: b.name,
                email: b.email,
                phone: b.phone,
                role: 'buyer',
                buyerProfile: {
                    create: {
                        buyerType: b.type,
                        orgName: b.org || null,
                        gstin: b.gst || null,
                        addressLine: b.addr,
                        city: b.city,
                        state: b.state,
                        pincode: b.pin,
                    },
                },
            },
            include: { buyerProfile: true },
        });
        createdBuyers.push(user);
    }
    console.log('📦 Seeding 42 Listings with AI Pre-Grades, Photos & Pricing...');
    const samplePhotos = {
        tomato: [
            'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=800&auto=format&fit=crop',
            'https://images.unsplash.com/photo-1546470427-0d4db154ceb7?w=800&auto=format&fit=crop',
        ],
        onion: [
            'https://images.unsplash.com/photo-1618512496248-a07fe83aa8cb?w=800&auto=format&fit=crop',
            'https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=800&auto=format&fit=crop',
        ],
        potato: [
            'https://images.unsplash.com/photo-1518977676601-b53f82aba655?w=800&auto=format&fit=crop',
            'https://images.unsplash.com/photo-1508747703725-719777637510?w=800&auto=format&fit=crop',
        ],
        rice: [
            'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=800&auto=format&fit=crop',
        ],
        mango: [
            'https://images.unsplash.com/photo-1553279768-865429fa0078?w=800&auto=format&fit=crop',
            'https://images.unsplash.com/photo-1601493700631-2b16ec4b4716?w=800&auto=format&fit=crop',
        ],
        chilli: [
            'https://images.unsplash.com/photo-1588252303782-cb80119abd6d?w=800&auto=format&fit=crop',
        ],
        wheat: [
            'https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=800&auto=format&fit=crop',
        ],
    };
    const cropKeys = Object.keys(createdCrops);
    const createdListings = [];
    for (let i = 0; i < 42; i++) {
        const farmer = createdFarmers[i % createdFarmers.length];
        const cropName = cropKeys[i % cropKeys.length];
        const crop = createdCrops[cropName];
        let photoKey = 'tomato';
        if (cropName.includes('Onion'))
            photoKey = 'onion';
        else if (cropName.includes('Potato'))
            photoKey = 'potato';
        else if (cropName.includes('Rice'))
            photoKey = 'rice';
        else if (cropName.includes('Mango'))
            photoKey = 'mango';
        else if (cropName.includes('Chilli'))
            photoKey = 'chilli';
        else if (cropName.includes('Wheat'))
            photoKey = 'wheat';
        // Varied grades
        const grades = ['A', 'A', 'B', 'A', 'B', 'C', 'A'];
        const aiGrade = grades[i % grades.length];
        const confidences = [0.96, 0.93, 0.88, 0.94, 0.85, 0.79, 0.95];
        const aiConfidence = confidences[i % confidences.length];
        const tips = aiGrade === 'A'
            ? 'Optimal skin tautness, export quality color uniformity. Grade A certified.'
            : aiGrade === 'B'
                ? 'Slight surface size variation. Clean natural sorting recommended.'
                : 'Minor skin discoloration. Suitable for standard local processing.';
        // Quantity range: from partial quintals (25kg) up to commercial lots (450kg)
        const quantities = [35, 48, 60, 120, 250, 40, 80, 150, 20, 300];
        const quantity = quantities[i % quantities.length];
        // Price variation around base price
        const priceDeltas = [0, 2, -1, 3, -2, 1, 4];
        const pricePerUnit = Math.max(10, crop.basePricePerKg + priceDeltas[i % priceDeltas.length]);
        const harvestDaysAgo = (i * 3) % 12;
        const harvestDate = new Date(Date.now() - harvestDaysAgo * 24 * 60 * 60 * 1000);
        const listing = await prisma.listing.create({
            data: {
                farmerId: farmer.id,
                cropId: crop.id,
                quantity,
                unit: crop.unit,
                pricePerUnit,
                harvestDate,
                aiGrade,
                aiConfidence,
                aiTips: tips,
                status: i === 41 ? 'SOLD_OUT' : 'ACTIVE',
                photos: JSON.stringify(samplePhotos[photoKey]),
                notes: `Freshly handpicked lot from ${farmer.farmerProfile?.village || 'farm'}. Pesticide-safe certified harvest.`,
                farmLocation: `${farmer.farmerProfile?.village}, ${farmer.farmerProfile?.district}`,
            },
            include: { crop: true, farmer: true },
        });
        createdListings.push(listing);
    }
    console.log('🚚 Seeding Active Orders Across All Pipeline Stages (Escrow, Hub, Transit, Delivered)...');
    // Order 1: ESCROW_HELD (Awaiting Hub Verification)
    const o1 = await prisma.order.create({
        data: {
            buyerId: createdBuyers[0].id, // Priya Sharma
            listingId: createdListings[0].id,
            quantity: 40,
            unit: 'kg',
            unitPrice: createdListings[0].pricePerUnit,
            totalAmount: createdListings[0].pricePerUnit * 40 + 40,
            commissionAmount: parseFloat(((createdListings[0].pricePerUnit * 40 * 0.05).toFixed(2))),
            deliveryType: 'HUB_CONSOLIDATED',
            status: 'ESCROW_HELD',
            deliveryAddress: createdBuyers[0].buyerProfile.addressLine,
            deliveryPincode: createdBuyers[0].buyerProfile.pincode,
            escrowTransaction: {
                create: {
                    amount: createdListings[0].pricePerUnit * 40 + 40,
                    status: 'HELD',
                    gatewayRef: 'rzp_test_escrow_hold_9921',
                    notes: 'Funds locked in platform escrow. Awaiting central hub quality verification.',
                },
            },
            hubIntake: {
                create: {
                    lane: 'FARMER_DROPOFF',
                    staffName: 'Intake Desk 1',
                },
            },
            dispatch: {
                create: {
                    status: 'READY',
                    route: 'Dindori Hub -> Central Aggregator -> Bandra Mumbai',
                },
            },
        },
    });
    // Order 2: HUB_VERIFIED (Graded with Automated Discrepancy Adjustment applied!)
    const o2 = await prisma.order.create({
        data: {
            buyerId: createdBuyers[1].id, // GreenFresh FPO
            listingId: createdListings[1].id,
            quantity: 120,
            unit: 'kg',
            unitPrice: createdListings[1].pricePerUnit * 0.88, // Downgraded to B by rule engine
            totalAmount: 120 * (createdListings[1].pricePerUnit * 0.88) + 150,
            commissionAmount: 180.0,
            deliveryType: 'FARM_DIRECT',
            status: 'HUB_VERIFIED',
            discrepancyAdjusted: true,
            discrepancyDetails: JSON.stringify({
                hasDiscrepancy: true,
                originalGrade: 'A',
                confirmedGrade: 'B',
                originalWeight: 125,
                actualWeight: 120,
                originalUnitPrice: createdListings[1].pricePerUnit,
                adjustedUnitPrice: createdListings[1].pricePerUnit * 0.88,
                originalTotal: 125 * createdListings[1].pricePerUnit + 150,
                adjustedTotal: 120 * (createdListings[1].pricePerUnit * 0.88) + 150,
                priceDelta: 240,
                notes: 'Automated Hub Rule: Grade adjusted A->B based on size variance. Price reduced and ₹240 refund queued.',
            }),
            deliveryAddress: createdBuyers[1].buyerProfile.addressLine,
            deliveryPincode: createdBuyers[1].buyerProfile.pincode,
            escrowTransaction: {
                create: {
                    amount: 120 * (createdListings[1].pricePerUnit * 0.88) + 150,
                    status: 'HELD',
                    gatewayRef: 'rzp_test_escrow_hold_8842',
                    notes: 'Escrow amount re-balanced to ₹3,846 after automated grade adjustment.',
                },
            },
            hubIntake: {
                create: {
                    lane: 'LOGISTICS_PICKUP',
                    receivedWeight: 120,
                    confirmedGrade: 'B',
                    discrepancyNotes: 'Grade adjusted A->B by Central Inspector. Auto-refund notification triggered.',
                    inspectedAt: new Date(Date.now() - 4 * 60 * 60 * 1000),
                    staffName: 'Rajesh Verma (Lead Inspector)',
                },
            },
            dispatch: {
                create: {
                    status: 'ASSIGNED',
                    driverName: 'Sanjay Jadhav',
                    driverPhone: '+91 98222 77110',
                    vehicleId: 'MH-15-EG-4401',
                    eta: 'Today by 5:30 PM',
                    route: 'Nashik Aggregation Center -> Turbhe Cold Store',
                },
            },
        },
    });
    // Order 3: DISPATCHED (In Transit with live driver and route ETA)
    const o3 = await prisma.order.create({
        data: {
            buyerId: createdBuyers[2].id, // Amit Deshmukh
            listingId: createdListings[3].id,
            quantity: 50,
            unit: 'kg',
            unitPrice: createdListings[3].pricePerUnit,
            totalAmount: createdListings[3].pricePerUnit * 50 + 150,
            commissionAmount: 140.0,
            deliveryType: 'FARM_DIRECT',
            status: 'DISPATCHED',
            deliveryAddress: createdBuyers[2].buyerProfile.addressLine,
            deliveryPincode: createdBuyers[2].buyerProfile.pincode,
            escrowTransaction: {
                create: {
                    amount: createdListings[3].pricePerUnit * 50 + 150,
                    status: 'HELD',
                    gatewayRef: 'rzp_test_escrow_hold_7719',
                },
            },
            hubIntake: {
                create: {
                    lane: 'LOGISTICS_PICKUP',
                    receivedWeight: 50,
                    confirmedGrade: 'A',
                    inspectedAt: new Date(Date.now() - 6 * 60 * 60 * 1000),
                    staffName: 'Sunil Patil',
                },
            },
            dispatch: {
                create: {
                    status: 'IN_TRANSIT',
                    driverName: 'Mahesh Kadam',
                    driverPhone: '+91 97655 88990',
                    vehicleId: 'MH-12-QZ-9020',
                    eta: 'In Transit (ETA: 45 mins)',
                    route: 'Junnar Farm -> Pune City Hub -> Kothrud',
                    dispatchedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
                },
            },
        },
    });
    // Order 4: DELIVERED (Awaiting Buyer "Confirm Receipt" button action)
    const o4 = await prisma.order.create({
        data: {
            buyerId: createdBuyers[0].id, // Priya Sharma
            listingId: createdListings[4].id,
            quantity: 30,
            unit: 'kg',
            unitPrice: createdListings[4].pricePerUnit,
            totalAmount: createdListings[4].pricePerUnit * 30 + 40,
            commissionAmount: 110.0,
            deliveryType: 'HUB_CONSOLIDATED',
            status: 'DELIVERED',
            deliveryAddress: createdBuyers[0].buyerProfile.addressLine,
            deliveryPincode: createdBuyers[0].buyerProfile.pincode,
            escrowTransaction: {
                create: {
                    amount: createdListings[4].pricePerUnit * 30 + 40,
                    status: 'HELD',
                    gatewayRef: 'rzp_test_escrow_hold_6623',
                    notes: 'Delivered to buyer doorstep. Awaiting buyer confirmation to release payout to farmer.',
                },
            },
            hubIntake: {
                create: {
                    lane: 'FARMER_DROPOFF',
                    receivedWeight: 30,
                    confirmedGrade: 'A',
                    staffName: 'Kunal Deshmukh',
                },
            },
            dispatch: {
                create: {
                    status: 'DELIVERED',
                    driverName: 'Pravin Shinde',
                    driverPhone: '+91 98200 66551',
                    vehicleId: 'MH-02-CW-1199',
                    eta: 'Delivered',
                    route: 'Central Hub -> Bandra West',
                    deliveredAt: new Date(Date.now() - 30 * 60 * 1000),
                },
            },
        },
    });
    // Order 5: COMPLETED (Escrow Settled + Paid Out to Farmer + Rating Submitted)
    const o5 = await prisma.order.create({
        data: {
            buyerId: createdBuyers[4].id, // Sunita Reddy
            listingId: createdListings[2].id,
            quantity: 60,
            unit: 'kg',
            unitPrice: createdListings[2].pricePerUnit,
            totalAmount: createdListings[2].pricePerUnit * 60 + 150,
            commissionAmount: 72.0,
            deliveryType: 'FARM_DIRECT',
            status: 'COMPLETED',
            deliveryAddress: createdBuyers[4].buyerProfile.addressLine,
            deliveryPincode: createdBuyers[4].buyerProfile.pincode,
            escrowTransaction: {
                create: {
                    amount: createdListings[2].pricePerUnit * 60 + 150,
                    status: 'RELEASED',
                    gatewayRef: 'rzp_test_escrow_hold_5512',
                    payoutTxRef: 'payout_bank_utr_88992211',
                    releasedAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
                    notes: 'Buyer verified receipt. ₹1,440 credited to farmer UPI (ramesh.kumar@okhdfcbank) after ₹72 commission.',
                },
            },
            hubIntake: {
                create: {
                    lane: 'LOGISTICS_PICKUP',
                    receivedWeight: 60,
                    confirmedGrade: 'A',
                    staffName: 'Central Intake',
                },
            },
            dispatch: {
                create: {
                    status: 'DELIVERED',
                    driverName: 'Vikram Mane',
                    vehicleId: 'MH-14-BT-5566',
                    status: 'DELIVERED',
                    deliveredAt: new Date(Date.now() - 25 * 60 * 60 * 1000),
                },
            },
            rating: {
                create: {
                    authorId: createdBuyers[4].id,
                    farmerId: createdFarmers[0].farmerProfile.id,
                    rating: 5,
                    qualityRating: 5,
                    deliveryRating: 5,
                    comment: 'Exceptional freshness! The produce reached us crisp and properly packed directly from the farm.',
                },
            },
        },
    });
    // Order 6: DISPUTE (Open Dispute for Hub Dispute Console testing)
    const o6 = await prisma.order.create({
        data: {
            buyerId: createdBuyers[3].id, // Sahyadri Agro Union
            listingId: createdListings[5].id,
            quantity: 80,
            unit: 'kg',
            unitPrice: createdListings[5].pricePerUnit,
            totalAmount: createdListings[5].pricePerUnit * 80 + 150,
            commissionAmount: 136.0,
            deliveryType: 'FARM_DIRECT',
            status: 'DISPUTED',
            deliveryAddress: createdBuyers[3].buyerProfile.addressLine,
            deliveryPincode: createdBuyers[3].buyerProfile.pincode,
            escrowTransaction: {
                create: {
                    amount: createdListings[5].pricePerUnit * 80 + 150,
                    status: 'HELD',
                    gatewayRef: 'rzp_test_escrow_hold_4401',
                    notes: 'Held in dispute lock. Buyer reported packaging tear during transit.',
                },
            },
            hubIntake: {
                create: {
                    lane: 'LOGISTICS_PICKUP',
                    receivedWeight: 80,
                    confirmedGrade: 'B',
                    staffName: 'Staff Inspector',
                },
            },
            dispatch: {
                create: {
                    status: 'DELIVERED',
                    driverName: 'Anil Rathod',
                    vehicleId: 'MH-15-AB-7788',
                },
            },
            dispute: {
                create: {
                    reason: 'Water damage on outer crates noticed during unload at buyer warehouse. Requesting partial refund for 15kg.',
                    status: 'OPEN',
                },
            },
        },
    });
    // Seed some initial notifications
    await prisma.notification.createMany({
        data: [
            {
                userId: createdFarmers[0].id,
                title: '🎉 Welcome to FarmDirect!',
                message: 'Your farmer profile has been verified. You can now post produce listings and monitor APMC fair prices.',
                type: 'SUCCESS',
            },
            {
                userId: createdBuyers[0].id,
                title: '🌿 Welcome to FarmDirect Marketplace',
                message: 'Explore fresh farm harvests with guaranteed escrow payment protection.',
                type: 'INFO',
            },
        ],
    });
    console.log('✅ Seed completed successfully!');
    console.log(`   - 1 Hub Admin: rajesh.admin@farmdirect.test`);
    console.log(`   - 15 Farmers (e.g. ramesh.farmer@farmdirect.test)`);
    console.log(`   - 10 Buyers (e.g. priya.buyer@farmdirect.test, greenfresh.fpo@farmdirect.test)`);
    console.log(`   - 42 Listings with AI Pre-Grades & APMC Mandi feeds`);
    console.log(`   - 6 Live Orders across all pipeline states`);
}
main()
    .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
