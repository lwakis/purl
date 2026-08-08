import { useState, useCallback, useRef, useEffect } from 'react';
import { PaperAirplaneIcon } from '@heroicons/react/24/outline';
import { useAppStore } from '../store/appStore';
import { useGeneration } from '../hooks/useGeneration';
import { useT } from '../i18n';

interface ChatPanelProps {
  hideInput?: boolean;
}

export default function ChatPanel({ hideInput }: ChatPanelProps) {
  const { chatHistory, isGenerating, currentCode } = useAppStore();
  const { iterate } = useGeneration();
  const { t } = useT();
  const [message, setMessage] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory]);

  const handleSend = useCallback(() => {
    if (!message.trim() || isGenerating || !currentCode) return;
    iterate(message.trim());
    setMessage('');
  }, [message, isGenerating, currentCode, iterate]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend],
  );

  return (
    <div className="flex flex-col h-full">
      {chatHistory.length > 0 && (
        <div className="text-[11px] text-surface-500 px-1 mb-2">
          {t('chat.iterations', { n: Math.ceil(chatHistory.length / 2) })}
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {chatHistory.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-surface-400 text-sm text-center">
              {currentCode ? t('chat.whatToChange') : t('chat.createFirst')}
            </p>
          </div>
        ) : (
          chatHistory.map((msg, i) => (
            <div
              key={i}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-slide-up`}
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <div
                className={`max-w-[85%] rounded-lg px-3.5 py-2.5 text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-primary-500/15 text-surface-100'
                    : 'bg-surface-800 text-surface-300 border border-white/10'
                }`}
              >
                {msg.content}
              </div>
            </div>
          ))
        )}
        {isGenerating && (
          <div className="flex justify-start">
            <div className="flex flex-col gap-2 w-2/3">
              <div className="skeleton h-4 w-full" />
              <div className="skeleton h-4 w-3/4" />
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {!hideInput && (
        <div className="p-3 border-t border-line">
          <div className="flex gap-2">
            <textarea
              ref={inputRef}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={t('chat.inputPlaceholder')}
              aria-label={t('chat.inputAria')}
              rows={1}
              disabled={isGenerating || !currentCode}
              className="flex-1 bg-surface-950/60 border border-line rounded-lg px-3.5 py-2.5 text-sm text-surface-100 placeholder-surface-500 focus:border-line-strong focus:ring-2 focus:ring-primary-500/20 transition-all resize-none disabled:opacity-30"
            />
            <button
              onClick={handleSend}
              disabled={!message.trim() || isGenerating || !currentCode}
              className="p-2.5 rounded-md bg-primary-600 text-white transition-all hover:bg-primary-500 active:scale-[0.98] disabled:bg-white/10 disabled:text-surface-400 disabled:cursor-not-allowed focus-ring"
            >
              <PaperAirplaneIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
