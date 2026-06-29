import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { g as getSupabaseServiceClient } from '../service.server.mjs';
import '@supabase/ssr';
import 'ws';

const sendWhatsAppTool = createTool({
  id: "send-whatsapp",
  description: "Send a WhatsApp message to a contact. Use when the user wants to message a lead, customer, or prospect on WhatsApp. Requires their phone number with country code.",
  inputSchema: z.object({
    to: z.string().describe("Recipient phone number with country code (e.g. 60123456789)"),
    message: z.string().describe("Message body to send"),
    leadId: z.string().optional().describe("Lead ID to log this message against")
  }),
  execute: async ({ to, message, leadId }, context) => {
    const resourceId = context?.agent?.resourceId;
    const { sendWhatsApp } = await import('../index2.mjs');
    const result = await sendWhatsApp(to, message);
    if (!result.success) return result;
    if (leadId) {
      const supabase = getSupabaseServiceClient();
      await supabase.from("leads").update({ last_contacted_at: (/* @__PURE__ */ new Date()).toISOString() }).eq("id", leadId).eq("owner_id", resourceId);
    }
    return {
      success: true,
      message: `WhatsApp message sent to ${to}`,
      messageId: result.messageId
    };
  }
});
const sendTelegramTool = createTool({
  id: "send-telegram",
  description: "Send a Telegram message to a contact. Use when the user wants to message a lead, customer, or prospect on Telegram, or send info to their own Telegram. The user's Telegram chat ID is available in the User Context \u2014 use that when the user says 'send to my Telegram'.",
  inputSchema: z.object({
    chatId: z.string().describe("Telegram chat ID of the recipient (numeric string). For sending to the user themselves, use the Telegram chat ID from User Context."),
    message: z.string().describe("Message body to send")
  }),
  execute: async ({ chatId, message }) => {
    const { sendTelegram } = await import('../index2.mjs');
    const result = await sendTelegram(chatId, message);
    if (!result.success) return result;
    return {
      success: true,
      message: `Telegram message sent to chat ${chatId}`,
      messageId: result.messageId
    };
  }
});

export { sendTelegramTool, sendWhatsAppTool };
