import { buildSchedule, formatRange, localZone } from "./time.js";

function setupNav() {
  const button = document.querySelector(".nav-toggle");
  const nav = document.getElementById("site-nav");
  if (!button || !nav) return;

  const setOpen = (open) => {
    nav.classList.toggle("is-open", open);
    button.setAttribute("aria-expanded", open ? "true" : "false");
    button.textContent = open ? "Close" : "Menu";
  };

  button.addEventListener("click", () => {
    setOpen(button.getAttribute("aria-expanded") !== "true");
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && button.getAttribute("aria-expanded") === "true") {
      setOpen(false);
      button.focus();
    }
  });

  nav.addEventListener("click", (event) => {
    const target = event.target;
    if (target instanceof Element && target.closest("a")) setOpen(false);
  });
}

async function loadJson(url) {
  const response = await fetch(url, { headers: { accept: "application/json" } });
  if (!response.ok) throw new Error(String(response.status));
  return response.json();
}

function isEmail(value) {
  return /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(value);
}

function isDiscordInvite(value) {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:") return false;
    return url.hostname === "discord.gg" || url.hostname === "discord.com" || url.hostname === "www.discord.com";
  } catch {
    return false;
  }
}

function isHttpUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

function applyConfig(config) {
  if (!config || typeof config !== "object") return;
  const email = String(config.businessEmail || "").trim();
  if (isEmail(email)) {
    document.querySelectorAll("[data-email]").forEach((node) => {
      node.textContent = email;
      if (node.tagName === "A") node.setAttribute("href", `mailto:${email}`);
    });
  }

  if (typeof config.impressumName === "string") {
    document.querySelectorAll("[data-impressum-name]").forEach((node) => {
      node.textContent = config.impressumName;
    });
  }
  if (typeof config.impressumAddress === "string") {
    document.querySelectorAll("[data-impressum-address]").forEach((node) => {
      node.textContent = config.impressumAddress;
    });
  }

  const row = document.getElementById("discord-row");
  const invite = String(config.discordInvite || "").trim();
  if (row && isDiscordInvite(invite)) {
    const name = String(config.discordName || "w for westyyy");
    const link = document.createElement("a");
    link.className = "link-row";
    link.href = invite;
    const copy = document.createElement("span");
    copy.className = "link-copy";
    const kicker = document.createElement("span");
    kicker.className = "link-kicker";
    kicker.textContent = "Discord";
    const label = document.createElement("span");
    label.className = "link-url keep-case";
    label.textContent = name;
    copy.append(kicker, label);
    const go = document.createElement("span");
    go.className = "link-go";
    go.textContent = "Open";
    link.append(copy, go);
    row.replaceChildren(link);
  }
}

function renderLive(data) {
  const root = document.getElementById("live-badge");
  if (!root) return;
  root.replaceChildren();
  if (!data || typeof data.live !== "boolean") return;

  const badge = document.createElement("p");
  badge.className = data.live ? "badge" : "badge is-offline";
  badge.textContent = data.live ? "Live" : "Offline";
  root.append(badge);

  if (!data.live) return;

  const parts = [];
  if (typeof data.title === "string" && data.title.trim()) parts.push(data.title.trim());
  if (typeof data.game === "string" && data.game.trim()) parts.push(data.game.trim());
  if (Number.isFinite(data.viewerCount)) {
    parts.push(`${Number(data.viewerCount).toLocaleString("en-GB")} watching`);
  }
  if (parts.length) {
    const detail = document.createElement("p");
    detail.className = "live-detail";
    detail.textContent = parts.join(" · ");
    root.append(detail);
  }

  const watch = document.createElement("a");
  watch.className = "button";
  watch.href = "https://twitch.tv/westyyy__rl";
  watch.textContent = "Watch";
  root.append(watch);
}

function timeLine(label, item, zone) {
  const row = document.createElement("p");
  row.className = "slot-time";
  const prefix = document.createElement("span");
  prefix.className = label === "Europe/Berlin" ? "time-label keep-case" : "time-label";
  prefix.textContent = `${label}: `;
  const range = formatRange(item.startAt, item.endAt, zone);
  const time = document.createElement("time");
  time.dateTime = range.startIso;
  time.textContent = range.text;
  row.append(prefix, time);
  return row;
}

