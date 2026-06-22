import { createFileRoute } from '@tanstack/react-router'
import { parseTelegramUpdate, sendTelegram } from '@/server/messaging'
import { getSupabaseServiceClient } from '@/lib/supabase/service.server'

export const Route = createFileRoute('/api/messaging/telegram')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const update = await request.json()
        const parsed = parseTelegramUpdate(update)

        if (!parsed) {
          return new Response(JSON.stringify({ ok: true }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          })
        }

        const chatId = String(parsed.chatId)

        // /start command — welcome message with chat ID
        if (parsed.type === 'start') {
          return new Response(
            JSON.stringify({
              method: 'sendMessage',
              chat_id: parsed.chatId,
              text:
                'Welcome to Allein!\n\n' +
                'Link your Telegram by adding this chat ID in your Allein Integrations settings:\n' +
                `\`${chatId}\``,
              parse_mode: 'Markdown',
            }),
            {
              status: 200,
              headers: { 'Content-Type': 'application/json' },
            },
          )
        }

        // Regular text message — look up owner by telegram_chat_id
        if (parsed.type === 'message' && parsed.text) {
          const supabase = getSupabaseServiceClient()

          const { data: profile } = await supabase
            .from('profiles')
            .select('id')
            .eq('telegram_chat_id', chatId)
            .maybeSingle()

          if (!profile) {
            return new Response(
              JSON.stringify({
                method: 'sendMessage',
                chat_id: parsed.chatId,
                text:
                  'Your Telegram is not yet linked to an Allein account.\n\n' +
                  'Log in to Allein, go to Settings → Integrations, and enter this chat ID:\n' +
                  `\`${chatId}\``,
                parse_mode: 'Markdown',
              }),
              {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
              },
            )
          }

          // Find or create a conversation for this Telegram chat
          const { data: existingConversation } = await supabase
            .from('conversations')
            .select('id, agent_id')
            .eq('owner_id', profile.id)
            .eq('metadata->>telegram_chat_id', chatId)
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
              return new Response(
                JSON.stringify({
                  method: 'sendMessage',
                  chat_id: parsed.chatId,
                  text:
                    'You don\'t have any active agents. Please create one in the Allein dashboard first.',
                }),
                {
                  status: 200,
                  headers: { 'Content-Type': 'application/json' },
                },
              )
            }

            agentId = agent.id
            const { data: conversation } = await supabase
              .from('conversations')
              .insert({
                owner_id: profile.id,
                agent_id: agent.id,
                title: `Telegram — ${parsed.firstName ?? chatId}`,
                metadata: {
                  source: 'telegram',
                  chat_id: chatId,
                  telegram_username: parsed.username ?? null,
                },
              })
              .select('id')
              .single()

            if (!conversation) {
              return new Response(JSON.stringify({ ok: true }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
              })
            }

            conversationId = conversation.id
          }

          // Process the message with the AI agent
          const { sendMessageForOwnerImpl } = await import('@/server/chat.server')
          const response = await sendMessageForOwnerImpl({
            ownerId: profile.id,
            agentId,
            conversationId,
            content: parsed.text,
          })

          const replyText =
            'error' in response
              ? `Sorry, something went wrong: ${response.error}`
              : response.reply

          // Send reply back to Telegram
          try {
            await sendTelegram(chatId, replyText)
          } catch {
            // Non-critical — reply is already saved in conversation
          }
        }

        return new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      },
    },
  },
})
