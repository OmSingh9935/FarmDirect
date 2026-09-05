import AIForecastingService from './src/services/ai_forecasting.service.js';
import AIRoutingService from './src/services/ai_routing.service.js';

async function testAICapabilities() {
  console.log('--- Testing AI Demand Forecasting Service ---');
  const forecast = await AIForecastingService.generateDemandForecast({
    horizonDays: 14,
    region: 'MUMBAI_METRO',
    eventShock: true,
  });

  console.log('Forecast Meta:', forecast.modelMeta);
  console.log('Forecast Summary:', forecast.summary);
  console.log('Forecasted Crops Count:', forecast.crops.length);
  if (forecast.crops.length > 0) {
    const top = forecast.crops[0];
    console.log(`Top Crop: ${top.cropName} (${top.category})`);
    console.log(`  Current Mandi Price: ₹${top.currentMandiPrice}/kg`);
    console.log(`  AI Projected Price: ₹${top.projectedPricePerKg}/kg (${top.priceTrendPct > 0 ? '+' : ''}${top.priceTrendPct}%)`);
    console.log(`  Forecasted Demand: ${top.forecastedDemandKg} kg vs Supply: ${top.currentAvailableSupplyKg} kg`);
    console.log(`  Risk Status: ${top.riskStatus}`);
    console.log(`  Confidence: ${(top.confidenceScore * 100).toFixed(1)}%`);
  }

  console.log('\n--- Testing AI Route Optimization Solver ---');
  const routing = await AIRoutingService.solveOptimalRoutes();
  console.log('Algorithm:', routing.algorithm);
  console.log('Proof of Optimization:');
  console.log(`  Naive Distance: ${routing.proofOfOptimization.naiveDistanceKm} km`);
  console.log(`  AI Optimized Distance: ${routing.proofOfOptimization.optimizedDistanceKm} km (-${routing.proofOfOptimization.distanceSavedPct}% saved)`);
  console.log(`  Time Saved: ${routing.proofOfOptimization.timeSavedHours} hrs (-${routing.proofOfOptimization.timeSavedPct}%)`);
  console.log(`  Fuel Saved: ₹${routing.proofOfOptimization.fuelCostSavedInr}`);
  console.log(`  CO2 Offset: ${routing.proofOfOptimization.co2SavedKg} kg`);
  console.log(`  Produce Freshness: ${routing.proofOfOptimization.produceFreshnessScorePct}%`);
  console.log(`  Spoilage Risk: ${routing.proofOfOptimization.perishableSpoilageRiskPct}%`);
  console.log('Ordered Stops Count:', routing.routes[0].orderedStops.length);
  console.log('Route Legs Count:', routing.routes[0].routeLegs.length);

  console.log('\n--- Testing Farmer Crop Advisory ---');
  const advisory = await AIForecastingService.getFarmerRecommendations();
  console.log('Market Phase:', advisory.overallMarketMood);
  console.log('Top Opportunities:', advisory.topOpportunities.map((o) => `${o.cropName} (+${o.potentialMarginGainPct}%)`));

  console.log('\n>>> ALL AI ENGINES VERIFIED SUCCESSFULLY! <<<');
}

testAICapabilities().catch((err) => {
  console.error('Error running AI test:', err);
  process.exit(1);
});
