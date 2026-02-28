
import { storage } from './storage';
import { formatPrice, getEmailTemplate, sendEmail } from './lib/emailService';
import { stripe } from './stripeClient';

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

    // Handle minor token purchase events (subscription events handled in index.ts webhook)
    await this.handleMinorTokenPurchase(payload, signature);
  }
  
  /**
   * CRITICAL #1: Verify Stripe webhook signature
   * - In production, STRIPE_WEBHOOK_SECRET is REQUIRED
   * - In dev, JSON fallback only allowed if ALLOW_INSECURE_STRIPE_WEBHOOKS=true
   */
  static verifyWebhookSignature(payload: Buffer, signature: string, stripe: any): any {
    const isProd = process.env.NODE_ENV === 'production';
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    
    if (isProd && !webhookSecret) {
      throw new Error('CRITICAL: Missing STRIPE_WEBHOOK_SECRET in production - webhook rejected');
    }
    
    if (!webhookSecret) {
      // Dev-only escape hatch
      if (process.env.ALLOW_INSECURE_STRIPE_WEBHOOKS !== 'true') {
        throw new Error('Missing STRIPE_WEBHOOK_SECRET. Set ALLOW_INSECURE_STRIPE_WEBHOOKS=true for dev testing.');
      }
      console.warn('[Webhook] WARNING: Processing unverified webhook in dev mode');
      return JSON.parse(payload.toString());
    }
    
    return stripe.webhooks.constructEvent(payload, signature, webhookSecret);
  }
  
  static async handleMinorTokenPurchase(payload: Buffer, signature: string): Promise<void> {
    try {
      
      
      // CRITICAL #1: Verify webhook signature (required in production)
      const event = this.verifyWebhookSignature(payload, signature, stripe);
      
      if (event.type === 'checkout.session.completed') {
        const session = event.data.object;
        
        // Check if this is a minor token purchase
        if (session.metadata?.type === 'minor_token_purchase') {
          const purchaseRequestId = session.metadata.purchaseRequestId;
          const childId = session.metadata.childId;
          const totalTokens = parseInt(session.metadata.totalTokens, 10);
          
          if (purchaseRequestId && childId && totalTokens && session.payment_status === 'paid') {

              // ===== Stripe idempotency gate (NEW) =====
            const stripeSessionId = session.id as string;
            const stripePaymentIntentId =
              typeof session.payment_intent === "string"
                ? (session.payment_intent as string)
                : null;

            const created = await storage.tryCreateStripeFulfillment({
              stripeSessionId,
              stripePaymentIntentId,
              userId: childId,
              type: "minor_token_purchase",
              tokenAmount: totalTokens,
              amountCents:
                typeof session.amount_total === "number"
                  ? session.amount_total
                  : undefined,
            });

            if (!created) {
              await storage.logSecurityEvent({
                eventType: "WEBHOOK_BLOCKED",
                reason: "DUPLICATE_SESSION",
                childId,
                purchaseRequestId,
                metadata: { stripeSessionId, stripeEventType: event.type },
              });

              console.log(`[Webhook] Duplicate session ignored: ${stripeSessionId}`);
              return;
            }
            // ===== End idempotency gate =====
            const purchaseRequest = await storage.getPurchaseRequestById(purchaseRequestId);
            
            if (!purchaseRequest) {
              console.error(`Webhook: Purchase request ${purchaseRequestId} not found`);
              
              // Log blocked webhook for metrics - request not found
              await storage.logSecurityEvent({
                eventType: 'WEBHOOK_BLOCKED',
                reason: 'REQUEST_NOT_FOUND',
                purchaseRequestId: purchaseRequestId,
                metadata: { stripeEventType: event.type, stripeSessionId },
              });
              
              return;
            }
            
            // CRITICAL #2: Check if request has expired BEFORE crediting tokens
            if (purchaseRequest.expiresAt && new Date() > new Date(purchaseRequest.expiresAt)) {
              // Payment received after expiration - mark for manual review
              console.error(`ALERT: Payment received after expiry for request ${purchaseRequestId}. Manual review needed.`);
              await storage.markPurchaseExpiredAfterPayment(purchaseRequestId, session.payment_intent as string);
              
              // Log blocked webhook for metrics
              await storage.logSecurityEvent({
                eventType: 'WEBHOOK_BLOCKED',
                reason: 'REQUEST_EXPIRED',
                parentId: purchaseRequest.parentUserId,
                childId: childId,
                purchaseRequestId: purchaseRequestId,
                priceCents: purchaseRequest.unitAmountCents,
                tokenAmount: totalTokens,
                metadata: { paymentIntent: session.payment_intent },
              });
              
              return; // DO NOT credit tokens
            }
            
            if (purchaseRequest.status === 'CHECKOUT_CREATED') {
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
                  
                  // Log successful token credit for metrics
                  await storage.logSecurityEvent({
                    eventType: 'WEBHOOK_CREDITED',
                    reason: 'SUCCESS',
                    parentId: purchaseRequest.parentUserId,
                    childId: childId,
                    purchaseRequestId: purchaseRequestId,
                    priceCents: purchaseRequest.unitAmountCents,
                    tokenAmount: totalTokens,
                    metadata: { paymentIntent: session.payment_intent },
                  });
                  
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
                
                // Log blocked webhook for metrics - duplicate/already credited
                await storage.logSecurityEvent({
                  eventType: 'WEBHOOK_BLOCKED',
                  reason: 'ALREADY_CREDITED',
                  parentId: purchaseRequest.parentUserId,
                  childId: childId,
                  purchaseRequestId: purchaseRequestId,
                  metadata: { stripeEventType: event.type, stripeSessionId },
                });
                
                console.log(`Webhook: Skipped duplicate credit for request ${purchaseRequestId}`);
              }
            }
          }
        }
      }
    } catch (error: any) {
      // Don't throw - let stripe-sync continue processing even if our handler fails
      console.error('Minor token purchase webhook error:', error.message);
      
      // Log blocked webhook for metrics - signature failure or other error
      // Non-blocking: logSecurityEvent is wrapped in try/catch
      await storage.logSecurityEvent({
        eventType: 'WEBHOOK_BLOCKED',
        reason: 'SIGNATURE_FAIL',
        metadata: { 
          nodeEnv: process.env.NODE_ENV,
          route: '/api/stripe/webhook',
          errorMessage: error.message?.slice(0, 200), // Truncate for safety
        },
      });
    }
  }
}
