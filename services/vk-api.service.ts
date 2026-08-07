const VK_API = "https://api.vk.com/method";
const VK_VERSION = "5.199";

type VkError = { error_code: number; error_msg: string };

async function vkCall<T>(
  method: string,
  params: Record<string, string | number | undefined>
): Promise<T> {
  const token = process.env.VK_SERVICE_TOKEN;
  if (!token) {
    throw new Error("VK_SERVICE_TOKEN не задан в .env");
  }

  const body = new URLSearchParams();
  body.set("access_token", token);
  body.set("v", VK_VERSION);
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== "") body.set(k, String(v));
  }

  const res = await fetch(`${VK_API}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
    next: { revalidate: 0 },
  });

  if (!res.ok) {
    throw new Error(`VK HTTP ${res.status}`);
  }

  const json = (await res.json()) as { response?: T; error?: VkError };
  if (json.error) {
    throw new Error(`VK ${json.error.error_code}: ${json.error.error_msg}`);
  }
  if (json.response === undefined) {
    throw new Error("Пустой ответ VK API");
  }
  return json.response;
}

export type VkWallPost = {
  id: number;
  owner_id: number;
  from_id?: number;
  date: number;
  text?: string;
  marked_as_ads?: number;
  post_type?: string;
  copy_history?: { text?: string }[];
};

export type VkGroup = {
  id: number;
  name: string;
  screen_name: string;
};

export type VkProfile = {
  id: number;
  first_name: string;
  last_name: string;
};

export async function resolveVkGroup(screenName: string): Promise<VkGroup | null> {
  const response = await vkCall<
    | VkGroup[]
    | { groups?: VkGroup[] }
  >("groups.getById", { group_ids: screenName });

  const groups = Array.isArray(response)
    ? response
    : response.groups ?? [];
  return groups[0] ?? null;
}

export async function fetchVkWall(
  ownerId: number,
  count = 50
): Promise<{
  items: VkWallPost[];
  profiles: VkProfile[];
  groups: VkGroup[];
}> {
  const response = await vkCall<{
    items: VkWallPost[];
    profiles?: VkProfile[];
    groups?: VkGroup[];
  }>("wall.get", {
    owner_id: ownerId,
    count,
    filter: "all",
    extended: 1,
  });

  return {
    items: response.items ?? [],
    profiles: response.profiles ?? [],
    groups: response.groups ?? [],
  };
}

export function buildVkPostUrl(ownerId: number, postId: number): string {
  return `https://vk.com/wall${ownerId}_${postId}`;
}

export function extractPostText(post: VkWallPost): string {
  const own = (post.text || "").trim();
  if (own) return own;
  const fromRepost = post.copy_history?.[0]?.text?.trim();
  return fromRepost || "";
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

/** Пауза между запросами к VK, чтобы не упереться в лимит */
export async function vkThrottle() {
  await sleep(350);
}
