const { SESClient, SendEmailCommand } = require('@aws-sdk/client-ses');

const sesClient = new SESClient({ region: process.env.AWS_REGION });

/**
 * Sends a low-stock alert email via AWS SES.
 * Fails silently (logs only) so a broken mail config never breaks the order flow.
 */
async function sendLowStockAlert(product) {
  if (!process.env.SES_SENDER_EMAIL || !process.env.SES_ALERT_RECIPIENT) {
    console.warn('SES not configured — skipping low-stock email.');
    return;
  }

  const params = {
    Source: process.env.SES_SENDER_EMAIL,
    Destination: { ToAddresses: [process.env.SES_ALERT_RECIPIENT] },
    Message: {
      Subject: { Data: `Low Stock Alert: ${product.name} (${product.sku})` },
      Body: {
        Text: {
          Data: `Product "${product.name}" at outlet "${product.outlet}" has dropped to ${product.quantity} units (threshold: ${product.lowStockThreshold}).`,
        },
      },
    },
  };

  try {
    await sesClient.send(new SendEmailCommand(params));
    console.log(`Low-stock alert sent for ${product.sku}`);
  } catch (err) {
    console.error('Failed to send low-stock alert:', err.message);
  }
}

module.exports = { sendLowStockAlert };
