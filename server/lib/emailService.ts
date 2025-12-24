const RESEND_API_KEY = process.env.RESEND_API_KEY;
const EMAIL_FROM = process.env.EMAIL_FROM || 'AniRealm <noreply@anirealm.com>';
const APP_BASE_URL = process.env.REPLIT_DOMAINS 
  ? `https://${process.env.REPLIT_DOMAINS.split(',')[0]}`
  : 'https://anirealm.replit.app';

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export async function sendEmail(options: EmailOptions): Promise<{ success: boolean; error?: string }> {
  if (!RESEND_API_KEY) {
    console.log('[Email] Resend API key not configured. Email would have been sent to:', options.to);
    console.log('[Email] Subject:', options.subject);
    return { success: false, error: 'Email service not configured' };
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: EMAIL_FROM,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('[Email] Failed to send:', errorData);
      return { success: false, error: errorData.message || 'Failed to send email' };
    }

    console.log('[Email] Successfully sent to:', options.to);
    return { success: true };
  } catch (error: any) {
    console.error('[Email] Error sending email:', error.message);
    return { success: false, error: error.message };
  }
}

export function formatPrice(cents: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(cents / 100);
}

export function getEmailTemplate(
  type: 'purchase_request' | 'purchase_approved' | 'purchase_declined' | 'purchase_completed',
  data: {
    parentName: string;
    childName: string;
    tokenAmount: number;
    price: string;
    expiresAt?: Date;
    dashboardUrl?: string;
  }
): { subject: string; html: string; text: string } {
  const dashboardUrl = data.dashboardUrl || `${APP_BASE_URL}/parent`;
  
  const baseStyles = `
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    max-width: 600px;
    margin: 0 auto;
    background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
    color: #ffffff;
    padding: 40px;
    border-radius: 16px;
  `;
  
  const buttonStyles = `
    display: inline-block;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: #ffffff;
    padding: 14px 28px;
    border-radius: 8px;
    text-decoration: none;
    font-weight: 600;
    margin: 20px 0;
  `;

  switch (type) {
    case 'purchase_request':
      return {
        subject: 'AniRealm: Purchase approval needed',
        html: `
          <div style="${baseStyles}">
            <h1 style="color: #667eea; margin-bottom: 24px;">Purchase Request</h1>
            <p>Hi ${data.parentName},</p>
            <p><strong>${data.childName}</strong> has requested to purchase tokens on AniRealm:</p>
            <div style="background: rgba(255,255,255,0.1); padding: 20px; border-radius: 12px; margin: 20px 0;">
              <p style="margin: 8px 0;"><strong>Token Amount:</strong> ${data.tokenAmount.toLocaleString()} tokens</p>
              <p style="margin: 8px 0;"><strong>Price:</strong> ${data.price}</p>
              ${data.expiresAt ? `<p style="margin: 8px 0; color: #ffc107;"><strong>Expires:</strong> ${new Date(data.expiresAt).toLocaleDateString()} at ${new Date(data.expiresAt).toLocaleTimeString()}</p>` : ''}
            </div>
            <p>You can approve or decline this request in the Parent Dashboard:</p>
            <a href="${dashboardUrl}" style="${buttonStyles}">Open Parent Dashboard</a>
            <p style="color: #999; font-size: 12px; margin-top: 30px;">
              Tokens are only delivered after you approve and complete payment.
            </p>
          </div>
        `,
        text: `Hi ${data.parentName},\n\n${data.childName} has requested to purchase ${data.tokenAmount.toLocaleString()} tokens for ${data.price}.\n\nOpen the Parent Dashboard to approve or decline: ${dashboardUrl}\n\nThis request expires on ${data.expiresAt ? new Date(data.expiresAt).toLocaleString() : 'N/A'}.`,
      };

    case 'purchase_approved':
      return {
        subject: 'AniRealm: Purchase approved - Complete payment',
        html: `
          <div style="${baseStyles}">
            <h1 style="color: #28a745; margin-bottom: 24px;">Purchase Approved</h1>
            <p>Hi ${data.parentName},</p>
            <p>You've approved ${data.childName}'s purchase request:</p>
            <div style="background: rgba(255,255,255,0.1); padding: 20px; border-radius: 12px; margin: 20px 0;">
              <p style="margin: 8px 0;"><strong>Token Amount:</strong> ${data.tokenAmount.toLocaleString()} tokens</p>
              <p style="margin: 8px 0;"><strong>Price:</strong> ${data.price}</p>
            </div>
            <p>Complete the payment to deliver the tokens to ${data.childName}'s account.</p>
            <a href="${dashboardUrl}" style="${buttonStyles}">Complete Payment</a>
          </div>
        `,
        text: `Hi ${data.parentName},\n\nYou've approved ${data.childName}'s purchase of ${data.tokenAmount.toLocaleString()} tokens for ${data.price}.\n\nComplete the payment in the Parent Dashboard: ${dashboardUrl}`,
      };

    case 'purchase_declined':
      return {
        subject: 'AniRealm: Purchase request declined',
        html: `
          <div style="${baseStyles}">
            <h1 style="color: #dc3545; margin-bottom: 24px;">Purchase Declined</h1>
            <p>Hi ${data.parentName},</p>
            <p>You've declined ${data.childName}'s purchase request:</p>
            <div style="background: rgba(255,255,255,0.1); padding: 20px; border-radius: 12px; margin: 20px 0;">
              <p style="margin: 8px 0;"><strong>Token Amount:</strong> ${data.tokenAmount.toLocaleString()} tokens</p>
              <p style="margin: 8px 0;"><strong>Price:</strong> ${data.price}</p>
            </div>
            <p>No charges have been made. ${data.childName} can submit a new request anytime.</p>
          </div>
        `,
        text: `Hi ${data.parentName},\n\nYou've declined ${data.childName}'s purchase request for ${data.tokenAmount.toLocaleString()} tokens (${data.price}).\n\nNo charges have been made.`,
      };

    case 'purchase_completed':
      return {
        subject: 'AniRealm: Purchase completed - Tokens delivered!',
        html: `
          <div style="${baseStyles}">
            <h1 style="color: #28a745; margin-bottom: 24px;">Purchase Complete!</h1>
            <p>Hi ${data.parentName},</p>
            <p>Great news! The tokens have been delivered to ${data.childName}'s account:</p>
            <div style="background: rgba(40,167,69,0.2); padding: 20px; border-radius: 12px; margin: 20px 0; border: 1px solid #28a745;">
              <p style="margin: 8px 0; font-size: 24px; text-align: center;"><strong>${data.tokenAmount.toLocaleString()}</strong> tokens</p>
              <p style="margin: 8px 0; text-align: center; color: #28a745;">Successfully delivered!</p>
            </div>
            <p>Thank you for supporting ${data.childName}'s adventures on AniRealm!</p>
            <a href="${dashboardUrl}" style="${buttonStyles}">View Parent Dashboard</a>
          </div>
        `,
        text: `Hi ${data.parentName},\n\n${data.tokenAmount.toLocaleString()} tokens have been delivered to ${data.childName}'s account!\n\nThank you for your purchase.`,
      };
  }
}
