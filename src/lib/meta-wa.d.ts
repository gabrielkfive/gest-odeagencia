// Tipos do módulo JS puro src/lib/meta-wa.js (Cloud API oficial do WhatsApp).
export type MetaMedia = {
  type: "image" | "audio" | "video" | "document" | "sticker";
  mimetype: string;
  caption: string;
  fileName: string;
  ptt?: boolean;
};
export type MetaMensagem = {
  phone: string;
  name: string;
  text: string;
  ts: number;
  messageId: string;
  media: MetaMedia | null;
  mediaId: string;
  phoneNumberId: string;
};
export function parseMetaWebhook(body: unknown): { messages: MetaMensagem[]; statuses: number };
export function metaVerificationChallenge(searchParams: URLSearchParams, verifyToken: string | undefined): string | null;
export function metaSignatureValid(rawBody: string, signatureHeader: string, appSecret: string | undefined): Promise<boolean>;