function renderNext(model) {
  const root = document.getElementById("next-stream");
  const heading = document.getElementById("next-heading");
  if (!root) return;
  if (!model.next) {
    const empty = document.createElement("p");
    empty.textContent = "No upcoming stream is listed.";
    root.replaceChildren(empty);
    return;
  }

  const item = model.next;
  if (heading) heading.textContent = item.ongoing ? "On now" : "Next stream";

  const tag = document.createElement("p");
  tag.className = "tag";
  tag.textContent = item.ongoing ? "On now" : "Next";

  const title = document.createElement("p");
  title.className = "next-title";
  title.textContent = item.title;

  const every = document.createElement("p");
  every.className = "next-every";
  every.textContent = item.everyLabel;

  const local = localZone();
  const fragment = document.createDocumentFragment();
  fragment.append(tag, title, every);
  if (local === model.zone) {
    fragment.append(timeLine("Europe/Berlin", item, model.zone));
  } else {
    fragment.append(timeLine("Your time", item, local));
    fragment.append(timeLine("Europe/Berlin", item, model.zone));
  }
  root.replaceChildren(fragment);
}

function slotArticle(item, model) {
  const article = document.createElement("article");
  article.className = "slot";
  const isNext = Boolean(model.next && model.next.id === item.id);
  if (isNext) article.classList.add("is-next");

  const label = document.createElement("p");
  label.className = "slot-day";
  label.textContent = item.everyLabel;

  const body = document.createElement("div");
  if (isNext) {
    const tag = document.createElement("p");
    tag.className = "tag";
    tag.textContent = item.ongoing ? "On now" : "Next";
    body.append(tag);
  }
  const title = document.createElement("h3");
  title.textContent = item.title;
  body.append(title);

  const local = localZone();
  if (local === model.zone) {
    body.append(timeLine("Europe/Berlin", item, model.zone));
  } else {
    body.append(timeLine("Your time", item, local));
    body.append(timeLine("Europe/Berlin", item, model.zone));
  }

  article.append(label, body);
  return article;
}

function renderSchedulePage(model) {
  const root = document.getElementById("schedule-root");
  if (!root) return;
  const note = document.getElementById("zone-note");
  const local = localZone();
  if (note) {
    note.textContent = local === model.zone
      ? "Your time zone matches Europe/Berlin."
      : `Your time zone is ${local}.`;
  }

  root.replaceChildren();
  if (!model.weekly.length && !model.oneOff.length) {
    const empty = document.createElement("p");
    empty.className = "empty";
    empty.textContent = "No upcoming streams are listed.";
    root.append(empty);
    return;
  }

  const addGroup = (heading, items) => {
    const section = document.createElement("section");
    section.className = "slot-group";
    const h2 = document.createElement("h2");
    h2.textContent = heading;
    const list = document.createElement("div");
    list.className = "slot-list";
    items.forEach((item) => list.append(slotArticle(item, model)));
    section.append(h2, list);
    root.append(section);
  };

  if (model.weekly.length) addGroup("Weekly", model.weekly);
  if (model.oneOff.length) addGroup("One-off dates", model.oneOff);
}

function formatDay(iso) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric"
  }).format(date);
}

function normalizeClips(list, kind) {
  if (!Array.isArray(list)) return [];
  const idPattern = kind === "youtube" ? /^[A-Za-z0-9_-]{11}$/ : /^[A-Za-z0-9_-]{2,80}$/;
  const items = [];
  for (const raw of list) {
    if (!raw || typeof raw.id !== "string" || !idPattern.test(raw.id)) continue;
    const title = typeof raw.title === "string" ? raw.title.trim() : "";
    if (!title) continue;
    let thumbnail = "";
    if (
      typeof raw.thumbnail === "string" &&
      /^\/assets\/thumbs\/[A-Za-z0-9._-]+$/.test(raw.thumbnail) &&
      !raw.thumbnail.includes("..")
    ) {
      thumbnail = raw.thumbnail;
    }
    items.push({
      id: raw.id,
      title,
      publishedAt: typeof raw.publishedAt === "string" ? raw.publishedAt : "",
      thumbnail,
      kind
    });
  }
  return items;
}

function byNewest(a, b) {
  return Date.parse(b.publishedAt || 0) - Date.parse(a.publishedAt || 0);
}

