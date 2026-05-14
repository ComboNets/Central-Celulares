interface Env {
  ASSETS?: Fetcher;
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

interface PendingProductCreate {
  id: string;
  model: string;
  price: number;
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

interface PendingImageUpload {
  id: string;
  extension: string;
  mimeType?: string;
  contentBase64: string;
}

interface PublishRequestBody {
  patches?: Array<{
    id: string;
    changes: PendingProductChanges;
  }>;
  creates?: PendingProductCreate[];
  imageUploads?: PendingImageUpload[];
  baseSha?: string | null;
}

interface GitHubContentResponse {
  sha: string;
  content: string;
}

interface GitHubRefResponse {
  object: {
    sha: string;
  };
}

interface GitHubCommitResponse {
  sha: string;
  tree: {
    sha: string;
  };
}

interface GitHubBlobResponse {
  sha: string;
}

interface GitHubTreeResponse {
  sha: string;
}

interface GitHubCreateCommitResponse {
  sha: string;
}

interface GitHubFileWrite {
  path: string;
  contentBase64: string;
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

const ALLOWED_IMAGE_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif"]);

function jsonResponse(body: unknown, status = 200, corsOrigin = "*"): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Access-Control-Allow-Origin": corsOrigin,
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Cache-Control": "no-store",
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
  const allowedOrigins = configured
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
  if (requestOrigin && allowedOrigins.includes(requestOrigin)) {
    return requestOrigin;
  }
  return allowedOrigins[0] || configured;
}

function getGitHubReadConfig(env: Env) {
  const token = env.GITHUB_TOKEN?.trim() || undefined;
  const owner = env.GITHUB_OWNER?.trim();
  const repo = env.GITHUB_REPO?.trim();
  const branch = env.GITHUB_TARGET_BRANCH?.trim() || "main";
  const path = env.GITHUB_PRODUCTS_PATH?.trim() || "public/data/products.json";
  if (!owner || !repo) {
    return null;
  }
  return { token, owner, repo, branch, path };
}

function getGitHubWriteConfig(env: Env) {
  const readCfg = getGitHubReadConfig(env);
  const token = env.GITHUB_TOKEN?.trim();
  if (!readCfg || !token) {
    return null;
  }
  return { ...readCfg, token };
}

function buildGitHubHeaders(token?: string, extraHeaders?: HeadersInit): HeadersInit {
  return {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    Accept: "application/vnd.github+json",
    "User-Agent": "centralcelulares-admin-worker",
    ...(extraHeaders || {}),
  };
}

async function githubRequest<T>(
  cfg: { token: string; owner: string; repo: string },
  endpoint: string,
  init?: RequestInit
): Promise<T> {
  const response = await fetch(`https://api.github.com/repos/${cfg.owner}/${cfg.repo}${endpoint}`, {
    ...init,
    headers: buildGitHubHeaders(cfg.token, init?.headers),
  });

  if (!response.ok) {
    const errorText = await response.text();
    const method = init?.method || "GET";
    throw new Error(`GitHub API ${method} ${endpoint} failed (${response.status}): ${errorText}`);
  }

  return (await response.json()) as T;
}

async function fetchGitHubProducts(env: Env): Promise<{
  products: ProductRecord[];
  sha: string;
}> {
  const cfg = getGitHubReadConfig(env);
  if (!cfg) {
    throw new Error("Missing GitHub read configuration.");
  }

  const url = `https://api.github.com/repos/${cfg.owner}/${cfg.repo}/contents/${normalizePath(
    cfg.path
  )}?ref=${encodeURIComponent(cfg.branch)}`;

  const response = await fetch(url, {
    headers: buildGitHubHeaders(cfg.token),
  });

  if (!response.ok) {
    throw new Error(`GitHub read failed (${response.status})`);
  }

  const data = (await response.json()) as GitHubContentResponse;
  const jsonText = decodeBase64Utf8(data.content);
  const products = JSON.parse(jsonText) as ProductRecord[];
  return { products, sha: data.sha };
}

function getContentTypeForPath(path: string): string {
  const lower = path.toLowerCase();
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".webp")) return "image/webp";
  if (lower.endsWith(".gif")) return "image/gif";
  return "application/octet-stream";
}

