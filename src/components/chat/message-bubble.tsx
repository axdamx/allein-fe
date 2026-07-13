import { useState, useCallback } from "react";
import { Check, Copy, Bot, User, FileText } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { formatTime } from "@/components/chat/chat-utils";
import { TypingIndicator } from "@/components/chat/typing-indicator";
import type { MessageRow } from "@/hooks/use-chat";

export const MessageBubble = ({
  message,
}: {
  message: MessageRow;
}) => {
  const isUser = message.role === "user";

  return (
    <div
      className={cn(
        "flex gap-3 m-5",
        isUser
          ? "flex-row-reverse animate-message-in-right"
          : "flex-row animate-message-in-left",
      )}
    >
      <Avatar className="mt-1 size-8 shrink-0">
        <AvatarFallback
          className={cn(
            "size-8 text-xs",
            isUser ? "bg-primary text-primary-foreground" : "bg-muted",
          )}
        >
          {isUser ? <User className="size-4" /> : <Bot className="size-4" />}
        </AvatarFallback>
      </Avatar>
      <div
        className={cn(
          "flex min-w-0 flex-col gap-1",
          isUser ? "items-end" : "items-start",
        )}
      >
        <div
          className={cn(
            "max-w-[85%] min-w-0 overflow-hidden rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
            isUser
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-foreground",
          )}
        >
          {/* Attachment preview (user messages with a file/image) */}
          {isUser && message.attachment_url && (
            <AttachmentView
              url={message.attachment_url}
              mime={message.attachment_mime}
              name={message.attachment_name}
            />
          )}
          {isUser ? (
            <p className="whitespace-pre-wrap break-words">{message.content}</p>
          ) : (
            <MarkdownContent content={message.content} />
          )}
        </div>
        <span className="px-1 text-[10px] text-muted-foreground/60">
          {formatTime(message.created_at)}
        </span>
      </div>
    </div>
  );
}

/**
 * Inline attachment renderer for user messages.
 * Images are shown as a thumbnail; other files get a file chip.
 */
const AttachmentView = ({
  url,
  mime,
  name,
}: {
  url: string;
  mime: string | null;
  name: string | null;
}) => {
  const isImage = mime?.startsWith("image/") ?? /\.(png|jpe?g|webp|gif)$/i.test(url);
  if (isImage) {
    return (
      <img
        src={url}
        alt={name ?? "attachment"}
        className="mb-2 max-h-60 w-full rounded-lg object-cover"
      />
    );
  }
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className="mb-2 flex max-w-full items-center gap-2 rounded-lg bg-background/20 px-2.5 py-1.5 text-xs transition-colors hover:bg-background/30"
    >
      <FileText className="size-4 shrink-0" />
      <span className="min-w-0 flex-1 truncate font-medium">
        {name ?? "Attachment"}
      </span>
    </a>
  );
};

const MarkdownContent = ({ content }: { content: string }) => {
  return (
    <div className="prose prose-sm dark:prose-invert max-w-none break-words">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight]}
        components={{
          code({ className, children, ...props }) {
            const match = /language-(\w+)/.exec(className ?? "");
            const isInline = !match && !className;
            if (isInline) {
              return (
                <code
                  className="rounded bg-foreground/10 px-1 py-0.5 text-sm font-medium"
                  {...props}
                >
                  {children}
                </code>
              );
            }
            return (
              <CodeBlock
                language={match?.[1] ?? "text"}
                code={String(children).replace(/\n$/, "")}
              />
            );
          },
          pre({ children }) {
            return <>{children}</>;
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

const CodeBlock = ({ language, code }: { language: string; code: string }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }, [code]);

  return (
    <div className="not-prose my-2 overflow-hidden rounded-lg border bg-[#0d1117] text-sm">
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-1.5">
        <span className="text-xs text-white/60">{language}</span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 text-xs text-white/60 transition-colors hover:text-white/90"
        >
          {copied ? (
            <>
              <Check className="size-3.5" /> Copied
            </>
          ) : (
            <>
              <Copy className="size-3.5" /> Copy
            </>
          )}
        </button>
      </div>
      <div className="overflow-x-auto p-4">
        <code className={`language-${language} hljs`}>{code}</code>
      </div>
    </div>
  );
}

export const StreamingBubble = ({ text }: { text: string }) => {
  return (
    <div className="flex gap-3">
      <Avatar className="mt-1 size-8 shrink-0">
        <AvatarFallback className="size-8 bg-muted">
          <Bot className="size-4" />
        </AvatarFallback>
      </Avatar>
      <div className="flex min-w-0 flex-col gap-2">
        <div className="w-fit max-w-[85%] rounded-2xl bg-muted px-4 py-2.5 text-sm leading-relaxed">
          {text ? (
            <span className="streaming-cursor whitespace-pre-wrap break-words">
              {text}
            </span>
          ) : (
            <TypingIndicator className="text-muted-foreground" />
          )}
        </div>
      </div>
    </div>
  );
}
