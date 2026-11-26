import { Capacitor, CapacitorHttp } from '@capacitor/core';
import type { AnswerOption, AppSettings, Idiom, QuestionItem } from '@/types/domain';

export const answerOptions = ['A', 'B', 'C', 'D'] as const;

export interface LlmConfig {
  url: string;
  key: string;
  model: string;
  prompt: AppSettings['llmPromptStyle'];
}

export type LlmIdiom = Pick<Idiom, 'word' | 'coreMeaning' | 'confusableWith'>;

export function configFromSettings(settings: AppSettings | null | undefined): LlmConfig {
  return {
    url: settings?.llmBaseUrl ?? '',
    key: settings?.llmApiKey ?? '',
    model: settings?.llmModel ?? '',
    prompt: settings?.llmPromptStyle ?? 'guokao',
  };
}

export function isLlmConfigured(config: LlmConfig): boolean {
  return Boolean(config.url.trim() && config.key.trim() && config.model.trim());
}

export function completionUrl(base: string): string {
  let url: URL;
  try {
    url = new URL(base.trim());
  } catch {
    throw new Error('请输入有效的 Base URL');
  }
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) {
    throw new Error('请输入有效的 HTTP(S) 接口地址');
  }
  url.pathname = url.pathname.replace(/\/+$/, '');
  if (!url.pathname.endsWith('/chat/completions')) {
    url.pathname = url.pathname.replace(/\/$/, '') + '/chat/completions';
  }
  url.hash = '';
  return url.href;
}

export function validateLlmConfig(config: LlmConfig) {
  completionUrl(config.url);
  if (!config.key.trim()) throw new Error('请填写 API Key');
  if (!config.model.trim()) throw new Error('请填写模型名称');
}

export function asRecord(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : undefined;
}

export function throwIfAborted(signal?: AbortSignal) {
  if (signal?.aborted) throw new DOMException('已取消请求', 'AbortError');
}

async function waitForNative<T>(request: Promise<T>, signal?: AbortSignal): Promise<T> {
  if (!signal) return request;
  return new Promise<T>((resolve, reject) => {
    const cancel = () => reject(new DOMException('已取消请求', 'AbortError'));
    signal.addEventListener('abort', cancel, { once: true });
    if (signal.aborted) cancel();
    request.then(resolve, reject).finally(() => signal.removeEventListener('abort', cancel));
  });
}

type Message = { role: 'system' | 'user'; content: string };

async function postChat(url: string, headers: Record<string, string>, payload: Record<string, unknown>, signal?: AbortSignal) {
  let status: number;
  let data: unknown;
  if (Capacitor.isNativePlatform()) {
    const response = await waitForNative(CapacitorHttp.post({
      url, headers, data: payload, connectTimeout: 30_000, readTimeout: 90_000,
    }), signal);
    ({ status, data } = response);
  } else {
    try {
      const response = await fetch(url, { method: 'POST', headers, body: JSON.stringify(payload), signal });
      status = response.status;
      data = await response.text();
    } catch (error) {
      throwIfAborted(signal);
      if (error instanceof TypeError) throw new Error('请求被拦截或网络不可达（浏览器预览可能受接口 CORS 限制，打包为安卓 APK 后将通过原生请求直连）');
      throw error;
    }
  }
  throwIfAborted(signal);
  if (typeof data === 'string') {
    try { data = JSON.parse(data); } catch { /* Some gateways return a non-JSON error page. */ }
  }
  return { status, data };
}

