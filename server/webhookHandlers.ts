import { getStripeSync, getUncachableStripeClient } from './stripeClient';
import { storage } from './storage';

export class WebhookHandlers {
  static async processWebhook(payload: Buffer, signature: string): Promise<void> {
    if (!Buffer.isBuffer(payload)) {
      throw new Error(
        'STRIPE WEBHOOK ERROR: Payload must be a Buffer. ' +
        'Received type: ' + typeof payload + '. ' +
        'This usually means express.json() parsed the body before reaching this handler. ' +
        'FIX: Ensure webhook route is registered BEFORE app.use(express.json()).'
      );
    }

    // Let stripe-sync handle subscription events
    const sync = await getStripeSync();
    await sync.processWebhook(payload, signature);
    
    // Also handle minor token purchase events
    await this.handleMinorTokenPurchase(payload, signature);
  }
  
  static async handleMinorTokenPurchase(payload: Buffer, signature: string): Promise<void> {
    try {
      const stripe = await getUncachableStripeClient();
      const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
      
      let event;
      if (webhookSecret) {
        event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
      } else {
        event = JSON.parse(payload.toString());
      }
      
      if (event.type === 'checkout.session.completed') {
        const session = event.data.object;
        
        // Check if this is a minor token purchase
        if (session.metadata?.type === 'minor_token_purchase') {
          const authRequestId = session.metadata.authRequestId;
          const childId = session.metadata.childId;
          const tokenAmount = parseInt(session.metadata.tokenAmount, 10);
          
          if (authRequestId && childId && tokenAmount && session.payment_status === 'paid') {
            const authRequest = await storage.getAuthRequestById(authRequestId);
            
            if (authRequest && authRequest.status === 'checkout_created') {
              // Mark as paid
              await storage.markPaid(authRequestId, session.payment_intent as string);
              
              // Fulfill the request (idempotent)
              const { alreadyFulfilled } = await storage.fulfillAuthRequest(
                authRequestId,
                childId,
                tokenAmount
              );
              
              if (!alreadyFulfilled) {
                console.log(`Webhook: Credited ${tokenAmount} tokens to child ${childId} for request ${authRequestId}`);
              }
            }
          }
        }
      }
    } catch (error: any) {
      // Don't throw - let stripe-sync continue processing even if our handler fails
      console.error('Minor token purchase webhook error:', error.message);
    }
  }
}
