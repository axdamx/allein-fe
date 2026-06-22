import twilio from 'twilio'

let client: ReturnType<typeof twilio> | null = null

function getClient() {
  if (!client) {
    const sid = process.env.TWILIO_ACCOUNT_SID
    const token = process.env.TWILIO_AUTH_TOKEN
    if (!sid || !token) {
      throw new Error(
        'TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN must be set',
      )
    }
    client = twilio(sid, token)
  }
  return client
}

export async function sendWhatsApp(
  to: string,
  body: string,
): Promise<{ success: true; messageId: string } | { success: false; error: string }> {
  try {
    const fromNumber = process.env.TWILIO_WHATSAPP_NUMBER
    if (!fromNumber) {
      return { success: false, error: 'TWILIO_WHATSAPP_NUMBER not configured' }
    }
    const msg = await getClient().messages.create({
      from: `whatsapp:${fromNumber}`,
      to: `whatsapp:${to}`,
      body,
    })
    return { success: true, messageId: msg.sid }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return { success: false, error: message }
  }
}

export function formatInboundWhatsApp(formData: FormData): {
  from: string
  body: string
  messageSid: string
  profileName?: string
} {
  const from = (formData.get('From') as string).replace('whatsapp:', '')
  const body = (formData.get('Body') as string) ?? ''
  const messageSid = (formData.get('MessageSid') as string) ?? ''
  const profileName = (formData.get('ProfileName') as string) ?? undefined
  return { from, body, messageSid, profileName }
}

export function twilioTextResponse(message: string): Response {
  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${message}</Message></Response>`,
    {
      status: 200,
      headers: { 'Content-Type': 'application/xml' },
    },
  )
}

export function twilioEmptyResponse(): Response {
  return new Response(
    '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
    {
      status: 200,
      headers: { 'Content-Type': 'application/xml' },
    },
  )
}