async function chat(config: LlmConfig, messages: Message[], maxTokens: number, temperature: number, signal?: AbortSignal, jsonMode = false) {
  throwIfAborted(signal);
  validateLlmConfig(config);
  const url = completionUrl(config.url);
  const headers = { 'Content-Type': 'application/json', Authorization: 'Bearer ' + config.key.trim() };
  const basePayload: Record<string, unknown> = {
    model: config.model.trim(), messages, max_tokens: maxTokens, temperature, stream: false,
  };
  const payload = jsonMode ? { ...basePayload, response_format: { type: 'json_object' } } : basePayload;
  let { status, data } = await postChat(url, headers, payload, signal);
  if (jsonMode && (status === 400 || status === 422)) {
    ({ status, data } = await postChat(url, headers, basePayload, signal));
  }
  const envelope = asRecord(data);
  if (status < 200 || status >= 300 || envelope?.error) {
    const detail = asRecord(envelope?.error)?.message;
    const explanation = typeof detail === 'string' && detail.trim()
      ? detail.replaceAll(config.key.trim(), '[已隐藏]').slice(0, 180)
      : ({ 401: 'API Key 无效或未授权', 402: '接口额度不足', 403: '接口拒绝访问', 429: '请求过多或额度不足' } as Record<number, string>)[status];
    throw new Error(`HTTP ${status}${explanation ? ` · ${explanation}` : ''}`);
  }
  const choice = Array.isArray(envelope?.choices) ? asRecord(envelope.choices[0]) : undefined;
  const content = asRecord(choice?.message)?.content;
  const text = typeof content === 'string' ? content : Array.isArray(content)
    ? content.map((part: unknown) => asRecord(part)?.text).filter((part) => typeof part === 'string').join('')
    : '';
  return { text, truncated: choice?.finish_reason === 'length' };
}

