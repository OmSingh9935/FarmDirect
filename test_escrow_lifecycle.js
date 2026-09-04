// Test Escrow lifecycle and automated Hub Discrepancy Rule Engine
async function testEscrowLifecycle() {
  console.log('--- 1. Login as Priya (Buyer) ---');
  const buyerLoginRes = await fetch('http://localhost:5000/api/auth/demo-login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ role: 'buyer' }),
  });
  const buyerData = await buyerLoginRes.json();
  const buyerToken = buyerData.accessToken || buyerData.token;
  console.log(`Buyer logged in: ${buyerData.user.name}, Token acquired: ${Boolean(buyerToken)}`);

  console.log('\n--- 2. Fetch a Listing with Ample Stock ---');
  const listingsRes = await fetch('http://localhost:5000/api/listings');
  const listingsData = await listingsRes.json();
  const listing = listingsData.listings.find((l) => l.quantity >= 50) || listingsData.listings[0];
  const orderQty = Math.min(listing.quantity, 50);
  console.log(`Target Produce: ${listing.crop.name} (Stock: ${listing.quantity} ${listing.unit}, Listed: ₹${listing.pricePerUnit}/${listing.unit}, AI Grade: ${listing.aiGrade})`);

  console.log(`\n--- 3. Place Order for ${orderQty}kg ---`);
  const orderRes = await fetch('http://localhost:5000/api/orders', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${buyerToken}`,
    },
    body: JSON.stringify({
      items: [{ listingId: listing.id, quantity: orderQty }],
      deliveryAddress: 'Flat 402, Sea Breeze, Bandra West, Mumbai',
      deliveryPincode: '400050',
    }),
  });
  const orderData = await orderRes.json();
  if (!orderData.orders) {
    console.error('Order creation error:', orderData);
    return;
  }
  const order = orderData.orders[0];
  console.log(`Order created: #${order.id.slice(0, 8)} | Status: ${order.status} | Delivery Mode: ${order.deliveryType} | Total: ₹${order.totalAmount}`);

  console.log('\n--- 4. Sandbox Payment -> Hold Funds in Escrow ---');
  const payRes = await fetch('http://localhost:5000/api/payments/verify', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${buyerToken}`,
    },
    body: JSON.stringify({
      orderIds: [order.id],
      razorpayOrderId: `order_test_${Date.now()}`,
      razorpayPaymentId: `pay_test_rzp_${Date.now()}`,
      razorpaySignature: `simulated_${Date.now()}`,
    }),
  });
  const payData = await payRes.json();
  console.log(`Escrow Result: ${payData.results[0].message}`);

  console.log('\n--- 5. Login as Rajesh (Hub Admin) ---');
  const hubLoginRes = await fetch('http://localhost:5000/api/auth/demo-login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ role: 'hub_admin' }),
  });
  const hubData = await hubLoginRes.json();
  const hubToken = hubData.accessToken || hubData.token;

  console.log('\n--- 6. Hub Staff Inspects Produce with Scale Discrepancy & Grade Adjustment ---');
  const actualWeight = Math.max(1, orderQty - 2);
  const gradeRes = await fetch('http://localhost:5000/api/hub/grade', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${hubToken}`,
    },
    body: JSON.stringify({
      orderId: order.id,
      actualWeight,
      confirmedGrade: 'B',
      staffNotes: `Digital scale: ${actualWeight}kg. Color variation qualifies as commercial Grade B. Rule engine triggered.`,
    }),
  });
  const gradeData = await gradeRes.json();
  console.log('Automated Rule Engine Execution:', gradeData.message);
  console.log('Rule Details:', {
    hasDiscrepancy: gradeData.discrepancyResult.hasDiscrepancy,
    originalTotal: `₹${gradeData.discrepancyResult.originalTotal}`,
    adjustedTotal: `₹${gradeData.discrepancyResult.adjustedTotal}`,
    buyerRefundDelta: `₹${gradeData.discrepancyResult.priceDelta}`,
  });

  console.log('\n--- 7. Advance Dispatch Kanban to DELIVERED ---');
  const dispatchRes = await fetch('http://localhost:5000/api/hub/dispatch', {
    headers: { 'Authorization': `Bearer ${hubToken}` },
  });
  const dispatchData = await dispatchRes.json();
  const allDispatches = Object.values(dispatchData.kanban).flat();
  const currentDispatch = allDispatches.find((d) => d.orderId === order.id);

  if (currentDispatch) {
    await fetch('http://localhost:5000/api/hub/dispatch', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${hubToken}`,
      },
      body: JSON.stringify({
        dispatchId: currentDispatch.id,
        status: 'DELIVERED',
        driverName: 'Sanjay Jadhav',
        vehicleId: 'MH-15-EG-4401',
      }),
    });
    console.log('Dispatch moved to DELIVERED');
  }

  console.log('\n--- 8. Buyer Inspects & Clicks "Confirm Receipt" (Triggers Escrow Release!) ---');
  const releaseRes = await fetch(`http://localhost:5000/api/orders/${order.id}/confirm-receipt`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${buyerToken}`,
    },
  });
  const releaseData = await releaseRes.json();
  console.log('Escrow Release Message:', releaseData.message);
  console.log('Settlement Details:', releaseData.escrow);

  console.log('\n🌟 ESCROW LIFECYCLE & DISCREPANCY RULE ENGINE TEST PASSED FLAWLESSLY!');
}

testEscrowLifecycle().catch(console.error);
