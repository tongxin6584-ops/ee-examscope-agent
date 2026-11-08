import { useEffect, useRef, useState } from 'react';
import {
  ArrowLeftRight,
  ArrowUp,
  BookOpenText,
  CheckCircle2,
  GraduationCap,
  Plus,
  RotateCcw,
  Search,
  Sparkles,
  Square,
  Waves,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { consumeSseStream } from './lib/sse.js';

const SUGGESTIONS = [
  {
    icon: Search,
    title: '单校查询',
    description: '查询目标院校的专业课科目、参考书目及历年分数线。',
  },
  {
    icon: ArrowLeftRight,
    title: '两校对比',
    description: '横向对比两所院校的考试范围、参考书与招生差异。',
  },
  {
    icon: GraduationCap,
    title: '个性化备考建议',
    description: '结合你的现有基础和时间，生成有依据的复习规划。',
  },
];

const DEFAULT_PLACEHOLDER = '输入你的通信考研问题…';
const GUIDED_PLACEHOLDER =
  '请输入：你想查询的学校、拟入学年份、专业、招生人数、分数线等，以及你的备考基础、可投入的备考时长';
const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');

function BrandMark({ small = false }) {
  return (
    <div
      className={`grid shrink-0 place-items-center rounded-xl bg-brand text-white shadow-sm ${
        small ? 'h-8 w-8' : 'h-10 w-10'
      }`}
    >
      <Waves size={small ? 17 : 21} strokeWidth={2.4} />
    </div>
  );
}

function MarkdownMessage({ content }) {
  return (
    <div className="markdown-body">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
    </div>
  );
}

function Welcome({ onSelect }) {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center px-1 pb-10 pt-8 sm:px-4">
      <div className="mb-9 text-center">
        <div className="mx-auto mb-5 grid h-16 w-16 place-items-center rounded-2xl border border-blue-100 bg-white text-brand shadow-[0_14px_36px_rgba(36,107,219,0.12)]">
          <BookOpenText size={30} strokeWidth={1.8} />
        </div>
        <p className="mb-2 text-sm font-semibold tracking-[0.18em] text-brand">
          EE STUDY COMPANION
        </p>
        <h2 className="text-2xl font-bold tracking-tight text-ink sm:text-3xl">
          今天想攻克哪个考点？
        </h2>
        <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-slate-500 sm:text-base">
          从概念辨析到推导计算，把复杂知识拆成清晰、可复习的答案。
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {SUGGESTIONS.map(({ icon: Icon, title, description }) => (
          <button
            key={title}
            type="button"
            onClick={onSelect}
            className="group min-h-32 border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-brand/25"
          >
            <div className="mb-5 flex items-center justify-between">
              <span className="grid h-9 w-9 place-items-center rounded-lg bg-blue-50 text-brand transition group-hover:bg-blue-100">
                <Icon size={18} />
              </span>
              <ArrowUp className="rotate-45 text-slate-300 transition group-hover:text-brand" size={17} />
            </div>
            <p className="mb-1.5 text-sm font-semibold text-ink">{title}</p>
            <p className="line-clamp-2 text-xs leading-5 text-slate-500">{description}</p>
          </button>
        ))}
      </div>
    </div>
  );
}