function* jsonCandidates(raw: string): Generator<unknown> {
  const text = raw.replace(/<think\b[^>]*>[\s\S]*?<\/think>/gi, '').replace(/```(?:json)?/gi, '').trim();
  try { yield JSON.parse(text); return; } catch { /* Extract JSON from gateway prefixes and suffixes. */ }
  for (let start = 0; start < text.length; start += 1) {
    const open = text[start];
    if (open !== '{' && open !== '[') continue;
    const stack: string[] = [open === '{' ? '}' : ']'];
    let quoted = false;
    for (let end = start + 1; end < text.length; end += 1) {
      const char = text[end];
      if (quoted) {
        if (char === '\\') end += 1;
        else if (char === '"') quoted = false;
        continue;
      }
      if (char === '"') quoted = true;
      else if (char === '[' || char === '{') stack.push(char === '[' ? ']' : '}');
      else if (char === ']' || char === '}') {
        if (stack.pop() !== char) break;
        if (stack.length === 0) {
          try {
            const parsed: unknown = JSON.parse(text.slice(start, end + 1));
            start = end;
            yield parsed;
          } catch { /* Continue at the next opening delimiter. */ }
          break;
        }
      }
    }
  }
}

export async function testLlmConnection(config: LlmConfig, signal?: AbortSignal) {
  const start = Date.now();
  try {
    const { text } = await chat(config, [
      { role: 'system', content: '这是 API 连通性和 JSON 格式测试。只输出 {"ok":true}，不要输出解释。' },
      { role: 'user', content: '{"ok":true}' },
    ], 64, 0, signal);
    if (![...jsonCandidates(text)].some((entry) => asRecord(entry)?.ok === true)) {
      throw new Error('返回内容未通过 JSON 格式校验');
    }
    const latencyMs = Date.now() - start;
    return { ok: true as const, latencyMs, message: `连接成功 · 延迟 ${(latencyMs / 1000).toFixed(1)}s · 格式校验通过` };
  } catch (error) {
    throwIfAborted(signal);
    return { ok: false as const, message: `连接失败（${error instanceof Error ? error.message : '接口请求异常'}）` };
  }
}

export function normalizeStem(text: string) {
  return text.trim().replace(/[_＿]{2,}|（\s*）|\(\s*\)|【\s*】/gu, '____');
}

export function questionTextKey(text: string) {
  return text.normalize('NFKC').toLowerCase().replace(/[\s\p{P}]/gu, '');
}

function strings(value: unknown): string[] {
  return Array.isArray(value)
    ? [...new Set(value.flatMap((item: unknown) => typeof item === 'string' && item.trim() ? [item.trim()] : []))]
    : [];
}

function normalizeChoiceMap(value: unknown): Partial<Record<AnswerOption, string>> | undefined {
  if (Array.isArray(value) && value.length === answerOptions.length) {
    const mapped: Partial<Record<AnswerOption, string>> = {};
    for (let i = 0; i < answerOptions.length; i += 1) {
      const item = value[i];
      if (typeof item === 'string') mapped[answerOptions[i]!] = item;
    }
    return mapped;
  }
  const record = asRecord(value);
  if (!record) return undefined;
  const mapped: Partial<Record<AnswerOption, string>> = {};
  for (const letter of answerOptions) {
    const item = record[letter] ?? record[letter.toLowerCase()];
    if (typeof item === 'string') mapped[letter] = item;
  }
  return mapped;
}

function normalizeAnswer(value: unknown): AnswerOption | undefined {
  if (typeof value !== 'string') return undefined;
  const match = value.trim().toUpperCase().match(/^([A-D])/);
  return match ? match[1] as AnswerOption : undefined;
}

function stripOptionPrefix(text: string): string {
  return text.trim().replace(/^[A-Da-d]\s*[.、:：)）]\s*/u, '');
}

function parseQuestion(value: unknown, idioms: LlmIdiom[]): QuestionItem | undefined {
  const entry = asRecord(value);
  const choices = normalizeChoiceMap(entry?.options);
  const answer = normalizeAnswer(entry?.answer);
  if (!entry || typeof entry.stem !== 'string' || !choices || !answer) return;
  const stem = normalizeStem(entry.stem);
  const blanks = stem.match(/____/g)?.length ?? 0;
  if (blanks < 1 || blanks > 3) return;

  const options = {} as QuestionItem['options'];
  const optionAnalyses = {} as QuestionItem['optionAnalyses'];
  const analyses = normalizeChoiceMap(entry.optionAnalyses);
  const overallAnalysis = typeof entry.overallAnalysis === 'string' ? entry.overallAnalysis.trim() : '';
  for (const letter of answerOptions) {
    const rawOption = choices[letter];
    if (typeof rawOption !== 'string') return;
    const words = stripOptionPrefix(rawOption).split(/[、，,/／\s]+/u).map((word) => word.trim()).filter(Boolean);
    if (words.length !== blanks) return;
    options[letter] = words.join('、');
    const analysis = analyses?.[letter];
    optionAnalyses[letter] = typeof analysis === 'string' && analysis.trim()
      ? analysis.trim() : overallAnalysis || '接口未提供此选项的解析';
  }
  if (new Set(Object.values(options).map(questionTextKey)).size !== answerOptions.length) return;
  const optionWords = new Set(Object.values(options).flatMap((option) => option.split('、')));
  const targetWords = idioms.flatMap(({ word, confusableWith }) => [word, ...confusableWith]);
  const known = targetWords.filter((word) => optionWords.has(word));
  if (known.length === 0) return;
  const relatedIdioms = [...new Set([...strings(entry.relatedIdioms).filter((word) => optionWords.has(word) || targetWords.includes(word)), ...known])];
  return {
    id: makeId('ai'), source: 'ai', stem, options, answer,
    contextClues: strings(entry.contextClues), overallAnalysis, optionAnalyses, relatedIdioms, createdAt: Date.now(),
  };
}

export function makeId(prefix: string) {
  return `${prefix}_${Array.from(crypto.getRandomValues(new Uint32Array(4)), (part) => part.toString(16).padStart(8, '0')).join('')}`;
}

const styles = {
  guokao: '国考真题风。采用政论、经济、文化、科技等书面语境，以两空、三空为主，使用强近义干扰项。',
  shengkao: '省考实战风。一空和两空均衡，重点考查语境呼应、搭配对象与感情色彩。',
  basic: '基础巩固风。以一空为主，给出清晰线索，侧重辨析常见误用和望文生义。',
};

interface GenerateOptions {
  config: LlmConfig;
  idioms: LlmIdiom[];
  count: number;
  signal?: AbortSignal;
  onProgress?: (progress: { generated: number; total: number }) => void;
  avoidStems?: string[];
}

function splitBatches(count: number, maxBatch = 5): number[] {
  const batchCount = Math.ceil(count / maxBatch);
  const base = Math.floor(count / batchCount);
  const extra = count % batchCount;
  return Array.from({ length: batchCount }, (_, i) => base + (i < extra ? 1 : 0));
}

export async function generateLogicClozeQuestions({ config, idioms, count, signal, onProgress, avoidStems = [] }: GenerateOptions) {
  throwIfAborted(signal);
  if (!Number.isInteger(count) || count < 0 || count > 20) throw new Error('出题数量应为 0 至 20 的整数');
  if (count === 0) return [];
  if (!idioms.length) throw new Error('请先选择考察成语');

  const questions: QuestionItem[] = [];
  const seen = new Set(avoidStems.map(questionTextKey));
  const sizes = splitBatches(count);
  let cursor = 0;
  for (const size of sizes) {
    const batch: QuestionItem[] = [];
    const windowSize = Math.min(idioms.length, Math.max(size + 3, 8));
    const batchIdioms = Array.from({ length: windowSize }, (_, i) => idioms[(cursor + i) % idioms.length]!);
    cursor += size;
    let issue = '接口返回的试题数量不足或格式有误';
    let lastHadDuplicate = false;
    for (let attempt = 0; attempt < 3 && batch.length < size; attempt += 1) {
      throwIfAborted(signal);
      const need = size - batch.length;
      const forbidden = [...avoidStems, ...questions.map((q) => q.stem), ...batch.map((q) => q.stem)].map((stem) => stem.slice(0, 24));
      const temperature = attempt === 0 ? 0.7 : lastHadDuplicate ? 0.85 : 0.4;
      const { text, truncated } = await chat(config, [
        {
          role: 'system',
          content: `你是行测逻辑填空命题人。风格：${styles[config.prompt]} 每题优先围绕给定 idioms 列表中的成语及其易混词轮换命制（选项中至少出现一个给定成语或其易混词）；设置唯一最佳答案，逐项解释正误，用原文短语给出语境线索。
严格只输出纯 JSON 对象，不要输出 Markdown 代码块或任何多余文字，格式必须如下：
{"questions":[{"stem":"题干第一空____，第二空____。","options":{"A":"词1、词2","B":"词3、词4","C":"词5、词6","D":"词7、词8"},"answer":"C","contextClues":["原文线索"],"overallAnalysis":"整体解析","optionAnalyses":{"A":"解析","B":"解析","C":"解析","D":"解析"},"relatedIdioms":["词1"]}]}
硬性校验规则（缺一不可）：
1. options 和 optionAnalyses 必须是包含 A、B、C、D 四个键的对象（不要用数组）；
2. stem 中每个空必须写成 ____（4个下划线），且 stem 中 ____ 的个数（1至3个）必须与每个选项中用顿号“、”分隔的词语个数完全一致（1空=1词，2空=2词，3空=3词），生成每题后务必自查空数与词数是否相等；
3. 各题题干和四个选项搭配均须互不相同，严格禁止复写或改写 user 消息中 forbiddenStems 里已出现的题干，必须构思全新场景；正确答案在 A、B、C、D 中随机均衡分布；控制每题解析精炼，确保完整闭合 JSON。`,
        },
        { role: 'user', content: JSON.stringify({ count: need, idioms: batchIdioms, forbiddenStems: forbidden, retry: attempt > 0 }) },
      ], Math.min(8_192, 1_024 + need * 800), temperature, signal, true);
      lastHadDuplicate = false;
      for (const candidate of jsonCandidates(text)) {
        const wrapped = asRecord(candidate)?.questions;
        const entries = Array.isArray(candidate) ? candidate : Array.isArray(wrapped) ? wrapped : [candidate];
        for (const entry of entries) {
          const question = parseQuestion(entry, idioms);
          if (!question) continue;
          const key = questionTextKey(question.stem);
          if (seen.has(key)) {
            lastHadDuplicate = true;
            continue;
          }
          seen.add(key);
          batch.push(question);
          if (batch.length === size) break;
        }
        if (batch.length === size) break;
      }
      if (truncated) issue = '模型输出被截断，完整试题不足';
    }
    if (batch.length < size) throw new Error(`${issue}（本批需要 ${size} 题，收到 ${batch.length} 道合格题）`);
    questions.push(...batch);
    onProgress?.({ generated: questions.length, total: count });
  }
  throwIfAborted(signal);
  return questions;
}
