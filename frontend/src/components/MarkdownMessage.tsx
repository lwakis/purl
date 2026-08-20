import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface MarkdownMessageProps {
  content: string;
}

// Warm "darkroom" palette for assistant markdown. Every element is forced to
// the graphite/safelight tokens — no browser defaults, no cold blues.
const components: Components = {
  p: ({ children }) => <p className="text-surface-300 text-sm leading-relaxed my-1">{children}</p>,
  strong: ({ children }) => <strong className="font-semibold text-surface-100">{children}</strong>,
  em: ({ children }) => <em>{children}</em>,
  ul: ({ children }) => <ul className="list-disc pl-5 my-1.5 space-y-1">{children}</ul>,
  ol: ({ children }) => <ol className="list-decimal pl-5 my-1.5 space-y-1">{children}</ol>,
  li: ({ children }) => (
    <li className="text-surface-300 text-sm leading-relaxed [&>p]:my-0 [&>p]:inline">{children}</li>
  ),
  h1: ({ children }) => (
    <h1 className="text-surface-100 font-semibold text-base mt-3 mb-1">{children}</h1>
  ),
  h2: ({ children }) => (
    <h2 className="text-surface-100 font-semibold text-base mt-3 mb-1">{children}</h2>
  ),
  h3: ({ children }) => (
    <h3 className="text-surface-100 font-semibold text-sm mt-3 mb-1">{children}</h3>
  ),
  h4: ({ children }) => (
    <h4 className="text-surface-100 font-semibold text-sm mt-3 mb-1">{children}</h4>
  ),
  code: ({ className, children }) => {
    // A language class means this <code> lives inside a fenced <pre> block —
    // leave it plain; the pre styles it via [&>code]. Everything else is
    // inline code and gets the safelight chip.
    const isBlock = /language-/.test(className ?? '');
    if (isBlock) {
      return <code className={className}>{children}</code>;
    }
    return (
      <code className="bg-surface-800 border border-line rounded px-1 py-0.5 text-xs font-mono text-primary-300">
        {children}
      </code>
    );
  },
  pre: ({ children }) => (
    <pre className="bg-surface-800 border border-line rounded-lg p-3 my-2 overflow-x-auto [&>code]:bg-transparent [&>code]:border-0 [&>code]:p-0 [&>code]:text-xs [&>code]:font-mono [&>code]:text-surface-200">
      {children}
    </pre>
  ),
  a: ({ children, href }) => (
    <a href={href} className="text-primary-400 hover:text-primary-300 underline">
      {children}
    </a>
  ),
  blockquote: ({ children }) => (
    <blockquote className="border-l-2 border-primary-500/40 pl-3 text-surface-400 text-sm italic">
      {children}
    </blockquote>
  ),
  hr: () => <hr className="border-line-subtle my-3" />,
  table: ({ children }) => (
    <table className="w-full text-xs text-surface-300 my-2 border-collapse">{children}</table>
  ),
  th: ({ children }) => <th className="border border-line px-2 py-1 text-left">{children}</th>,
  td: ({ children }) => <td className="border border-line px-2 py-1 text-left">{children}</td>,
};

export default function MarkdownMessage({ content }: MarkdownMessageProps) {
  return (
    <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
      {content}
    </ReactMarkdown>
  );
}