async function handleProductImage(request: Request, env: Env): Promise<Response | null> {
  const cfg = getGitHubReadConfig(env);
  if (!cfg) return null;

  const url = new URL(request.url);
  const prefix = "/images/fotos/";
  if (!url.pathname.startsWith(prefix)) return null;

  const fileName = decodeURIComponent(url.pathname.slice(prefix.length));
  if (!fileName || fileName.includes("/") || fileName.includes("\\") || fileName.includes("..")) {
    return new Response("Invalid image path", { status: 400 });
  }

  const repoPath = `public/images/fotos/${fileName}`;
  const githubUrl = `https://api.github.com/repos/${cfg.owner}/${cfg.repo}/contents/${normalizePath(
    repoPath
  )}?ref=${encodeURIComponent(cfg.branch)}`;

  const response = await fetch(githubUrl, {
    headers: buildGitHubHeaders(cfg.token, {
      Accept: "application/vnd.github.raw",
    }),
  });

  if (!response.ok) return null;

  return new Response(response.body, {
    status: 200,
    headers: {
      "Content-Type": response.headers.get("Content-Type") || getContentTypeForPath(fileName),
      "Cache-Control": "public, max-age=60",
      "Access-Control-Allow-Origin": getCorsOrigin(request, env),
    },
  });
}

