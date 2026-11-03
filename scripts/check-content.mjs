import { readFile, readdir, stat } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, join, extname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const failures = [];

function fail(message) {
  failures.push(message);
}

const skipDir = new Set([".git", "assets/thumbs", "node_modules"]);
const textExt = new Set([".html", ".css", ".js", ".mjs", ".json", ".md", ".yml", ".yaml", ".svg", ".txt", ".xml"]);

async function walk(dir, rel = "") {
  const entries = await readdir(dir);
  const files = [];
  for (const name of entries) {
    const path = join(dir, name);
    const relative = rel ? `${rel}/${name}` : name;
    if (skipDir.has(relative) || skipDir.has(name)) continue;
    const info = await stat(path);
    if (info.isDirectory()) {
      files.push(...await walk(path, relative));
    } else if (textExt.has(extname(name))) {
      files.push(relative);
    }
  }
  return files;
}

function lineOf(text, index) {
  return text.slice(0, index).split("\n").length;
}

const files = await walk(root);
const skipScan = new Set(["data/clips.json", "data/live.json"]);

for (const relative of files) {
  if (skipScan.has(relative) || relative.startsWith("assets/fonts/OFL") || relative === "scripts/check-content.mjs") continue;
  const text = await readFile(join(root, relative), "utf8");

  const wrongCase = new RegExp(`${"West"}yyy|${"WEST"}YYY`, "g");
  const bannedWord = new RegExp(`\\b${"gr"}ind\\b`, "gi");
  const campus = new RegExp(`\\b${"sch"}ool\\b`, "gi");
  for (const match of text.matchAll(wrongCase)) {
    fail(`${relative}:${lineOf(text, match.index)} uses the name in the wrong case`);
  }
  for (const match of text.matchAll(bannedWord)) {
    fail(`${relative}:${lineOf(text, match.index)} uses a banned word`);
  }
  for (const match of text.matchAll(campus)) {
    fail(`${relative}:${lineOf(text, match.index)} mentions a place of education`);
  }
  for (const match of text.matchAll(/(?<!Europe\/)Berlin/g)) {
    fail(`${relative}:${lineOf(text, match.index)} names a city`);
  }
  for (const match of text.matchAll(/\b(tel:|\+\d{6,})\b/gi)) {
    fail(`${relative}:${lineOf(text, match.index)} looks like a phone number`);
  }
  for (const match of text.matchAll(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi)) {
    if (match[0].toLowerCase() !== "dad@westyyy.gg") {
      fail(`${relative}:${lineOf(text, match.index)} has an unexpected email ${match[0]}`);
    }
  }
  for (const match of text.matchAll(/\p{Regional_Indicator}{2}/gu)) {
    if (match[0] !== "🇩🇪") fail(`${relative}:${lineOf(text, match.index)} has a flag other than Germany`);
  }
  if (relative.endsWith(".html") && /<iframe\b/i.test(text)) {
    fail(`${relative} includes an iframe in the HTML`);
  }
  if (relative.endsWith(".html") && /<form\b/i.test(text)) {
    fail(`${relative} includes a form`);
  }
  if (/fonts\.googleapis|fonts\.gstatic|googletagmanager|google-analytics|gtag\(|localStorage|sessionStorage|document\.cookie/i.test(text)) {
    fail(`${relative} references tracking, storage, or a third-party font host`);
  }
}

if (existsSync(join(root, "CNAME"))) fail("CNAME must not be added");

const about = await readFile(join(root, "about/index.html"), "utf8");
if (!about.includes("1s Champion 1 (1000 MMR)")) fail("about page is missing the 1s rank line");
if (!about.includes("2s Grand Champion 1 (1500+ MMR)")) fail("about page is missing the 2s rank line");
if (!about.includes("free agent")) fail("about page should say free agent");

const config = JSON.parse(await readFile(join(root, "data/site.json"), "utf8"));
if (config.businessEmail !== "dad@westyyy.gg") fail("business email config drifted");
if (config.impressumName !== "[NAME]") fail("impressum name placeholder drifted");
if (config.impressumAddress !== "[ADDRESS]") fail("impressum address placeholder drifted");
if (!/^UC[A-Za-z0-9_-]{22}$/.test(config.youtubeChannelId)) fail("youtube channel id is missing");

const impressum = await readFile(join(root, "impressum/index.html"), "utf8");
const sponsors = await readFile(join(root, "sponsors/index.html"), "utf8");
for (const [name, text] of [["impressum", impressum], ["sponsors", sponsors]]) {
  if (!text.includes("dad@westyyy.gg")) fail(`${name} page is missing the business email`);
}
if (!impressum.includes("[NAME]") || !impressum.includes("[ADDRESS]")) {
  fail("impressum placeholders are missing");
}
if (config.discordInvite === "" && !(await readFile(join(root, "links/index.html"), "utf8")).includes("Coming soon")) {
  fail("empty Discord invite should render as coming soon");
}

const css = await readFile(join(root, "css/styles.css"), "utf8");
const allowed = new Set([
  "#015D47",
  "#01382B",
  "#FD650A",
  "#E45C08",
  "#E0F354",
  "#D4E44A",
  "#C6D63A",
  "#1A140C",
  "#F4F1E6",
  "#D5E0D2"
]);
for (const match of css.matchAll(/#[0-9A-Fa-f]{3,8}/g)) {
  const value = match[0];
  const canonical = value.length === 4
    ? value
    : `#${value.slice(1).toUpperCase()}`;
  const normalized = value.length === 4 ? value.toLowerCase() : canonical;
  if (!allowed.has(value) && !allowed.has(value.toUpperCase()) && !allowed.has(normalized) && !allowed.has(canonical)) {
    fail(`css/styles.css has an undeclared colour ${value}`);
  }
}

if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}
console.log(`content check passed (${files.length} text files)`);
