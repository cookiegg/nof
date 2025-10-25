"use client";
import useSWR from "swr";
import { endpoints, fetcher } from "../nof1";

export interface ConversationMessage {
  role: string;
  content: string;
  timestamp?: number | string;
}

export interface ConversationItem {
  model_id: string;
  messages: ConversationMessage[];
}

export interface ConversationsResponse {
  conversations?: ConversationItem[];
  [k: string]: any;
}

export function useConversations() {
  const { data, error, isLoading } = useSWR<ConversationsResponse>(
    endpoints.conversations(),
    fetcher,
    {
      refreshInterval: 15000,
    },
  );
  const items: ConversationItem[] = normalize(data);
  return { items, raw: data, isLoading, isError: !!error };
}

function normalize(data?: ConversationsResponse): ConversationItem[] {
  if (!data) return [];
  if (Array.isArray(data.conversations)) return data.conversations as any;
  // lenient fallbacks
  if (Array.isArray((data as any).items)) return (data as any).items;
  if (Array.isArray((data as any).logs)) return (data as any).logs;
  return [];
}