async function tryFetchProductsFromAssets(request: Request, env: Env): Promise<ProductRecord[] | null> {
  if (!env.ASSETS || typeof env.ASSETS.fetch !== "function") {
    return null;
  }
  const fallbackUrl = new URL("/data/products.json", request.url).toString();
  const assetResponse = await env.ASSETS.fetch(fallbackUrl);
  if (!assetResponse.ok) {
    throw new Error(`Asset products read failed (${assetResponse.status}).`);
  }
  return (await assetResponse.json()) as ProductRecord[];
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function toOptionalString(value: unknown, fieldName: string): string | null {
  if (value === undefined || value === null) return null;
  if (typeof value !== "string") {
    throw new Error(`${fieldName} must be string or null.`);
  }
  const trimmed = value.trim();
  return trimmed || null;
}

function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function buildValidatedCreatedProduct(input: PendingProductCreate): ProductRecord {
  if (!input || typeof input !== "object") {
    throw new Error("Each create item must be an object.");
  }

  const id = typeof input.id === "string" ? input.id.trim() : "";
  if (!id) {
    throw new Error("Each create item requires a valid id.");
  }

  const model = typeof input.model === "string" ? input.model.trim() : "";
  if (!model) {
    throw new Error(`Product ${id}: model is required.`);
  }

  if (typeof input.price !== "number" || !Number.isFinite(input.price) || input.price < 0) {
    throw new Error(`Product ${id}: price must be a valid number >= 0.`);
  }

  if (input.sale_price !== undefined) {
    if (input.sale_price !== null && (typeof input.sale_price !== "number" || !Number.isFinite(input.sale_price) || input.sale_price < 0)) {
      throw new Error(`Product ${id}: sale_price must be number >= 0 or null.`);
    }
  }

  if (input.storage_options !== undefined) {
    if (input.storage_options !== null && !isStringArray(input.storage_options)) {
      throw new Error(`Product ${id}: storage_options must be string[] or null.`);
    }
  }

  if (input.release_year !== undefined) {
    if (input.release_year !== null && (typeof input.release_year !== "number" || !Number.isInteger(input.release_year))) {
      throw new Error(`Product ${id}: release_year must be integer or null.`);
    }
  }

  if (input.images !== undefined) {
    if (input.images !== null && !isStringArray(input.images)) {
      throw new Error(`Product ${id}: images must be string[] or null.`);
    }
  }

  if (input.is_featured !== undefined && typeof input.is_featured !== "boolean") {
    throw new Error(`Product ${id}: is_featured must be boolean.`);
  }
  if (input.is_published !== undefined && typeof input.is_published !== "boolean") {
    throw new Error(`Product ${id}: is_published must be boolean.`);
  }

  const brandName = toOptionalString(input.brand_name, "brand_name") || "Sin marca";
  const now = new Date().toISOString();
  const fallbackBrandId = `brand-${sanitizeIdForFileName(id).toLowerCase()}`;
  const brandId = slugify(brandName) || fallbackBrandId;

  return {
    id,
    brand_id: brandId,
    model,
    price: input.price,
    sale_price: input.sale_price ?? null,
    storage_options: input.storage_options ?? null,
    display_size: toOptionalString(input.display_size, "display_size"),
    processor: toOptionalString(input.processor, "processor"),
    ram: toOptionalString(input.ram, "ram"),
    camera: toOptionalString(input.camera, "camera"),
    battery: toOptionalString(input.battery, "battery"),
    release_year: input.release_year ?? null,
    description: toOptionalString(input.description, "description"),
    images: input.images ?? [],
    is_featured: input.is_featured ?? false,
    is_published: input.is_published ?? true,
    view_count: 0,
    click_count: 0,
    created_at: now,
    updated_at: now,
    brand: {
      id: brandId,
      name: brandName,
      logo_url: null,
      created_at: now,
    },
  };
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

function normalizeImageExtension(extension: string): string {
  const trimmed = extension.trim().toLowerCase();
  if (!trimmed) throw new Error("image extension is required.");
  const withDot = trimmed.startsWith(".") ? trimmed : `.${trimmed}`;
  if (!ALLOWED_IMAGE_EXTENSIONS.has(withDot)) {
    throw new Error(`Unsupported image extension: ${withDot}`);
  }
  return withDot === ".jpeg" ? ".jpg" : withDot;
}

function sanitizeIdForFileName(id: string): string {
  const sanitized = id.trim().replace(/[^a-zA-Z0-9_-]/g, "-");
  if (!sanitized) throw new Error("Invalid product id for image naming.");
  return sanitized;
}

async function createGitHubCommitWithFiles(
  cfg: { token: string; owner: string; repo: string; branch: string },
  commitMessage: string,
  files: GitHubFileWrite[]
): Promise<{ commitSha: string; commitUrl: string }> {
  const branchRef = await githubRequest<GitHubRefResponse>(
    cfg,
    `/git/ref/heads/${encodeURIComponent(cfg.branch)}`
  );
  const parentCommitSha = branchRef.object.sha;

  const parentCommit = await githubRequest<GitHubCommitResponse>(cfg, `/git/commits/${parentCommitSha}`);
  const baseTreeSha = parentCommit.tree.sha;

  const blobShas = await Promise.all(
    files.map(async (file) => {
      const blob = await githubRequest<GitHubBlobResponse>(cfg, "/git/blobs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          content: file.contentBase64,
          encoding: "base64",
        }),
      });
      return { path: file.path, sha: blob.sha };
    })
  );

  const tree = await githubRequest<GitHubTreeResponse>(cfg, "/git/trees", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      base_tree: baseTreeSha,
      tree: blobShas.map((blob) => ({
        path: blob.path,
        mode: "100644",
        type: "blob",
        sha: blob.sha,
      })),
    }),
  });

  const commit = await githubRequest<GitHubCreateCommitResponse>(cfg, "/git/commits", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      message: commitMessage,
      tree: tree.sha,
      parents: [parentCommitSha],
    }),
  });

  await githubRequest<GitHubRefResponse>(cfg, `/git/refs/heads/${encodeURIComponent(cfg.branch)}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      sha: commit.sha,
      force: false,
    }),
  });

  return {
    commitSha: commit.sha,
    commitUrl: `https://github.com/${cfg.owner}/${cfg.repo}/commit/${commit.sha}`,
  };
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

  try {
    const readCfg = getGitHubReadConfig(env);

    if (readCfg) {
      try {
        const { products, sha } = await fetchGitHubProducts(env);
        return jsonResponse({ products, sha }, 200, corsOrigin);
      } catch (githubError) {
        const fallbackProducts = await tryFetchProductsFromAssets(request, env);
        if (fallbackProducts) {
          return jsonResponse({ products: fallbackProducts, sha: null }, 200, corsOrigin);
        }
        throw githubError;
      }
    }

    const fallbackProducts = await tryFetchProductsFromAssets(request, env);
    if (fallbackProducts) {
      return jsonResponse({ products: fallbackProducts, sha: null }, 200, corsOrigin);
    }

    return jsonResponse({ error: "GitHub worker configuration is incomplete." }, 500, corsOrigin);
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
  const cfg = getGitHubWriteConfig(env);
  if (!cfg) {
    return jsonResponse({ error: "GitHub worker configuration is incomplete." }, 500, corsOrigin);
  }

  let payload: PublishRequestBody;
  try {
    payload = (await request.json()) as PublishRequestBody;
  } catch {
    return jsonResponse({ error: "Invalid JSON body." }, 400, corsOrigin);
  }

  const patches = Array.isArray(payload.patches) ? payload.patches : [];
  const creates = Array.isArray(payload.creates) ? payload.creates : [];
  const imageUploads = Array.isArray(payload.imageUploads) ? payload.imageUploads : [];

  if (patches.length === 0 && creates.length === 0 && imageUploads.length === 0) {
    return jsonResponse({ error: "patches, creates or imageUploads must contain at least one item." }, 400, corsOrigin);
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
    for (const patch of patches) {
      if (!patch || typeof patch.id !== "string" || !patch.id.trim()) {
        throw new Error("Each patch requires a valid id.");
      }
      const index = nextProducts.findIndex((p) => String(p.id) === String(patch.id));
      if (index === -1) {
        throw new Error(`Product id ${patch.id} not found.`);
      }
      nextProducts[index] = applyValidatedChanges(nextProducts[index], patch.changes || {});
    }

    const seenCreateIds = new Set<string>();
    for (const create of creates) {
      const createdProduct = buildValidatedCreatedProduct(create);
      if (seenCreateIds.has(createdProduct.id)) {
        throw new Error(`Product id ${createdProduct.id} is duplicated in creates payload.`);
      }
      if (nextProducts.some((existing) => String(existing.id) === String(createdProduct.id))) {
        throw new Error(`Product id ${createdProduct.id} already exists.`);
      }
      nextProducts.push(createdProduct);
      seenCreateIds.add(createdProduct.id);
    }

    const imageFileWrites = new Map<string, string>();
    for (const upload of imageUploads) {
      if (!upload || typeof upload.id !== "string" || !upload.id.trim()) {
        throw new Error("Each image upload requires a valid id.");
      }
      if (typeof upload.contentBase64 !== "string" || !upload.contentBase64.trim()) {
        throw new Error(`Image upload for ${upload.id} is missing contentBase64.`);
      }

      const productIndex = nextProducts.findIndex((p) => String(p.id) === String(upload.id));
      if (productIndex === -1) {
        throw new Error(`Product id ${upload.id} not found for image upload.`);
      }

      const extension = normalizeImageExtension(upload.extension || "");
      const safeId = sanitizeIdForFileName(upload.id);
      const fileName = `p-${safeId}${extension}`;
      const publicImagePath = `/images/fotos/${fileName}`;
      const repoImagePath = `public/images/fotos/${fileName}`;

      const existingTail = Array.isArray(nextProducts[productIndex].images)
        ? nextProducts[productIndex].images!.slice(1)
        : [];
      nextProducts[productIndex].images = [publicImagePath, ...existingTail].filter(Boolean);
      nextProducts[productIndex].updated_at = new Date().toISOString();

      imageFileWrites.set(repoImagePath, upload.contentBase64.replace(/\s/g, ""));
    }

    const content = `${JSON.stringify(nextProducts, null, 2)}\n`;
    const commitMessage = `chore(products): publish admin changes (${patches.length} updates, ${creates.length} creates, ${imageUploads.length} images) at ${new Date().toISOString()}`;

    const files: GitHubFileWrite[] = [
      {
        path: cfg.path,
        contentBase64: encodeBase64Utf8(content),
      },
      ...Array.from(imageFileWrites.entries()).map(([path, contentBase64]) => ({
        path,
        contentBase64,
      })),
    ];

    const { commitSha, commitUrl } = await createGitHubCommitWithFiles(cfg, commitMessage, files);
    const refreshedProducts = await fetchGitHubProducts(env);

    return jsonResponse(
      {
        ok: true,
        commitSha,
        commitUrl,
        sha: refreshedProducts.sha,
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

    if (url.pathname.startsWith("/images/fotos/") && request.method === "GET") {
      const imageResponse = await handleProductImage(request, env);
      if (imageResponse) return imageResponse;
    }

    if (env.ASSETS && typeof env.ASSETS.fetch === "function") {
      return env.ASSETS.fetch(request);
    }

    return new Response("Not Found", { status: 404 });
  },
};
