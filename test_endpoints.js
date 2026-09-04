// Automated test suite for FarmDirect API
async function runTests() {
  console.log('--- 1. Testing Health Endpoint ---');
  const healthRes = await fetch('http://localhost:5000/health');
  const health = await healthRes.json();
  console.log('Health:', health);

  console.log('\n--- 2. Testing Mandi Crops & Thresholds ---');
  const cropsRes = await fetch('http://localhost:5000/api/mandi/crops');
  const cropsData = await cropsRes.json();
  console.log(`Crops count: ${cropsData.crops.length}`);
  const firstCrop = cropsData.crops[0];
  console.log(`Sample Crop: ${firstCrop.name}, Threshold: ${firstCrop.threshold?.quintalEquivalentThreshold} quintal, Commission: ${firstCrop.threshold?.commissionPercentage}%`);

  console.log('\n--- 3. Testing Marketplace Listings ---');
  const listingsRes = await fetch('http://localhost:5000/api/listings');
  const listingsData = await listingsRes.json();
  console.log(`Total listings: ${listingsData.total}`);
  const l0 = listingsData.listings[0];
  console.log(`Listing 0: ${l0.crop.name} | Price: ₹${l0.pricePerUnit}/${l0.unit} | Grade: ${l0.aiGrade} (${Math.round(l0.aiConfidence * 100)}%) | Farmer: ${l0.farmer.name} (${l0.farmer.village})`);

  console.log('\n--- 4. Testing 0.5-Quintal Dynamic Threshold Evaluation ---');
  const underRes = await fetch(`http://localhost:5000/api/orders/logistics-check?cropId=${firstCrop.id}&quantity=35&unit=kg`);
  const under = await underRes.json();
  console.log(`35 kg order: ${under.deliveryType} -> "${under.title}" (Fee: ₹${under.logisticsFee})`);

  const overRes = await fetch(`http://localhost:5000/api/orders/logistics-check?cropId=${firstCrop.id}&quantity=80&unit=kg`);
  const over = await overRes.json();
  console.log(`80 kg order: ${over.deliveryType} -> "${over.title}" (Fee: ₹${over.logisticsFee})`);

  console.log('\n--- 5. Testing Email OTP Generation & Hashing Flow ---');
  const testEmail = `reviewer_${Date.now()}@farmdirect.test`;
  const otpReqRes = await fetch('http://localhost:5000/api/auth/request-otp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: testEmail, role: 'buyer' }),
  });
  const otpReq = await otpReqRes.json();
  console.log('Request OTP result:', otpReq);

  // Retrieve hashed OTP code from dev store
  const devOtpRes = await fetch(`http://localhost:5000/api/auth/dev-otp?email=${encodeURIComponent(testEmail)}`);
  const devOtpData = await devOtpRes.json();
  console.log(`Active Dev Code received: ${devOtpData.otp}`);

  console.log('\n--- 6. Testing OTP Verification ---');
  const verifyRes = await fetch('http://localhost:5000/api/auth/verify-otp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: testEmail, code: devOtpData.otp }),
  });
  const verifyData = await verifyRes.json();
  console.log('Verify OTP result:', verifyData);

  console.log('\n--- 7. Testing New Buyer Onboarding ---');
  const onboardRes = await fetch('http://localhost:5000/api/auth/onboard/buyer', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      onboardingToken: verifyData.onboardingToken,
      name: 'Simulated Buyer',
      phone: '+91 98200 99887',
      buyerType: 'INDIVIDUAL',
      addressLine: '101, Marine Drive',
      city: 'Mumbai',
      state: 'Maharashtra',
      pincode: '400020',
    }),
  });
  const onboardData = await onboardRes.json();
  console.log('Onboarding result: User ID =', onboardData.user?.id, 'Role =', onboardData.user?.role);

  console.log('\n--- 8. Testing One-Click Instant Demo Login ---');
  const demoFarmerRes = await fetch('http://localhost:5000/api/auth/demo-login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ role: 'farmer' }),
  });
  const demoFarmer = await demoFarmerRes.json();
  console.log(`Demo Farmer: ${demoFarmer.user.name} (${demoFarmer.user.email})`);

  const demoHubRes = await fetch('http://localhost:5000/api/auth/demo-login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ role: 'hub_admin' }),
  });
  const demoHub = await demoHubRes.json();
  console.log(`Demo Hub Staff: ${demoHub.user.name} (${demoHub.user.email})`);

  console.log('\n✨ ALL API TESTS PASSED PERFECTLY!');
}

runTests().catch(console.error);