function watchUrl(item) {
  if (item.kind === "youtube") return `https://www.youtube.com/watch?v=${item.id}`;
  return `https://clips.twitch.tv/${encodeURIComponent(item.id)}`;
}

function embedSrc(item) {
  if (item.kind === "youtube") {
    return `https://www.youtube-nocookie.com/embed/${item.id}?autoplay=1`;
  }
  const parent = window.location.hostname || "localhost";
  return `https://clips.twitch.tv/embed?clip=${encodeURIComponent(item.id)}&parent=${encodeURIComponent(parent)}&autoplay=true`;
}

function homeClipLink(item) {
  const link = document.createElement("a");
  link.className = "clip-link";
  link.href = `/clips/#${item.kind}-${item.id}`;
  if (item.thumbnail) {
    const image = document.createElement("img");
    image.src = item.thumbnail;
    image.alt = "";
    image.width = 480;
    image.height = 270;
    link.append(image);
  }
  const kicker = document.createElement("span");
  kicker.className = "kicker";
  kicker.textContent = item.kind === "youtube" ? "YouTube" : "Twitch";
  const title = document.createElement("span");
  title.className = "clip-title";
  title.textContent = item.title;
  link.append(kicker, title);
  if (item.publishedAt && formatDay(item.publishedAt)) {
    const date = document.createElement("span");
    date.className = "clip-date";
    date.textContent = formatDay(item.publishedAt);
    link.append(date);
  }
  return link;
}

function clipCard(item) {
  const article = document.createElement("article");
  article.className = "clip-card";
  article.id = `${item.kind}-${item.id}`;

  const kicker = document.createElement("p");
  kicker.className = "kicker";
  kicker.textContent = item.kind === "youtube" ? "YouTube" : "Twitch";

  const title = document.createElement("h3");
  title.textContent = item.title;
  article.append(kicker, title);

  if (item.publishedAt && formatDay(item.publishedAt)) {
    const dateRow = document.createElement("p");
    dateRow.className = "clip-date";
    const time = document.createElement("time");
    time.dateTime = item.publishedAt;
    time.textContent = formatDay(item.publishedAt);
    dateRow.append(time);
    article.append(dateRow);
  }

  const slot = document.createElement("div");
  slot.className = "player-slot";
  if (item.thumbnail) {
    const image = document.createElement("img");
    image.src = item.thumbnail;
    image.alt = "";
    image.width = 480;
    image.height = 270;
    slot.append(image);
  } else {
    const placeholder = document.createElement("p");
    placeholder.className = "text-card";
    placeholder.textContent = item.kind === "youtube" ? "YouTube video" : "Twitch clip";
    slot.append(placeholder);
  }

  const service = item.kind === "youtube" ? "YouTube" : "Twitch";
  const note = document.createElement("p");
  note.className = "embed-note";
  note.textContent = `Loading the player contacts ${service} and sends your IP address to ${service}.`;

  const actions = document.createElement("div");
  actions.className = "clip-actions";
  const button = document.createElement("button");
  button.type = "button";
  button.className = "button load-player";
  button.textContent = "Load video";
  button.addEventListener("click", () => {
    const frame = document.createElement("iframe");
    frame.className = "player";
    frame.title = item.title;
    frame.allowFullscreen = true;
    frame.allow = "autoplay; fullscreen; encrypted-media; picture-in-picture";
    frame.referrerPolicy = "strict-origin-when-cross-origin";
    frame.src = embedSrc(item);
    slot.replaceChildren(frame);
    button.remove();
  });
  const open = document.createElement("a");
  open.href = watchUrl(item);
  open.textContent = item.kind === "youtube" ? "Open on YouTube" : "Open on Twitch";
  actions.append(button, open);
  article.append(slot, note, actions);
  return article;
}

function renderHomeClips(root, items) {
  if (!items.length) {
    const empty = document.createElement("p");
    empty.className = "empty";
    empty.textContent = "No videos are saved yet.";
    root.replaceChildren(empty);
    return;
  }
  root.replaceChildren(...items.map(homeClipLink));
}

