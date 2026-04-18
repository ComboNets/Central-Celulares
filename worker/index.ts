interface Env {
  ASSETS: Fetcher;
  GITHUB_TOKEN?: string;
  GITHUB_OWNER?: string;
  GITHUB_REPO?: string;
  GITHUB_TARGET_BRANCH?: string;
  GITHUB_PRODUCTS_PATH?: string;
  ALLOWED_ORIGIN?: string;
  ADMIN_API_TOKEN?: string;
}

interface ProductRecord {
  id: string;
  model: string;
  price: number;
  sale_price: number | null;
  storage_options: string[] | null;
  display_size: string | null;
  processor: string | null;
  ram: string | null;
  camera: string | null;
  battery: string | null;
  release_year: number | null;
  description: string | null;
  images: string[] | null;
  is_featured: boolean;
  is_published: boolean;
  updated_at: string;
  brand?: {
    name: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

interface PendingProductChanges {
  model?: string;
  price?: number;
  sale_price?: number | null;
  storage_options?: string[] | null;
  display_size?: string | null;
  processor?: string | null;
  ram?: string | null;
  camera?: string | null;
  battery?: string | null;
  release_year?: number | null;
  description?: string | null;
  images?: string[] | null;
  is_featured?: boolean;
  is_published?: boolean;
  brand_name?: string;
}

interface PublishRequestBody {
  patches: Array<{
    id: string;
    changes: PendingProductChanges;
  }>;
  baseSha?: string | null;
}

interface GitHubContentResponse {
  sha: string;
  content: string;
}

const ALLOWED_CHANGE_KEYS = new Set<keyof PendingProductChanges>([
  "model",
  "price",
  "sale_price",
  "storage_options",
  "display_size",
  "processor",
  "ram",
  "camera",
  "battery",
  "release_year",
  "description",
  "images",
  "is_featured",
  "is_published",
  "brand_name",
]);

function jsonResponse(body: unknown, status = 200, corsOrigin = "*"): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Access-Control-Allow-Origin": corsOrigin,
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    },
  });
}

function normalizePath(path: string): string {
  return path
    .split("/")
    .map((part) => encodeURIComponent(part))
    .join("/");
}