function Message({ message, isStreaming }) {
  const isUser = message.role === 'user';

  return (
    <div className={`message-enter flex w-full gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}>
      {!isUser && <BrandMark small />}
      <div
        className={`min-w-0 max-w-[88%] px-4 py-3 text-[15px] leading-7 sm:max-w-[78%] sm:px-5 ${
          isUser
            ? 'rounded-2xl rounded-tr-md bg-blue-100/80 text-slate-800'
            : 'rounded-2xl rounded-tl-md border border-slate-200 bg-white text-slate-700 shadow-sm'
        }`}
      >
        {isUser ? (
          <p className="whitespace-pre-wrap">{message.content}</p>
        ) : message.content ? (
          <>
            <MarkdownMessage content={message.content} />
            {isStreaming && <span className="typing-caret" aria-label="正在生成" />}
          </>
        ) : (
          <div className="flex h-7 items-center gap-1.5" aria-label="正在思考">
            <span className="thinking-dot" />
            <span className="thinking-dot" />
            <span className="thinking-dot" />
          </div>
        )}
      </div>
    </div>
  );
}

function Composer({ value, setValue, onSend, onStop, loading, textareaRef, placeholder }) {
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = 'auto';
    textarea.style.height = `${Math.min(textarea.scrollHeight, 144)}px`;
  }, [value]);

  function handleKeyDown(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      if (!loading) onSend();
    }
  }

  return (
    <div className="border-t border-slate-200/80 bg-white/90 px-3 pb-[max(14px,env(safe-area-inset-bottom))] pt-3 backdrop-blur-xl sm:px-6 sm:pb-5">
      <div className="mx-auto max-w-4xl">
        <div className="flex items-end gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-composer transition focus-within:border-blue-300 focus-within:ring-4 focus-within:ring-blue-100/60 sm:p-2.5">
          <textarea
            ref={textareaRef}
            rows={1}
            value={value}
            maxLength={4000}
            onChange={(event) => setValue(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className="max-h-36 min-h-11 flex-1 resize-none bg-transparent px-3 py-2.5 text-[15px] leading-6 text-slate-800 outline-none placeholder:text-slate-400"
            aria-label="消息输入框"
          />
          <button
            type="button"
            onClick={loading ? onStop : onSend}
            disabled={!loading && !value.trim()}
            className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-brand text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-brand/30 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
            aria-label={loading ? '停止生成' : '发送消息'}
          >
            {loading ? <Square size={16} fill="currentColor" /> : <ArrowUp size={20} strokeWidth={2.4} />}
          </button>
        </div>
        <p className="mt-2 text-center text-[11px] text-slate-400">
          Enter 发送 · Shift + Enter 换行 · AI 内容仅供学习参考
        </p>
      </div>
    </div>
  );
}

export default function App() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState('');
  const [error, setError] = useState('');
  const [placeholder, setPlaceholder] = useState(DEFAULT_PLACEHOLDER);
  const scrollRef = useRef(null);
  const abortRef = useRef(null);
  const textareaRef = useRef(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: 'smooth',
    });
  }, [messages]);

  useEffect(() => () => abortRef.current?.abort(), []);

  function updateAssistant(id, updater) {
    setMessages((current) =>
      current.map((message) =>
        message.id === id ? { ...message, content: updater(message.content) } : message,
      ),
    );
  }

  function selectSuggestion() {
    setInput('');
    setPlaceholder(GUIDED_PLACEHOLDER);
    requestAnimationFrame(() => textareaRef.current?.focus());
  }

  async function sendMessage(prefilled) {
    const query = (typeof prefilled === 'string' ? prefilled : input).trim();
    if (!query || loading) return;

    const assistantId = crypto.randomUUID();
    setInput('');
    setError('');
    setLoading(true);
    setMessages((current) => [
      ...current,
      { id: crypto.randomUUID(), role: 'user', content: query },
      { id: assistantId, role: 'assistant', content: '' },
    ]);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const response = await fetch(`${API_BASE_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, conversation_id: conversationId }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || `请求失败（${response.status}）`);
      }
      if (!response.body) throw new Error('浏览器未收到可读取的数据流');

      await consumeSseStream(response.body, (event) => {
        if (event.conversation_id) setConversationId(event.conversation_id);

        if ((event.event === 'message' || event.event === 'agent_message') && event.answer) {
          updateAssistant(assistantId, (content) => content + event.answer);
        }

        if (event.event === 'error') {
          throw new Error(event.message || 'Dify 返回了错误');
        }
      });
    } catch (requestError) {
      if (requestError.name !== 'AbortError') {
        const message = requestError.message || '连接失败，请稍后重试';
        setError(message);
        updateAssistant(assistantId, (content) =>
          content || `抱歉，本次请求没有完成。\n\n> ${message}`,
        );
      }
    } finally {
      abortRef.current = null;
      setLoading(false);
    }
  }

  function stopGeneration() {
    abortRef.current?.abort();
    abortRef.current = null;
    setLoading(false);
  }

  function startNewConversation() {
    abortRef.current?.abort();
    abortRef.current = null;
    setMessages([]);
    setConversationId('');
    setError('');
    setLoading(false);
    setInput('');
    setPlaceholder(DEFAULT_PLACEHOLDER);
  }

  return (
    <div className="app-shell flex h-[100dvh] min-h-0 flex-col bg-canvas text-slate-800">
      <header className="z-10 shrink-0 border-b border-slate-200/80 bg-white/90 px-4 py-3 backdrop-blur-xl sm:px-6 sm:py-4">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <BrandMark />
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="truncate text-base font-bold tracking-tight text-ink sm:text-lg">
                  EE通信考点通
                </h1>
                <span className="hidden items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 sm:flex">
                  <CheckCircle2 size={11} /> 在线
                </span>
              </div>
              <p className="mt-0.5 truncate text-[11px] text-slate-500 sm:text-xs">
                你已经走了这么远了，怎么不相信自己能走得更远呢？
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={startNewConversation}
            className="flex h-9 shrink-0 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-600 transition hover:border-blue-200 hover:bg-blue-50 hover:text-brand focus:outline-none focus:ring-2 focus:ring-brand/20 sm:px-3"
            aria-label="开始新对话"
          >
            {messages.length ? <RotateCcw size={15} /> : <Plus size={16} />}
            <span className="hidden sm:inline">新对话</span>
          </button>
        </div>
      </header>

      <main ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto scroll-smooth">
        <div className="mx-auto flex min-h-full w-full max-w-4xl flex-col px-4 sm:px-6">
          {messages.length === 0 ? (
            <Welcome onSelect={selectSuggestion} />
          ) : (
            <div className="flex flex-col gap-5 py-6 sm:gap-6 sm:py-8">
              <div className="mb-1 flex items-center gap-2 text-xs font-medium text-slate-400">
                <Sparkles size={14} className="text-brand" />
                本轮对话已启用上下文记忆
              </div>
              {messages.map((message, index) => (
                <Message
                  key={message.id}
                  message={message}
                  isStreaming={loading && index === messages.length - 1 && message.role === 'assistant'}
                />
              ))}
              {error && (
                <p className="pl-11 text-xs text-rose-600" role="alert">
                  {error}
                </p>
              )}
            </div>
          )}
        </div>
      </main>

      <Composer
        value={input}
        setValue={setInput}
        onSend={sendMessage}
        onStop={stopGeneration}
        loading={loading}
        textareaRef={textareaRef}
        placeholder={placeholder}
      />
    </div>
  );
}
