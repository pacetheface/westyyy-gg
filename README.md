# westyyy.gg

Static site for westyyy, a 10-year-old Rocket League player from Germany. Plain HTML, CSS, and JavaScript. No framework and no build step. GitHub Pages is not turned on yet, and this repo has no CNAME file.

The site is meant to be served from the domain root (`https://westyyy.gg/`).

## Preview

```bash
node scripts/serve.mjs
```

Open `http://127.0.0.1:4173`. Unknown paths serve `404.html`, which is what GitHub Pages does.

## Schedule

Edit `data/schedule.json`. Refresh the page. There is no build.

- `timezone` stays `Europe/Berlin`. The site turns each wall-clock time into the visitor's time zone.
- `weekly` repeats. `day` is `monday` through `sunday`. `start` and `end` are 24-hour `HH:MM`.
- `oneOff` is one civil date, `YYYY-MM-DD`, with the same kind of start and end. A date that has already ended is hidden.
- `title` is the line on the schedule.

Leave `weekly` and `oneOff` as empty arrays until the real times are known. An empty file hides the schedule on the site. Times are wall-clock times in Europe/Berlin.

## Sponsors

`data/sponsors.json` is a list. An empty list shows the empty state. Each item can have `name`, `url`, and `note`. An optional `logo` must be a file path under `/assets/` in this repo, not a remote image.

## Config

`data/site.json` is the single place for the business inbox, the Impressum name, and the Impressum address.

- `businessEmail` is `dad@westyyy.gg`. It is used for partnerships and for the Impressum.
- `impressumName` is `[NAME]` and `impressumAddress` is `[ADDRESS]` until the real details are ready.
- `discordInvite` is empty, so the links page says the Discord is coming soon. Set an `https://discord.gg/...` or `https://discord.com/...` URL when the invite exists. `discordName` is `w for westyyy`.
- `youtubeChannelId` is the channel behind `@westyyy__rl`.
- `twitchLogin` is `westyyy__rl`.
- `handles` lists the public profile names. TikTok, YouTube, X, Twitch, and Instagram are all `westyyy__rl`.

The same email and placeholders are also written into the HTML so the legal pages still read with JavaScript off. If you change the email or the placeholders, update `data/site.json` and the matching text in `impressum/index.html` and `sponsors/index.html`.

The age on the home and about pages is written as 10. Change it by hand when it changes.

## Live data

Whether a stream is live is checked in the browser, on load and about every two minutes, at `https://decapi.me/twitch/uptime/westyyy__rl`. A reply that says offline, or any error or timeout, leaves the Watch on Twitch button with no live badge. A live reply shows “LIVE now” and the uptime. No Twitch API secret is required.

`.github/workflows/update-live-data.yml` still runs about every 10 minutes for the public YouTube and Shorts feeds only. It writes `data/clips.json` and copies thumbnails into `assets/thumbs/`. It commits only when that data changes.

## Privacy

No analytics, no cookies, no comments, and no forms. Fonts are self-hosted (Barlow and Barlow Condensed, SIL Open Font License, see `assets/fonts/`).

YouTube and Twitch players stay unloaded until a visitor clicks. The click is labelled as a request to that service. Thumbnails on the site are files in this repo.

## Colour tokens

Defined once in `css/styles.css`.

| Token | Hex | Use |
| --- | --- | --- |
| `--bg` | `#0B1411` | Page background, near-black with a green cast |
| `--surface` | `#17241F` | Cards |
| `--surface-2` | `#1E2C27` | Raised chips, such as the current nav item |
| `--line` | `#31443C` | Hairline borders |
| `--text` | `#F3F6F2` | Off-white body and headlines |
| `--muted` | `#9AADA3` | Secondary text |
| `--green` | `#015D47` | Soft glow behind the hero and section headings |
| `--orange` | `#FD650A` | Soft glow on cards and the next stream |
| `--yellow` | `#E0F354` | Live badge, primary buttons, hover and focus |
| `--yellow-hover` | `#D4E44A` | Button hover |
| `--yellow-press` | `#C6D63A` | Button press |
| `--ink` | `#12110C` | Text on yellow |

Forest green and mandarin sit in the glows, not in solid page blocks. Crest yellow is only the live badge, the primary buttons, and hover or focus.

## Editing rules

- Write westyyy in lowercase, including at the start of a sentence and in titles.
- Do not add a surname, a town, a place of education, a phone number, or a personal inbox. The Impressum placeholders are the exception for the name and the street address. The only email is `dad@westyyy.gg`.
- Do not name an organisation he plays for. He is a free agent.
- Keep the rank lines exactly as `Grand Champ at 9`, `Peak 1s: C1 (1000)`, and `Peak 2s: GC1 (1500+)`.
- The German flag is the only flag, and it is only used where the country is stated.
- Do not add a CNAME file, and do not turn on GitHub Pages from this repo until the owners ask.

`node scripts/check-content.mjs` checks those rules. `node scripts/test-time.mjs` checks the time-zone conversion.
