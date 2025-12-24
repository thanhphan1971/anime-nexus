import { getStripeSync, getUncachableStripeClient } from './stripeClient';
import { storage } from './storage';
import { formatPrice, getEmailTemplate, sendEmail } from './lib/emailService';

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
          const purchaseRequestId = session.metadata.purchaseRequestId;
          const childId = session.metadata.childId;
          const totalTokens = parseInt(session.metadata.totalTokens, 10);
          
          if (purchaseRequestId && childId && totalTokens && session.payment_status === 'paid') {
            const purchaseRequest = await storage.getPurchaseRequestById(purchaseRequestId);
            
            if (purchaseRequest && purchaseRequest.status === 'CHECKOUT_CREATED') {
              // Mark as paid
              await storage.markPurchasePaid(purchaseRequestId, session.payment_intent as string);
              
              // Idempotent token crediting using tokenLedger
              const existingLedgerEntry = await storage.getTokenLedgerByPurchaseRequest(purchaseRequestId);
              
              if (!existingLedgerEntry) {
                // Credit tokens to child
                const child = await storage.getUser(childId);
                const parent = await storage.getUser(purchaseRequest.parentUserId);
                
                if (child) {
                  await storage.updateUser(childId, {
                    tokens: child.tokens + totalTokens
                  });
                  
                  // Record in token ledger for idempotency
                  await storage.createTokenLedgerEntry({
                    userId: childId,
                    source: 'minor_token_purchase',
                    purchaseRequestId: purchaseRequestId,
                    deltaTokens: totalTokens,
                  });
                  
                  // Mark request as fulfilled
                  await storage.fulfillPurchaseRequest(purchaseRequestId);
                  
                  console.log(`Webhook: Credited ${totalTokens} tokens to child ${childId} for request ${purchaseRequestId}`);
                  
                  // Create completion notification for parent
                  if (parent) {
                    const priceFormatted = formatPrice(purchaseRequest.unitAmountCents, purchaseRequest.currency);
                    
                    await storage.createParentNotification({
                      userId: parent.id,
                      type: 'PURCHASE_COMPLETED',
                      title: 'Purchase completed!',
                      body: `${totalTokens.toLocaleString()} tokens delivered to ${child.name || child.handle}'s account.`,
                      metadata: {
                        purchaseRequestId: purchaseRequestId,
                        childId: child.id,
                        childName: child.name || child.handle,
                        tokenAmount: totalTokens,
                        priceCents: purchaseRequest.unitAmountCents,
                        currency: purchaseRequest.currency,
                      },
                    });
                    
                    // Send completion email to parent
                    const emailTemplate = getEmailTemplate('purchase_completed', {
                      parentName: parent.name || 'Parent',
                      childName: child.name || child.handle || 'Your child',
                      tokenAmount: totalTokens,
                      price: priceFormatted,
                    });
                    
                    sendEmail({
                      to: parent.email,
                      subject: emailTemplate.subject,
                      html: emailTemplate.html,
                      text: emailTemplate.text,
                    }).catch(err => console.error('[Email] Failed to send completion email:', err));
                  }
                }
              } else {
                // Already credited, ensure status is fulfilled
                await storage.fulfillPurchaseRequest(purchaseRequestId);
                console.log(`Webhook: Skipped duplicate credit for request ${purchaseRequestId}`);
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
