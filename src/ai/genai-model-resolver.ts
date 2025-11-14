// src/ai/genai-model-resolver.ts
import fetch from "node-fetch"; // if your runtime supports global fetch you can switch to that
type ModelInfo = { name: string; supportedGenerationMethods?: string[]; raw?: any; apiBase: "v1beta"|"v1" };

const PREFERRED_MODEL_SUBSTRINGS = ["gemini-2.5-flash", "gemini-2.5", "gemini-2", "gemini-1.5", "gemini"]; // preference order, but we will rely on supported methods

let cachedModel: { model: string; method: "generateContent" | "generateMessage"; apiBase: "v1beta"|"v1" } | null = null;

async function fetchListModels(apiKey: string, base: "v1beta"|"v1") {
  const url = `https://generativelanguage.googleapis.com/${base}/models?key=${encodeURIComponent(apiKey)}`;
  const res = await fetch(url, { method: "GET", headers: { "Content-Type": "application/json" } });
  const body = await res.json().catch(() => ({ error: "invalid-json-response" }));
  return { status: res.status, body, url };
}

export async function resolveModel(apiKey: string): Promise<{ model: string; method: "generateContent" | "generateMessage"; apiBase: "v1beta"|"v1" }> {
  if (!apiKey) throw new Error("resolveModel requires GOOGLE_API_KEY");

  if (cachedModel) return cachedModel;

  // If the environment explicitly sets a valid GENAI_MODEL, try it first (but still verify it)
  const envModel = (process.env.GENAI_MODEL || "").trim();
  const tryEnvModel = async () => {
    if (!envModel) return null;
    // We'll check both v1beta and v1 to see where it exists & which methods
    for (const base of ["v1beta","v1"] as const) {
      try {
        const checkUrl = `https://generativelanguage.googleapis.com/${base}/models/${encodeURIComponent(envModel)}?key=${encodeURIComponent(apiKey)}`;
        const r = await fetch(checkUrl);
        const j = await r.json().catch(()=>null);
        if (r.ok && j) {
          const methods = j.supportedGenerationMethods || j.supportedMethods || [];
          if (methods.includes("generateContent")) {
            cachedModel = { model: envModel, method: "generateContent", apiBase: base };
            return cachedModel;
          } else if (methods.includes("generateMessage")) {
            cachedModel = { model: envModel, method: "generateMessage", apiBase: base };
            return cachedModel;
          } else {
            // found model but no compatible method
            return { model: envModel, method: "unsupported" as any, apiBase: base } as any;
          }
        }
      } catch (e) {
        // ignore and continue
      }
    }
    return null;
  };

  const envResult = await tryEnvModel();
  if (envResult && (envResult as any).method !== "unsupported") {
    return envResult as any;
  }

  // Try listModels on v1beta then v1
  const results: Array<{ base: "v1beta"|"v1"; payload: any; status: number; url: string }> = [];
  for (const base of ["v1beta", "v1"] as const) {
    try {
      const { status, body, url } = await fetchListModels(apiKey, base);
      results.push({ base, payload: body, status, url });
    } catch (e) {
      results.push({ base, payload: { error: String(e) }, status: 0, url: `https://generativelanguage.googleapis.com/${base}/models` });
    }
  }

  // scan results for first model that supports generateContent; prefer models containing pref substrings
  for (const preferred of PREFERRED_MODEL_SUBSTRINGS) {
    for (const r of results) {
      const list = Array.isArray(r.payload?.models) ? r.payload.models : (r.payload?.model || r.payload);
      if (!Array.isArray(list)) continue;
      for (const m of list) {
        const name: string = m.name || m.model || m.id || "";
        if (!name) continue;
        if (!name.includes(preferred)) continue;
        const methods = m.supportedGenerationMethods || m.supportedMethods || [];
        if (methods.includes("generateContent")) {
          cachedModel = { model: name, method: "generateContent", apiBase: r.base };
          return cachedModel;
        }
        if (methods.includes("generateMessage")) {
          cachedModel = { model: name, method: "generateMessage", apiBase: r.base };
          return cachedModel;
        }
      }
    }
  }

  // last resort: pick any model that supports generateContent or generateMessage
  for (const r of results) {
    const list = Array.isArray(r.payload?.models) ? r.payload.models : (r.payload?.model || r.payload);
    if (!Array.isArray(list)) continue;
    for (const m of list) {
      const name: string = m.name || m.model || m.id || "";
      if (!name) continue;
      const methods = m.supportedGenerationMethods || m.supportedMethods || [];
      if (methods.includes("generateContent")) {
        cachedModel = { model: name, method: "generateContent", apiBase: r.base };
        return cachedModel;
      }
      if (methods.includes("generateMessage")) {
        cachedModel = { model: name, method: "generateMessage", apiBase: r.base };
        return cachedModel;
      }
    }
  }

  // If we got here — nothing usable found
  throw new Error(
    `No suitable model found in ListModels responses. Results: ${JSON.stringify(results.map(r => ({ base: r.base, status: r.status, summary: Array.isArray(r.payload?.models)? r.payload.models.slice(0,6).map((x:any)=>x.name): r.payload })))}`
  );
}
