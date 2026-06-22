import { createFileRoute } from '@tanstack/react-router'
import {
  formatInboundWhatsApp,
  sendWhatsApp,
  twilioEmptyResponse,
} from '@/server/messaging'
import { getSupabaseServiceClient } from '@/lib/supabase/service.server'

export const Route = createFileRoute('/api/messaging/whatsapp')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const formData = await request.formData()
        const { from, body } = formatInboundWhatsApp(formData)

        if (!body || !from) {
          return twilioEmptyResponse()
        }

        const supabase = getSupabaseServiceClient()

        // Check if this number is linked to a profile
        const { data: profile } = await supabase
          .from('profiles')
          .select('id')
          .eq('phone', from)
          .maybeSingle()

        if (profile) {
          // Find or create a conversation for this WhatsApp chat
          const { data: existingConversation } = await supabase
            .from('conversations')
            .select('id, agent_id')
            .eq('owner_id', profile.id)
            .eq('metadata->>whatsapp_phone', from)
            .order('updated_at', { ascending: false })
            .limit(1)
            .maybeSingle()

          let conversationId: string
          let agentId: string

          if (existingConversation) {
            conversationId = existingConversation.id
            agentId = existingConversation.agent_id
          } else {
            const { data: agent } = await supabase
              .from('agents')
              .select('id')
              .eq('owner_id', profile.id)
              .eq('status', 'active')
              .order('created_at', { ascending: true })
              .limit(1)
              .maybeSingle()

            if (!agent) {
              await sendWhatsApp(
                from,
                'You don\'t have any active agents. Please create one in the Allein dashboard first.',
              )
              return twilioEmptyResponse()
            }

            agentId = agent.id
            const { data: conversation } = await supabase
              .from('conversations')
              .insert({
                owner_id: profile.id,
                agent_id: agent.id,
                title: `WhatsApp — ${from}`,
                metadata: {
                  source: 'whatsapp',
                  whatsapp_phone: from,
                },
              })
              .select('id')
              .single()

            if (!conversation) {
              return twilioEmptyResponse()
            }

            conversationId = conversation.id
          }

          // Process the message with the AI agent
          const { sendMessageForOwnerImpl } = await import(
            '@/server/chat.server'
          )
          const response = await sendMessageForOwnerImpl({
            ownerId: profile.id,
            agentId,
            conversationId,
            content: body,
          })

          const replyText =
            'error' in response
              ? `Sorry, something went wrong: ${response.error}`
              : response.reply

          // Send reply back via WhatsApp
          await sendWhatsApp(from, replyText)
        } else {
          // Unknown number — log and tell them to link their account
          await supabase.from('usage_log').insert({
            metric: 'whatsapp_orphan_message',
            quantity: 1,
            metadata: {
              phone: from,
              text_preview: body.slice(0, 100),
            },
          })

          await sendWhatsApp(
            from,
            'Hi! Your phone number isn\'t linked to any Allein account yet.\n\n' +
              'To use Allein via WhatsApp, add this number in your Allein Settings → Profile → Phone.\n\n' +
              'Then message me again and your AI agent will respond!',
          )
        }

        return twilioEmptyResponse()
      },
    },
  },
})
