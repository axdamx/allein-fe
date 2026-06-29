import twilio from 'twilio';
import { Bot } from 'grammy';

let client = null;
const getClient = () => {
  if (!client) {
    const sid = process.env.TWILIO_ACCOUNT_SID;
    const token = process.env.TWILIO_AUTH_TOKEN;
    if (!sid || !token) {
      throw new Error(
        "TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN must be set"
      );
    }
    client = twilio(sid, token);
  }
  return client;
};
const sendWhatsApp = async (to, body) => {
  try {
    const fromNumber = process.env.TWILIO_WHATSAPP_NUMBER;
    if (!fromNumber) {
      return { success: false, error: "TWILIO_WHATSAPP_NUMBER not configured" };
    }
    const msg = await getClient().messages.create({
      from: `whatsapp:${fromNumber}`,
      to: `whatsapp:${to}`,
      body
    });
    return { success: true, messageId: msg.sid };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { success: false, error: message };
  }
};

let bot = null;
const getBot = () => {
  if (!bot) {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token) {
      throw new Error("TELEGRAM_BOT_TOKEN must be set");
    }
    bot = new Bot(token);
  }
  return bot;
};
const sendTelegram = async (chatId, text) => {
  try {
    const msg = await getBot().api.sendMessage(Number(chatId), text);
    return { success: true, messageId: msg.message_id };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { success: false, error: message };
  }
};

export { sendTelegram, sendWhatsApp };
