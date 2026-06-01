import ReactMarkdown from 'react-markdown'

interface ChatBubbleProps {
  role: 'user' | 'assistant'
  content: string
  showAvatar?: boolean
}

const mdComponents = {
  p: ({ children }: { children?: React.ReactNode }) => <p className="mb-2 last:mb-0">{children}</p>,
  strong: ({ children }: { children?: React.ReactNode }) => <strong className="font-semibold text-text">{children}</strong>,
  em: ({ children }: { children?: React.ReactNode }) => <em className="italic">{children}</em>,
  ul: ({ children }: { children?: React.ReactNode }) => <ul className="list-disc list-inside mb-2 space-y-0.5">{children}</ul>,
  ol: ({ children }: { children?: React.ReactNode }) => <ol className="list-decimal list-inside mb-2 space-y-0.5">{children}</ol>,
  li: ({ children }: { children?: React.ReactNode }) => <li>{children}</li>,
  h1: ({ children }: { children?: React.ReactNode }) => <h1 className="font-bold mb-1">{children}</h1>,
  h2: ({ children }: { children?: React.ReactNode }) => <h2 className="font-bold mb-1">{children}</h2>,
  h3: ({ children }: { children?: React.ReactNode }) => <h3 className="font-semibold mb-1">{children}</h3>,
  code: ({ children, className }: { children?: React.ReactNode; className?: string }) => className
    ? <code className="block bg-surface1 rounded px-3 py-2 text-xs font-mono my-2 overflow-x-auto">{children}</code>
    : <code className="bg-surface1 rounded px-1 py-0.5 text-xs font-mono">{children}</code>,
  blockquote: ({ children }: { children?: React.ReactNode }) => <blockquote className="border-l-2 border-mauve/50 pl-3 text-subtext0 my-2">{children}</blockquote>,
  hr: () => <hr className="border-surface1 my-2" />,
}

export function ChatBubble({ role, content, showAvatar = false }: ChatBubbleProps) {
  const isUser = role === 'user'

  const bubble = (
    <div className={`max-w-[80%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${
      isUser
        ? 'bg-mauve/20 text-text rounded-tr-sm whitespace-pre-wrap'
        : 'bg-surface0 text-text rounded-tl-sm'
    }`}>
      {isUser ? content : (
        <ReactMarkdown components={mdComponents}>{content}</ReactMarkdown>
      )}
    </div>
  )

  if (!showAvatar) {
    return (
      <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
        {bubble}
      </div>
    )
  }

  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
      <div className={`w-7 h-7 rounded-full shrink-0 flex items-center justify-center text-xs font-bold ${
        isUser ? 'bg-mauve/20 text-mauve' : 'bg-surface1 text-subtext0'
      }`}>
        {isUser ? 'T' : 'AI'}
      </div>
      {bubble}
    </div>
  )
}