function decodeBase64Utf8(encoded: string): string {
  const cleaned = encoded.replace(/\n/g, "");
  const binary = atob(cleaned);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function encodeBase64Utf8(value: string): string {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(binary);
}

function getCorsOrigin(request: Request, env: Env): string {
  const configured = env.ALLOWED_ORIGIN?.trim() || "";
  if (!configured) return "*";
  const requestOrigin = request.headers.get("Origin");
  return requestOrigin === configured ? configured : configured;
}

function getGitHubConfig(env: Env) {
  const token = env.GITHUB_TOKEN?.trim();
  const owner = env.GITHUB_OWNER?.trim();
  const repo = env.GITHUB_REPO?.trim();
  const branch = env.GITHUB_TARGET_BRANCH?.trim() || "main";
  const path = env.GITHUB_PRODUCTS_PATH?.trim() || "public/data/products.json";
  if (!token || !owner || !repo) {
    return null;
  }
  return { token, owner, repo, branch, path };
}

async function fetchGitHubProducts(env: Env): Promise<{
  products: ProductRecord[];
  sha: string;
}> {
  const cfg = getGitHubConfig(env);
  if (!cfg) {
    throw new Error("Missing GitHub worker configuration.");
  }

  const url = `https://api.github.com/repos/${cfg.owner}/${cfg.repo}/contents/${normalizePath(
    cfg.path
  )}?ref=${encodeURIComponent(cfg.branch)}`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${cfg.token}`,
      Accept: "application/vnd.github+json",
      "User-Agent": "centralcelulares-admin-worker",
    },
  });

  if (!response.ok) {
    throw new Error(`GitHub read failed (${response.status})`);
  }

  const data = (await response.json()) as GitHubContentResponse;
  const jsonText = decodeBase64Utf8(data.content);
  const products = JSON.parse(jsonText) as ProductRecord[];
  return { products, sha: data.sha };
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function applyValidatedChanges(product: ProductRecord, changes: PendingProductChanges): ProductRecord {
  const next: ProductRecord = JSON.parse(JSON.stringify(product)) as ProductRecord;

  for (const key of Object.keys(changes) as Array<keyof PendingProductChanges>) {
    if (!ALLOWED_CHANGE_KEYS.has(key)) {
      throw new Error(`Unsupported change key: ${key}`);
    }
  }

  if (changes.model !== undefined) {
    if (typeof changes.model !== "string") throw new Error("model must be a string.");
    next.model = changes.model;
  }
  if (changes.price !== undefined) {
    if (typeof changes.price !== "number" || !Number.isFinite(changes.price)) {
      throw new Error("price must be a valid number.");
    }
    next.price = changes.price;
  }
  if (changes.sale_price !== undefined) {
    if (changes.sale_price !== null && (typeof changes.sale_price !== "number" || !Number.isFinite(changes.sale_price))) {
      throw new Error("sale_price must be number or null.");
    }
    next.sale_price = changes.sale_price;
  }
  if (changes.storage_options !== undefined) {
    if (changes.storage_options !== null && !isStringArray(changes.storage_options)) {
      throw new Error("storage_options must be string[] or null.");
    }
    next.storage_options = changes.storage_options;
  }
  if (changes.display_size !== undefined) {
    if (changes.display_size !== null && typeof changes.display_size !== "string") {
      throw new Error("display_size must be string or null.");
    }
    next.display_size = changes.display_size;
  }
  if (changes.processor !== undefined) {
    if (changes.processor !== null && typeof changes.processor !== "string") {
      throw new Error("processor must be string or null.");
    }
    next.processor = changes.processor;
  }
  if (changes.ram !== undefined) {
    if (changes.ram !== null && typeof changes.ram !== "string") {
      throw new Error("ram must be string or null.");
    }
    next.ram = changes.ram;
  }
  if (changes.camera !== undefined) {
    if (changes.camera !== null && typeof changes.camera !== "string") {
      throw new Error("camera must be string or null.");
    }
    next.camera = changes.camera;
  }
  if (changes.battery !== undefined) {
    if (changes.battery !== null && typeof changes.battery !== "string") {
      throw new Error("battery must be string or null.");
    }
    next.battery = changes.battery;
  }
  if (changes.release_year !== undefined) {
    if (
      changes.release_year !== null &&
      (typeof changes.release_year !== "number" || !Number.isInteger(changes.release_year))
    ) {
      throw new Error("release_year must be integer or null.");
    }
    next.release_year = changes.release_year;
  }
  if (changes.description !== undefined) {
    if (changes.description !== null && typeof changes.description !== "string") {
      throw new Error("description must be string or null.");
    }
    next.description = changes.description;
  }
  if (changes.images !== undefined) {
    if (changes.images !== null && !isStringArray(changes.images)) {
      throw new Error("images must be string[] or null.");
    }
    next.images = changes.images;
  }
  if (changes.is_featured !== undefined) {
    if (typeof changes.is_featured !== "boolean") throw new Error("is_featured must be boolean.");
    next.is_featured = changes.is_featured;
  }
  if (changes.is_published !== undefined) {
    if (typeof changes.is_published !== "boolean") throw new Error("is_published must be boolean.");
    next.is_published = changes.is_published;
  }
  if (changes.brand_name !== undefined) {
    if (typeof changes.brand_name !== "string") throw new Error("brand_name must be string.");
    next.brand = { ...(next.brand || { name: "" }), name: changes.brand_name };
  }

  next.updated_at = new Date().toISOString();
  return next;
}

function requireAuth(request: Request, env: Env): boolean {
  const expected = env.ADMIN_API_TOKEN?.trim();
  if (!expected) return true;
  const authHeader = request.headers.get("Authorization") || "";
  const bearer = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
  return bearer === expected;
}

async function handleGetProducts(request: Request, env: Env): Promise<Response> {
  const corsOrigin = getCorsOrigin(request, env);
  const cfg = getGitHubConfig(env);
  if (!cfg) {
    const assetResponse = await env.ASSETS.fetch(new Request(new URL("/data/products.json", request.url)));
    if (!assetResponse.ok) {
      return jsonResponse({ error: "Failed to read products from assets." }, 500, corsOrigin);
    }
    const products = (await assetResponse.json()) as ProductRecord[];
    return jsonResponse({ products, sha: null }, 200, corsOrigin);
  }

  try {
    const { products, sha } = await fetchGitHubProducts(env);
    return jsonResponse({ products, sha }, 200, corsOrigin);
  } catch (error) {
    return jsonResponse(
      {
        error: error instanceof Error ? error.message : "Failed to fetch products from GitHub.",
      },
      500,
      corsOrigin
    );
  }
}

async function handlePublishProducts(request: Request, env: Env): Promise<Response> {
  const corsOrigin = getCorsOrigin(request, env);
  if (!requireAuth(request, env)) {
    return jsonResponse({ error: "Unauthorized" }, 401, corsOrigin);
  }

  const cfg = getGitHubConfig(env);
  if (!cfg) {
    return jsonResponse({ error: "GitHub worker configuration is incomplete." }, 500, corsOrigin);
  }

  let payload: PublishRequestBody;
  try {
    payload = (await request.json()) as PublishRequestBody;
  } catch {
    return jsonResponse({ error: "Invalid JSON body." }, 400, corsOrigin);
  }

  if (!Array.isArray(payload.patches) || payload.patches.length === 0) {
    return jsonResponse({ error: "patches must be a non-empty array." }, 400, corsOrigin);
  }

  try {
    const { products: currentProducts, sha: currentSha } = await fetchGitHubProducts(env);
    if (payload.baseSha && payload.baseSha !== currentSha) {
      return jsonResponse(
        {
          error: "Source JSON changed on main. Refresh admin data and retry push.",
          currentSha,
        },
        409,
        corsOrigin
      );
    }

    const nextProducts = [...currentProducts];
    for (const patch of payload.patches) {
      if (!patch || typeof patch.id !== "string" || !patch.id.trim()) {
        throw new Error("Each patch requires a valid id.");
      }
      const index = nextProducts.findIndex((p) => String(p.id) === String(patch.id));
      if (index === -1) {
        throw new Error(`Product id ${patch.id} not found.`);
      }
      nextProducts[index] = applyValidatedChanges(nextProducts[index], patch.changes || {});
    }

    const content = `${JSON.stringify(nextProducts, null, 2)}\n`;
    const commitMessage = `chore(products): publish admin changes (${payload.patches.length} updates) at ${new Date().toISOString()}`;

    const updateUrl = `https://api.github.com/repos/${cfg.owner}/${cfg.repo}/contents/${normalizePath(
      cfg.path
    )}`;
    const updateResponse = await fetch(updateUrl, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${cfg.token}`,
        Accept: "application/vnd.github+json",
        "Content-Type": "application/json",
        "User-Agent": "centralcelulares-admin-worker",
      },
      body: JSON.stringify({
        message: commitMessage,
        content: encodeBase64Utf8(content),
        sha: currentSha,
        branch: cfg.branch,
      }),
    });

    if (!updateResponse.ok) {
      const errorBody = await updateResponse.text();
      return jsonResponse(
        {
          error: `GitHub write failed (${updateResponse.status}): ${errorBody}`,
        },
        500,
        corsOrigin
      );
    }

    const updateData = (await updateResponse.json()) as {
      content: { sha: string };
      commit: { sha: string; html_url: string };
    };

    return jsonResponse(
      {
        ok: true,
        commitSha: updateData.commit.sha,
        commitUrl: updateData.commit.html_url,
        sha: updateData.content.sha,
        products: nextProducts,
      },
      200,
      corsOrigin
    );
  } catch (error) {
    return jsonResponse(
      {
        error: error instanceof Error ? error.message : "Failed to publish products.",
      },
      400,
      corsOrigin
    );
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const corsOrigin = getCorsOrigin(request, env);

    if (request.method === "OPTIONS") {
      return jsonResponse({ ok: true }, 200, corsOrigin);
    }

    if (url.pathname === "/api/products" && request.method === "GET") {
      return handleGetProducts(request, env);
    }

    if (url.pathname === "/api/products/publish" && request.method === "POST") {
      return handlePublishProducts(request, env);
    }

    return env.ASSETS.fetch(request);
  },
};