function renderClipList(root, items, kind) {
  if (!items.length) {
    const empty = document.createElement("p");
    empty.className = "empty";
    empty.textContent = kind === "youtube"
      ? "No YouTube videos are saved yet."
      : "No Twitch clips are saved yet.";
    root.replaceChildren(empty);
    return;
  }
  root.replaceChildren(...items.map(clipCard));
}

function isLocalLogo(value) {
  return typeof value === "string" && /^\/assets\/[A-Za-z0-9._/-]+$/.test(value) && !value.includes("..");
}

function renderSponsors(data) {
  const root = document.getElementById("sponsor-list");
  if (!root || !data || !Array.isArray(data.sponsors) || data.sponsors.length === 0) return;
  const list = document.createElement("ul");
  list.className = "link-list";
  for (const sponsor of data.sponsors) {
    if (!sponsor || typeof sponsor.name !== "string" || !sponsor.name.trim()) continue;
    const item = document.createElement("li");
    const row = document.createElement(sponsor.url && isHttpUrl(sponsor.url) ? "a" : "div");
    row.className = sponsor.url && isHttpUrl(sponsor.url) ? "link-row" : "link-row is-static";
    if (row.tagName === "A") row.href = sponsor.url;
    const copy = document.createElement("span");
    copy.className = "link-copy";
    const name = document.createElement("span");
    name.className = "link-url";
    name.textContent = sponsor.name.trim();
    copy.append(name);
    if (typeof sponsor.note === "string" && sponsor.note.trim()) {
      const note = document.createElement("span");
      note.className = "link-kicker";
      note.textContent = sponsor.note.trim();
      copy.append(note);
    }
    row.append(copy);
    if (isLocalLogo(sponsor.logo)) {
      const image = document.createElement("img");
      image.src = sponsor.logo;
      image.alt = "";
      image.width = 120;
      image.height = 48;
      row.prepend(image);
    }
    item.append(row);
    list.append(item);
  }
  if (list.childElementCount) root.replaceChildren(list);
}

async function configTask() {
  if (!document.querySelector("[data-email], [data-impressum-name], #discord-row")) return;
  try {
    applyConfig(await loadJson("/data/site.json"));
  } catch {
    // The HTML already shows the same configured values.
  }
}

async function liveTask() {
  const root = document.getElementById("live-badge");
  if (!root) return;
  try {
    renderLive(await loadJson("/data/live.json"));
  } catch {
    root.replaceChildren();
  }
}

async function scheduleTask() {
  const next = document.getElementById("next-stream");
  const page = document.getElementById("schedule-root");
  if (!next && !page) return;
  try {
    const model = buildSchedule(await loadJson("/data/schedule.json"), new Date());
    if (next) renderNext(model);
    if (page) renderSchedulePage(model);
  } catch {
    const message = document.createElement("p");
    message.textContent = "The schedule could not be loaded.";
    if (next) next.replaceChildren(message.cloneNode(true));
    if (page) page.replaceChildren(message);
  }
}

async function clipsTask() {
  const home = document.getElementById("home-clips");
  const youtube = document.getElementById("youtube-clips");
  const twitch = document.getElementById("twitch-clips");
  if (!home && !youtube && !twitch) return;
  try {
    const data = await loadJson("/data/clips.json");
    const yt = normalizeClips(data.youtube, "youtube").sort(byNewest);
    const tw = normalizeClips(data.twitch, "twitch").sort(byNewest);
    if (home) renderHomeClips(home, [...yt, ...tw].sort(byNewest).slice(0, 3));
    if (youtube) renderClipList(youtube, yt.slice(0, 6), "youtube");
    if (twitch) renderClipList(twitch, tw.slice(0, 6), "twitch");
    const stamp = document.getElementById("clips-updated");
    if (stamp && data.updatedAt) {
      const label = formatDay(data.updatedAt);
      if (label) stamp.textContent = `List updated ${label}.`;
    }
  } catch {
    // Fallback copy in the HTML stays in place.
  }
}

async function sponsorsTask() {
  if (!document.getElementById("sponsor-list")) return;
  try {
    renderSponsors(await loadJson("/data/sponsors.json"));
  } catch {
    // The empty state in the HTML stays in place.
  }
}

setupNav();
Promise.allSettled([
  configTask(),
  liveTask(),
  scheduleTask(),
  clipsTask(),
  sponsorsTask()
]).finally(() => {
  document.documentElement.dataset.ready = "true";
});
