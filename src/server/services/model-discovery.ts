import type { ModelEndpointCatalogEntry } from "./model-endpoint.js";

export async function fetchAnthropicModels(apiKey: string): Promise<ModelEndpointCatalogEntry[]> {
  const response = await fetch("https://api.anthropic.com/v1/models", {
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
  });
  if (!response.ok) {
    throw new Error(`Anthropic API returned HTTP ${response.status}`);
  }
  const payload = await response.json() as { data?: Array<{ id: string; display_name?: string }> };
  const entries = Array.isArray(payload.data) ? payload.data : [];
  const models: ModelEndpointCatalogEntry[] = [];
  const seen = new Set<string>();
  for (const entry of entries) {
    const id = typeof entry.id === "string" ? entry.id.trim() : "";
    if (!id || seen.has(id)) continue;
    seen.add(id);
    const name = typeof entry.display_name === "string" && entry.display_name.trim()
      ? entry.display_name.trim()
      : id;
    models.push({ id, name });
  }
  return models;
}

export async function fetchOpenaiModels(apiKey: string): Promise<ModelEndpointCatalogEntry[]> {
  const response = await fetch("https://api.openai.com/v1/models", {
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  });
  if (!response.ok) {
    throw new Error(`OpenAI API returned HTTP ${response.status}`);
  }
  const payload = await response.json() as { data?: Array<{ id: string; owned_by?: string }> };
  const entries = Array.isArray(payload.data) ? payload.data : [];
  const models: ModelEndpointCatalogEntry[] = [];
  const seen = new Set<string>();
  for (const entry of entries) {
    const id = typeof entry.id === "string" ? entry.id.trim() : "";
    if (!id || seen.has(id)) continue;
    seen.add(id);
    models.push({ id, name: id });
  }
  models.sort((a, b) => a.id.localeCompare(b.id));
  return models;
}
