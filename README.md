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

The JSON in the repo is a starter week. Replace it with the real slots before treating it as the public calendar.

## Sponsors

`data/sponsors.json` is a list. An empty list shows the empty state. Each item can have `name`, `url`, and `note`. An optional `logo` must be a file path under `/assets/` in this repo, not a remote image.

## Config

`data/site.json` is the single place for the business inbox, the Impressum name, and the Impressum address.

- `businessEmail` is `dad@westyyy.gg`. It is used for partnerships and for the Impressum.
- `impressumName` is `[NAME]` and `impressumAddress` is `[ADDRESS]` until the real details are ready.
- `discordInvite` is empty, so the links page says the Discord is coming soon. Set an `https://discord.gg/...` or `https://discord.com/...` URL when the invite exists. `discordName` is `w for westyyy`.
- `youtubeChannelId` is the channel behind `@westyyywest`.
- `twitchLogin` is `westyyy__rl`.

The same email and placeholders are also written into the HTML so the legal pages still read with JavaScript off. If you change the email or the placeholders, update `data/site.json` and the matching text in `impressum/index.html` and `sponsors/index.html`.

The age on the home and about pages is written as 10. Change it by hand when it changes.

## Live data

`.github/workflows/update-live-data.yml` runs about every 10 minutes, and it can also be started by hand.

It reads Twitch with the Helix API (app token, client credentials) and the public YouTube RSS feed. It writes `data/live.json`, `data/clips.json`, and copies thumbnails into `assets/thumbs/` so the browser does not request those images from Twitch or YouTube.

Repository secrets, under Settings → Secrets and variables → Actions:

- `TWITCH_CLIENT_ID`
- `TWITCH_CLIENT_SECRET`

Create them in the Twitch developer console for an application that can use the client-credentials grant. No user token is required.

If either secret is missing, `scripts/update-live-data.mjs` exits successfully and leaves the JSON files as they are. The site then keeps showing the offline state, the schedule, and the links. It does not show a live-badge failure.

The workflow commits only when the live fields, the clip list, or a thumbnail actually change. A new timestamp alone does not create a commit. While a stream is live, the viewer count can change often enough to commit on later runs.

The checked-in `data/live.json` is offline. `data/examples/live-online.json` is only a sample for screenshots. The site does not load it.

## Privacy

No analytics, no cookies, no comments, and no forms. Fonts are self-hosted (Barlow and Barlow Condensed, SIL Open Font License, see `assets/fonts/`).

YouTube and Twitch players stay unloaded until a visitor clicks. The click is labelled as a request to that service. Thumbnails on the site are files in this repo.

## Colour tokens

Defined once in `css/styles.css`.

| Token | Hex | Use |
| --- | --- | --- |
| `--green` | `#015D47` | Page background, forest green |
| `--green-deep` | `#01382B` | Footer, cards, solid green blocks |
| `--orange` | `#FD650A` | Mandarin blocks |
| `--orange-hover` | `#E45C08` | Pressed state on an orange control |
| `--yellow` | `#E0F354` | Crest yellow: wordmark, headlines on green, live badge, buttons |
| `--yellow-hover` | `#D4E44A` | Button and link hover |
| `--yellow-press` | `#C6D63A` | Button press |
| `--ink` | `#1A140C` | Text on orange and on yellow |
| `--cream` | `#F4F1E6` | Body text on green |
| `--cream-muted` | `#D5E0D2` | Secondary text on green |

Yellow is not used as text on orange, and orange is not used as text on green. Those pairs are below WCAG AA. Headlines on orange blocks are ink. Headlines on green are yellow.

## Editing rules

- Write westyyy in lowercase, including at the start of a sentence and in titles.
- Do not add a surname, a town, a place of education, a phone number, or a personal inbox. The Impressum placeholders are the exception for the name and the street address. The only email is `dad@westyyy.gg`.
- Do not name an organisation he plays for. He is a free agent.
- Keep the rank lines exactly as they are on the about page: `1s Champion 1 (1000 MMR)` and `2s Grand Champion 1 (1500+ MMR)`.
- The German flag is the only flag, and it is only used where the country is stated.
- Do not add a CNAME file, and do not turn on GitHub Pages from this repo until the owners ask.

`node scripts/check-content.mjs` checks those rules. `node scripts/test-time.mjs` checks the time-zone conversion.
