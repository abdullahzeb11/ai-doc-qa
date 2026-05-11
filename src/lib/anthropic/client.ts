import Anthropic from "@anthropic-ai/sdk";
import { env } from "@/lib/env";

let cached: Anthropic | null = null;

export function anthropic(): Anthropic {
  if (cached) return cached;
  cached = new Anthropic({ apiKey: env.anthropic.apiKey });
  return cached;
}

export const CHAT_MODEL = env.anthropic.model;
