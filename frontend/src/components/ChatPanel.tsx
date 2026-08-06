import { useState, useCallback, useRef, useEffect } from 'react';
import { PaperAirplaneIcon } from '@heroicons/react/24/outline';
import { useAppStore } from '../store/appStore';
import { useGeneration } from '../hooks/useGeneration';

interface ChatPanelProps {
  hideInput?: boolean;
}

export default function ChatPanel({ hideInput }: ChatPanelProps) {
  const { chatHistory, isGenerating, currentCode } = useAppStore();
  const { iterate } = useGeneration();
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
    [handleSend]
  );

  return (
    <div className="flex flex-col h-full">
      {!hideInput && (
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium text-surface-200">Чат</span>
          {chatHistory.length > 0 && (
            <span className="text-xs text-surface-400">
              {Math.ceil(chatHistory.length / 2)} итераций
            </span>
          )}
        </div>
      )}

      <div className={`flex flex-col flex-1 min-h-0 ${hideInput ? '' : 'bg-surface-900/50 rounded-xl border border-surface-700/50'}`}>
        <div className="flex-1 overflow-y-auto p-3 space-y-3">
          {chatHistory.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-surface-400 text-sm text-center">
                {currentCode
                  ? 'Что вы хотите изменить в дизайне?'
                  : 'Сначала создайте дизайн, затем обсуждайте правки'}
              </p>
            </div>
          ) : (
            chatHistory.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-slide-up`}
                style={{ animationDelay: `${i * 50}ms` }}
              >
                <div
                  className={`max-w-[85%] rounded-xl px-3.5 py-2.5 text-sm leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-primary-500/20 text-primary-200 border border-primary-500/20'
                      : 'bg-surface-800 text-surface-300 border border-surface-700/50'
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))
          )}
          {isGenerating && (
            <div className="flex justify-start">
              <div className="bg-surface-800 border border-surface-700/50 rounded-xl px-4 py-3">
                <div className="flex items-center gap-1.5">
                  <span className="loading-dot" />
                  <span className="loading-dot" />
                  <span className="loading-dot" />
                </div>
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {!hideInput && (
          <div className="p-3 border-t border-surface-700/50">
            <div className="flex gap-2">
              <textarea
                ref={inputRef}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Что изменить?"
                aria-label="Сообщение в чат"
                rows={1}
                disabled={isGenerating || !currentCode}
                className="flex-1 bg-surface-800 border border-surface-700 rounded-lg px-3 py-2 text-sm text-surface-100 placeholder-surface-500 resize-none focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500/50 transition-all disabled:opacity-30"
              />
              <button
                onClick={handleSend}
                disabled={!message.trim() || isGenerating || !currentCode}
                className="p-2.5 rounded-lg generation-gradient text-white transition-all duration-200 hover:shadow-lg hover:shadow-primary-500/25 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:shadow-none"
              >
                <PaperAirplaneIcon className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
