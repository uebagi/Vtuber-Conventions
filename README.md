# VTuber Conventions

A static site for convention schedules, participant socials, filters, and calendar downloads. Each convention lives in its own folder under `conventions/` and uses shared JavaScript and CSS.

[Website](https://uebagi.github.io/Vtuber-Conventions/)

## Add a convention

1. Create a folder under `conventions/` using a unique slug, such as `conventions/example-con-2027/`.
2. Copy an existing convention's `index.html` into the folder. Create a new `schedule.csv` using the same column headers.
3. Update the HTML title, description, convention name, dates, venue, official schedule link, timezone label, and footer.
4. Configure the page's `<body>` attributes as shown below. Remove any copied `data-uid-domain` attribute; new conventions use their event ID for calendar IDs.
5. Add an optional `socials.json` for participant links. Omit `data-socials` if you do not have a social map.
6. Copy a convention card in the root `index.html` and update its link to `conventions/<slug>/`, name, dates, and location.
7. Preview the page locally and check its filters, source links, and calendar downloads before pushing to `main`.

```html
<body
  data-event-name="Example Con"
  data-event-id="example-con-2027"
  data-venue="Convention Centre, City, Country"
  data-socials="socials.json">
```

Keep the shared asset paths as `../../assets/app.js` and `../../assets/styles.css`, and the convention page's home link as `../../`. Dates and location filter options are generated from the CSV. Use a new folder and event ID for each year's convention.

## Project layout

```text
index.html                   Convention directory
assets/                      Shared JavaScript and CSS
conventions/
  index.html                 Redirect to the site home page
  example-con-2027/           One folder per convention edition
    index.html               Page markup and event settings
    schedule.csv             Schedule read by the website
    opening-hours.json       Optional daily entry hours
    socials.json             Optional participant links
    sources/                 Optional research and source notes
scripts/build-site.cjs       Site packaging and legacy redirects
tests/                      Schedule and packaging checks
.github/workflows/pages.yml  GitHub Pages deployment
tmp/                         Ignored local reference files
```

## Opening hours

Add an optional `opening-hours.json` to each convention folder and set `data-opening-hours="opening-hours.json"` on its `<body>`. Keep the `#opening-hours` section from the template; shared JavaScript renders the daily cards above the filters. Omit the attribute for conventions without entry hours. On phones (up to 760px wide), hours start collapsed and the heading button expands or collapses them. Larger screens always show the hours.

```json
{
  "timezone": "Europe/London",
  "days": [
    {
      "date": "2027-09-18",
      "entries": [
        { "label": "General Entry", "opens": "10:00", "closes": "18:00" }
      ]
    }
  ]
}
```

Use ISO dates and local 24-hour times in the stated timezone. Add one entry per admission type. Weekdays and US-formatted dates are generated automatically. Entry hours belong in this JSON, not as sessions in `schedule.csv`. They appear only in the top cards and are excluded from session filters and calendar downloads. Concerts remain regular schedule sessions. Deployment includes the optional JSON automatically.

## Maintain the schedule

Edit the convention's `schedule.csv`. Save it as UTF-8 with the existing column names. Quote fields containing commas, quotes, or newlines; double any quotes inside quoted fields.

| Columns | Values |
| --- | --- |
| `date`, `day` | ISO date (`2027-09-18`) and matching weekday (`Saturday`) |
| `start_time`, `end_time` | Local 24-hour times (`14:00`, `14:55`) |
| `timezone` | Timezone identifier, such as `Europe/London` |
| `timezone_abbreviation`, `utc_offset` | Local label and offset applicable on that date, such as `BST`, `+01:00` |
| `stage` | Stage, room, or booth name; used by the location filter |
| `event_type` | Optional `opening` or `closing` for a single-time schedule marker; leave empty for regular sessions |
| `event` | Session title; `???` displays as “To be announced” |
| `source_url` | Published source URL for the session |
| `listed_hosts` | Hosts as listed by the source |
| `participants` | Individual names separated by semicolons |
| `lineup_status` | `unannounced`, `partial`, `named lineup published`, or `announced` for entry/closing markers |
| `lineup_notes` | Lineup details, restrictions, and unresolved source conflicts |
| `participant_source_urls` | Source URLs separated by semicolons; falls back to `source_url` when empty |
| `is_concert`, `is_meet_greet` | Lowercase `true` or `false` for each filter |
| `concert_classification_notes` | Reason for the concert classification |
| `event_status` | `official` or `unofficial`; missing values display as unconfirmed |
| `organizer` | Optional organizer/group name; use the same spelling on all of its sessions |
| `meet_greet_type`, `price`, `booth` | Meet-and-greet format, published price, and booth; otherwise leave empty |

Use one row per published slot. Keep shared meet-and-greet slots together, with each participant listed separately in `participants`. Record whether times describe availability windows or individual appointments. Use `Not listed` for an unpublished price; do not assume it is free.

Official/unofficial labels describe the session's status. Include supporting source links and explain uncertain classifications in the notes. Concert classification is maintained manually through `is_concert`.

The Event status dropdown lists Official & unofficial, Official, Unofficial, then the distinct nonempty `organizer` names from the CSV. Selecting an organizer includes all of its tagged official and unofficial sessions and combines with the other filters and calendar download. Assign it to sessions the group organizes or presents, including its booth events and official stage/panel appearances; do not tag unrelated sessions just because an affiliated performer appears. Leave it empty when there is no specific group to filter by. Adding an organizer requires only data changes, with no HTML or JavaScript edits. Organizer names are also searchable and included in calendar descriptions.

Keep research, transcriptions, and source conflicts in the convention's `sources/` folder. Those files do not drive the website. If you maintain a `sources/participants.json` snapshot, update it alongside the CSV.

### Record sources

For structured research files, use a `sources` list and reference its IDs from each entry in `sessions`. Give each source a unique ID within the file, a public URL, and a `locator` identifying the relevant poster, table, or page section. Multiple sources can share a URL when one post contains several posters.

```json
{
  "sources": [
    {
      "id": "saturday-poster",
      "type": "poster",
      "url": "https://example.org/schedule",
      "locator": "Saturday schedule poster",
      "day": "Saturday"
    }
  ],
  "sessions": [
    {
      "date": "2027-09-18",
      "day": "Saturday",
      "participants": ["Example Performer"],
      "start_time": "14:00",
      "end_time": "14:55",
      "source_ids": ["saturday-poster"]
    }
  ]
}
```

Use `source_ids` for every session and ensure each ID exists in `sources`. Keep public source references independent of local filenames and image hashes. This research format can be reused across conventions; the website still reads `schedule.csv`.

### Dates and calendar exports

The site displays dates in US format and times in the convention's local timezone. Set `utc_offset` for each session's date, accounting for daylight saving time. The exporter uses that offset to produce UTC calendar timestamps; it does not calculate the offset from `timezone`.

Keep admission opening and closing hours in `opening-hours.json`; they are not sessions or calendar events. Concerts remain ordinary timed sessions in the CSV.

Regular sessions currently must start and end on the same local date. Calendar IDs use the event ID (or an existing `data-uid-domain` override), date, start time, and normalized location name. Give simultaneous locations distinct names and keep these identifiers stable when correcting titles or lineups.

Calendar downloads are snapshots, not subscriptions.

## Add participant socials

Create `socials.json` in the convention folder and set `data-socials="socials.json"` on the page. Keys must exactly match the participant names in the CSV, including capitalization and punctuation.

```json
{
  "checked_on": "2027-09-01",
  "profiles": {
    "Example Performer": {
      "x": "https://x.com/example_handle",
      "sources": ["https://example.org/performer"],
      "primary": {
        "url": "https://www.youtube.com/@example_handle",
        "source": "https://example.org/guests"
      }
    },
    "Unconfirmed Performer": {
      "x": null,
      "sources": [],
      "notes": "Account not yet confirmed."
    }
  }
}
```

Replace the example URLs with researched profiles. Start with the convention's guest links and the creator's own website. Check account changes and aliases before using directories or search results. Link to the actual X profile, and keep its supporting sources with the entry. Use `null` when a match is uncertain.

The optional `primary` link appears beside X as YouTube, Twitch, or Website. Use it for the creator link published by the convention. If a participant has multiple spellings in the CSV, add matching map entries pointing to the same account.

## Run locally

From the repository root:

```sh
python -m http.server 8000
```

Open [localhost:8000](http://localhost:8000/) and select a convention. Keep the server running while testing. Opening HTML through `file://` does not reliably allow CSV and JSON loading.

No package installation or build step is required for local browsing. To run the existing functional checks, install Node.js and run:

```sh
node tests/schedule.cjs
node tests/build-site.cjs
```

The tests use the existing schedule as a fixture. Update expected counts and assertions when changing that fixture. For a new convention, also check the page locally: participant links, combined filters, date/time labels, and single-session and filtered calendar downloads.

## Deploy

Pushes to `main` deploy automatically through [GitHub Actions](https://github.com/uebagi/Vtuber-Conventions/actions/workflows/pages.yml). The workflow can also be run manually.

The workflow runs the schedule and packaging checks, then `node scripts/build-site.cjs`. The packaging script discovers `conventions/*/schedule.csv` and publishes each convention's `index.html`, `schedule.csv`, and optional `socials.json` and `opening-hours.json`, along with the root index and shared assets. It excludes `sources/`, `tmp/`, and local agent instructions. Update the script if you introduce additional runtime files.

The script creates a fresh `_site/` directory; it refuses to overwrite an existing output directory. To inspect a packaged preview, use `node scripts/build-site.cjs tmp/site-preview` with a new output path, then `python -m http.server 8001 --directory tmp/site-preview`.

Old convention URLs are preserved by redirects generated only in the published output. The script's `legacySlugs` list identifies folders that previously lived at the repository root; new conventions do not need entries. Redirects preserve query strings and fragments when JavaScript is enabled, and old data download URLs remain available. Existing convention IDs and calendar UIDs stay unchanged.

For a fork, select **Settings → Pages → Build and deployment → GitHub Actions**, then update the website and repository links in this README. Use relative links in the site so it works under the repository's Pages URL.
