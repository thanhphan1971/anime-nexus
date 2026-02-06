import { stripe } from './stripeClient';

async function createSClassProducts() {

  console.log('Creating S-Class subscription products...');

  const existingProducts = await stripe.products.search({ 
    query: "name:'S-Class Membership'" 
  });
  
  if (existingProducts.data.length > 0) {
    console.log('S-Class product already exists');
    const product = existingProducts.data[0];
    const prices = await stripe.prices.list({ product: product.id, active: true });
    console.log('Existing prices:', prices.data.map((p: any) => ({
      id: p.id,
      amount: p.unit_amount,
      interval: p.recurring?.interval
    })));
    return;
  }

  const product = await stripe.products.create({
    name: 'S-Class Membership',
    description: 'Premium Access to AniRealm - Unlock additional daily game entries, higher token caps, extra draw entries, and exclusive perks.',
    metadata: {
      tier: 'premium',
      type: 'subscription',
    }
  });

  console.log('Created product:', product.id);

  const monthlyPrice = await stripe.prices.create({
    product: product.id,
    unit_amount: 999,
    currency: 'usd',
    recurring: { interval: 'month' },
    metadata: {
      plan: 'monthly',
      display_name: 'S-Class Monthly'
    }
  });

  console.log('Created monthly price:', monthlyPrice.id, '($9.99/month)');

  const yearlyPrice = await stripe.prices.create({
    product: product.id,
    unit_amount: 7999,
    currency: 'usd',
    recurring: { interval: 'year' },
    metadata: {
      plan: 'yearly',
      display_name: 'S-Class Yearly',
      savings: '33%'
    }
  });

  console.log('Created yearly price:', yearlyPrice.id, '($79.99/year)');

  console.log('\nS-Class products created successfully!');
  console.log('Monthly Price ID:', monthlyPrice.id);
  console.log('Yearly Price ID:', yearlyPrice.id);
}

if (process.env.RUN_STRIPE_SEED === "true") {
  createSClassProducts()
    .then(() => {
      console.log("[stripe seed] done");
    })
    .catch((error) => {
      console.error("[stripe seed] failed:", error);
    });
}

