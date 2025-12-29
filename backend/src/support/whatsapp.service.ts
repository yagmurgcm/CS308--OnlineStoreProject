import { Injectable, Logger } from '@nestjs/common';
import { Twilio } from 'twilio';

@Injectable()
export class WhatsAppService {
  private readonly logger = new Logger(WhatsAppService.name);
  private readonly client: Twilio | null;
  private readonly agentPhoneNumber = '+905302564996'; // Agent WhatsApp number

  constructor() {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const whatsappFrom = process.env.TWILIO_WHATSAPP_FROM; // e.g., 'whatsapp:+14155238886'

    if (accountSid && authToken) {
      this.client = new Twilio(accountSid, authToken);
      this.logger.log('Twilio WhatsApp client initialized');
    } else {
      this.client = null;
      this.logger.warn(
        'Twilio credentials not found. WhatsApp notifications will be disabled.',
      );
    }
  }

  /**
   * Send WhatsApp message to agent when a new message is received
   * @param conversationId - The conversation ID
   * @param customerName - Customer or guest name
   * @param messageContent - The message content
   */
  async notifyAgent(
    conversationId: number,
    customerName: string,
    messageContent: string,
  ): Promise<void> {
    if (!this.client) {
      this.logger.warn('Twilio client not initialized. Skipping WhatsApp notification.');
      return;
    }

    const whatsappFrom = process.env.TWILIO_WHATSAPP_FROM;
    if (!whatsappFrom) {
      this.logger.warn('TWILIO_WHATSAPP_FROM not set. Skipping WhatsApp notification.');
      return;
    }

    try {
      // Format phone number (ensure it starts with whatsapp:)
      const toNumber = this.agentPhoneNumber.startsWith('whatsapp:')
        ? this.agentPhoneNumber
        : `whatsapp:${this.agentPhoneNumber}`;

      // Format from number (ensure it starts with whatsapp:)
      const fromNumber = whatsappFrom.startsWith('whatsapp:')
        ? whatsappFrom
        : `whatsapp:${whatsappFrom}`;

      // Truncate message if too long (WhatsApp has limits)
      const truncatedMessage =
        messageContent.length > 1500
          ? messageContent.substring(0, 1500) + '...'
          : messageContent;

      const messageBody = `📩 New Support Message\n\n` +
        `From: ${customerName}\n` +
        `Conversation ID: ${conversationId}\n\n` +
        `Message:\n${truncatedMessage}`;

      await this.client.messages.create({
        from: fromNumber,
        to: toNumber,
        body: messageBody,
      });

      this.logger.log(
        `WhatsApp notification sent to agent for conversation ${conversationId}`,
      );
    } catch (error: any) {
      const errorMessage = error?.message || String(error);
      const errorStack = error?.stack || '';
      this.logger.error(
        `Failed to send WhatsApp notification: ${errorMessage}`,
        errorStack,
      );
      // Don't throw - we don't want WhatsApp failures to break the main flow
    }
  }

  /**
   * Send WhatsApp message when agent sends a response (optional - for customer notifications)
   * Currently not used, but available for future use
   */
  async notifyCustomer(
    customerPhoneNumber: string,
    messageContent: string,
  ): Promise<void> {
    if (!this.client) {
      return;
    }

    const whatsappFrom = process.env.TWILIO_WHATSAPP_FROM;
    if (!whatsappFrom) {
      return;
    }

    try {
      const toNumber = customerPhoneNumber.startsWith('whatsapp:')
        ? customerPhoneNumber
        : `whatsapp:${customerPhoneNumber}`;

      const fromNumber = whatsappFrom.startsWith('whatsapp:')
        ? whatsappFrom
        : `whatsapp:${whatsappFrom}`;

      await this.client.messages.create({
        from: fromNumber,
        to: toNumber,
        body: messageContent,
      });

      this.logger.log(`WhatsApp message sent to customer`);
    } catch (error) {
      this.logger.error(`Failed to send WhatsApp to customer: ${error.message}`);
    }
  }
}

