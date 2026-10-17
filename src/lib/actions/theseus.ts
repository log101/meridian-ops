"use server";

import {
  createFeature,
  featureUrl,
  listFeatures,
  stageLabel,
  stageTone,
  theseusConfig,
  TheseusError,
  type StageTone,
  type TheseusConfig,
  type TheseusFeature,
} from "@/lib/theseus/client";

// Server actions behind the "Request a change" box. They return plain data or
// { error }; nothing throws to the client.

export type ChangeRequest = {
  id: string;
  summary: string;
  stage: string;
  tone: StageTone;
  createdAt: string;
  url: string;
};

export type ChangeRequestsResult = { requests?: ChangeRequest[]; error?: string };
export type SubmitChangeResult = { request?: ChangeRequest; error?: string };

const MAX_PROMPT = 8000;

function view(cfg: TheseusConfig, f: TheseusFeature): ChangeRequest {
  return {
    id: f.id,
    summary: f.title || f.prompt || "Untitled request",
    stage: stageLabel(f),
    tone: stageTone(f),
    createdAt: f.createdAt,
    url: featureUrl(cfg, f.id),
  };
}

function message(e: unknown): string {
  if (e instanceof TheseusError) {
    if (e.status === 409) return "Theseus is not ready for requests yet. Try again in a minute.";
    if (e.status === 400) return e.message;
  }
  console.error("theseus", e);
  return "Could not reach Theseus. Try again in a moment.";
}

export async function loadChangeRequests(): Promise<ChangeRequestsResult> {
  const cfg = theseusConfig();
  if (!cfg) return { error: "This app is not connected to Theseus." };
  try {
    const list = await listFeatures(cfg);
    list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return { requests: list.map((f) => view(cfg, f)) };
  } catch (e) {
    return { error: message(e) };
  }
}

export async function submitChangeRequest(prompt: string, requestId: string): Promise<SubmitChangeResult> {
  const cfg = theseusConfig();
  if (!cfg) return { error: "This app is not connected to Theseus." };
  const text = typeof prompt === "string" ? prompt.trim() : "";
  if (!text) return { error: "Describe the change you would like." };
  if (text.length > MAX_PROMPT) return { error: `Keep it under ${MAX_PROMPT} characters.` };
  try {
    const { featureId } = await createFeature(cfg, text, String(requestId).slice(0, 100));
    const now = new Date().toISOString();
    return {
      request: view(cfg, { id: featureId, title: "", prompt: text, status: "PLANNING", awaiting: "", createdAt: now }),
    };
  } catch (e) {
    return { error: message(e) };
  }
}
