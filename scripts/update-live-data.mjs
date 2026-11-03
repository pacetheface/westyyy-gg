import { readFile, writeFile, readdir, unlink } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const thumbsDir = join(root, "assets", "thumbs");

function log(message) {
  console.log(message);
}

async function fetchWithTimeout(url, options = {}, timeoutMs = 15000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        "user-agent": "westyyy-gg",
        ...(options.headers || {})
      }
    });
  } finally {
    clearTimeout(timer);
  }
}

export function cleanTitle(value) {
  return String(value)
    .replace(/[\u0000-\u001F\u007F]/g, "")
    .replace(/[\u200B-\u200D\uFEFF\u2060]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function decodeXml(value) {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"")
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, n) => String.fromCodePoint(parseInt(n, 16)));
}

function serialize(data) {
  return `${JSON.stringify(data, null, 2)}\n`;
}

async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

function withoutStamp(data) {
  if (!data || typeof data !== "object") return data;
  const copy = { ...data };
  delete copy.updatedAt;
  return copy;
}

async function writeIfChanged(path, data) {
  const next = serialize(data);
  try {
    const previous = await readFile(path, "utf8");
    const prevData = JSON.parse(previous);
    if (serialize(withoutStamp(prevData)) === serialize(withoutStamp(data))) {
      return false;
    }
  } catch {
    // Missing or unreadable files get written.
  }
  const stamped = { ...data, updatedAt: new Date().toISOString() };
  await writeFile(path, serialize(stamped));
  return true;
}

async function saveThumb(url, filename) {
  if (!url) return "";
  const response = await fetchWithTimeout(url);
  if (!response.ok) return "";
  const type = response.headers.get("content-type") || "";
  if (!type.startsWith("image/")) return "";
  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.length < 32 || bytes.length > 2_000_000) return "";
  const path = join(thumbsDir, filename);
  try {
    const previous = await readFile(path);
    if (Buffer.compare(previous, bytes) === 0) return `/assets/thumbs/${filename}`;
  } catch {
    // New file.
  }
  await writeFile(path, bytes);
  return `/assets/thumbs/${filename}`;
}

