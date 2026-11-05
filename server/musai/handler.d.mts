export type ConversationMessage = {
  role: "user" | "assistant";
  content: string;
};
export type MusaiEvent =
  | {
      type: "meta";
      mode: "model" | "portfolio";
      provider?: string;
      model?: string;
    }
  | { type: "delta"; text: string }
  | { type: "sources"; sources: { label: string; url: string }[] }
  | { type: "error"; code: string; message: string; retryable: boolean }
  | { type: "done" };
export type HandlerOptions = {
  env?:
    | Record<string, string | undefined>
    | (() => Record<string, string | undefined>);
  fetchImpl?: typeof fetch;
  timeouts?: {
    firstTokenMs?: number;
    idleMs?: number;
    totalMs?: number;
    requestMs?: number;
  };
};
export function createMusaiHandler(
  options?: HandlerOptions,
): (request: Request) => Promise<Response>;
export function answerEvents(
  messages: ConversationMessage[],
  options?: Omit<HandlerOptions, "env"> & {
    env?: Record<string, string | undefined>;
    signal?: AbortSignal;
  },
): AsyncGenerator<MusaiEvent>;
export function readMessages(request: Request): Promise<ConversationMessage[]>;
export const LIMITS: {
  messages: number;
  userCharacters: number;
  assistantCharacters: number;
  totalCharacters: number;
  requestBytes: number;
};
declare const handler: (request: Request) => Promise<Response>;
export default handler;