export async function fetchYouTube(channelId) {
  if (!/^UC[A-Za-z0-9_-]{22}$/.test(channelId)) {
    throw new Error("youtubeChannelId is missing or not a channel id.");
  }
  const response = await fetchWithTimeout(
    `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`
  );
  if (!response.ok) throw new Error(`YouTube RSS failed (${response.status}).`);
  const xml = await response.text();
  const entries = xml.match(/<entry>[\s\S]*?<\/entry>/g) || [];
  const videos = [];
  for (const entry of entries) {
    const id = (entry.match(/<yt:videoId>([^<]+)<\/yt:videoId>/) || [])[1];
    const titleRaw = (entry.match(/<title>([\s\S]*?)<\/title>/) || [])[1];
    const published = (entry.match(/<published>([^<]+)<\/published>/) || [])[1];
    if (!id || !/^[A-Za-z0-9_-]{11}$/.test(id) || !titleRaw || !published) continue;
    const title = cleanTitle(decodeXml(titleRaw));
    if (!title) continue;
    const publishedAt = new Date(published);
    if (Number.isNaN(publishedAt.getTime())) continue;
    const thumbnail = await saveThumb(
      `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
      `yt-${id}.jpg`
    );
    videos.push({
      id,
      title,
      publishedAt: publishedAt.toISOString(),
      thumbnail
    });
    if (videos.length === 6) break;
  }
  videos.sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt));
  return videos;
}

function twitchThumb(url) {
  if (!url) return "";
  return url
    .replaceAll("%{width}", "480")
    .replaceAll("%{height}", "272")
    .replaceAll("{width}", "480")
    .replaceAll("{height}", "272");
}

async function twitchToken(clientId, clientSecret) {
  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: "client_credentials"
  });
  const response = await fetchWithTimeout("https://id.twitch.tv/oauth2/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body
  });
  if (!response.ok) throw new Error(`Twitch token request failed (${response.status}).`);
  const payload = await response.json();
  if (!payload.access_token) throw new Error("Twitch token response had no access token.");
  return payload.access_token;
}

async function helix(url, clientId, token) {
  const response = await fetchWithTimeout(url, {
    headers: {
      "client-id": clientId,
      authorization: `Bearer ${token}`
    }
  });
  if (!response.ok) throw new Error(`Twitch API failed (${response.status}).`);
  return response.json();
}

async function fetchTwitch(login, clientId, token) {
  const users = await helix(
    `https://api.twitch.tv/helix/users?login=${encodeURIComponent(login)}`,
    clientId,
    token
  );
  const user = users.data && users.data[0];
  if (!user) throw new Error("No Twitch user for the configured login.");

  const streams = await helix(
    `https://api.twitch.tv/helix/streams?user_id=${encodeURIComponent(user.id)}`,
    clientId,
    token
  );
  const stream = streams.data && streams.data[0];
  const live = {
    live: Boolean(stream),
    title: stream ? cleanTitle(stream.title || "") : "",
    game: stream ? cleanTitle(stream.game_name || "") : "",
    viewerCount: stream ? Number(stream.viewer_count) || 0 : 0,
    startedAt: stream && stream.started_at ? stream.started_at : null
  };

  const end = new Date();
  const start = new Date(end.getTime() - 90 * 24 * 60 * 60 * 1000);
  const clipsUrl = new URL("https://api.twitch.tv/helix/clips");
  clipsUrl.searchParams.set("broadcaster_id", user.id);
  clipsUrl.searchParams.set("first", "20");
  clipsUrl.searchParams.set("started_at", start.toISOString());
  clipsUrl.searchParams.set("ended_at", end.toISOString());
  const clipsPayload = await helix(clipsUrl, clientId, token);
  const clips = [];
  const rows = [...(clipsPayload.data || [])].sort(
    (a, b) => Date.parse(b.created_at) - Date.parse(a.created_at)
  );
  for (const clip of rows) {
    if (!clip || !/^[A-Za-z0-9_-]{2,80}$/.test(clip.id || "")) continue;
    const title = cleanTitle(clip.title || "");
    if (!title) continue;
    const thumbnail = await saveThumb(twitchThumb(clip.thumbnail_url), `twitch-${clip.id}.jpg`);
    clips.push({
      id: clip.id,
      title,
      publishedAt: new Date(clip.created_at).toISOString(),
      thumbnail
    });
    if (clips.length === 6) break;
  }
  return { live, clips };
}

async function pruneThumbs(clips) {
  const keep = new Set([".gitkeep"]);
  for (const item of [...(clips.youtube || []), ...(clips.twitch || [])]) {
    if (typeof item.thumbnail === "string" && item.thumbnail.startsWith("/assets/thumbs/")) {
      keep.add(item.thumbnail.slice("/assets/thumbs/".length));
    }
  }
  const files = await readdir(thumbsDir);
  await Promise.all(files.filter((name) => !keep.has(name)).map((name) => unlink(join(thumbsDir, name))));
}

async function main() {
  const clientId = process.env.TWITCH_CLIENT_ID || "";
  const clientSecret = process.env.TWITCH_CLIENT_SECRET || "";
  if (!clientId || !clientSecret) {
    log("Twitch secrets are not set. Leaving data/live.json and data/clips.json unchanged.");
    return;
  }

  const config = await readJson(join(root, "data", "site.json"));
  const login = config.twitchLogin;
  const channelId = config.youtubeChannelId;
  if (!login || !channelId) {
    throw new Error("data/site.json is missing twitchLogin or youtubeChannelId.");
  }

  const previousClips = await readJson(join(root, "data", "clips.json"));
  let live = null;
  let twitchClips = null;
  let youtube = null;
  let twitchError = null;
  let youtubeError = null;

  try {
    const token = await twitchToken(clientId, clientSecret);
    const twitch = await fetchTwitch(login, clientId, token);
    live = twitch.live;
    twitchClips = twitch.clips;
  } catch (error) {
    twitchError = error;
  }

  try {
    youtube = await fetchYouTube(channelId);
  } catch (error) {
    youtubeError = error;
  }

  if (twitchError && youtubeError) {
    log(twitchError.message);
    log(youtubeError.message);
    process.exitCode = 1;
    return;
  }
  if (twitchError) log(`Twitch update skipped: ${twitchError.message}`);
  if (youtubeError) log(`YouTube update skipped: ${youtubeError.message}`);

  const clips = {
    youtube: youtube || previousClips.youtube || [],
    twitch: twitchClips || previousClips.twitch || []
  };

  const liveChanged = live ? await writeIfChanged(join(root, "data", "live.json"), live) : false;
  const clipsChanged = await writeIfChanged(join(root, "data", "clips.json"), clips);
  if (youtube && twitchClips) await pruneThumbs(clips);

  log(
    `Live: ${live && live.live ? "yes" : live ? "no" : "unchanged"}. ` +
    `YouTube: ${clips.youtube.length}. Twitch clips: ${clips.twitch.length}. ` +
    `${liveChanged || clipsChanged ? "Wrote updated data." : "No change in live or clip data."}`
  );
}

const isDirect = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isDirect) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : "Live update failed.");
    process.exitCode = 1;
  });
}
