# VTuber Conventions

Unofficial convention schedules with performer search, day, stage and meet-and-greet filters, and calendar downloads.

**[Website](https://uebagi.github.io/Vtuber-Conventions/)** · **[VeXpo 2026 schedule](https://uebagi.github.io/Vtuber-Conventions/vexpo-2026/)**

## Features

- Search sessions and announced participants.
- Filter by date, location, announced sessions, concerts, meet-and-greets, or official/unofficial status.
- View lineup notes and links to official sources.
- Download one session or the filtered schedule as an `.ics` calendar file.
- Download the schedule as CSV.

Dates use US formatting. Session times stay in the convention's local timezone; VeXpo uses British Summer Time (UTC+1). Calendar files preserve the event's instant in time and display in your calendar app's configured timezone. Downloads are snapshots, not subscriptions.

## Run locally

From the repository root:

```sh
python -m http.server 8000
```

Open [localhost:8000](http://localhost:8000/) or the [local VeXpo schedule](http://localhost:8000/vexpo-2026/). Keep the server running. Opening the HTML file directly does not reliably allow the browser to load its CSV.

No package installation or build step is required.

## Project structure

```text
index.html                  Convention index
assets/                     Shared JavaScript and CSS
vexpo-2026/
  index.html                Event page and settings
  schedule.csv              Data used by the website
  sources/                  Research notes
.github/workflows/pages.yml GitHub Pages deployment
```

## Update a schedule

Edit the convention's `schedule.csv`. The website reads it directly; `sources/participants.json` is a research snapshot, not the website's data source. Keep the snapshot aligned when changing researched participant information.

| Field | Format |
| --- | --- |
| `date` | ISO date, such as `2026-09-18` |
| `day` | Weekday name, such as `Friday` |
| `start_time`, `end_time` | Local 24-hour time, such as `20:00` |
| `timezone` | Timezone identifier, such as `Europe/London` |
| `timezone_abbreviation` | Display label, such as `BST` |
| `utc_offset` | Offset applicable on the event date, such as `+01:00` |
| `participants`, `participant_source_urls` | Semicolon-separated values |
| `lineup_status` | `unannounced`, `partial`, or `named lineup published` |
| `is_concert`, `is_meet_greet` | `true` or `false` |
| `event_status` | `official` or `unofficial` (all current VeXpo entries are official) |
| `meet_greet_type`, `price`, `booth` | Published meet-and-greet format, price, and booth |
| `concert_classification_notes` | Reason for including or excluding the session |

Preserve the remaining columns and CSV quoting. The current calendar exporter assumes sessions start and end on the same local date. Update the date in the convention page's footer after checking its information.

The concerts filter includes primarily musical performances, singing competitions, karaoke, and concert screenings. Classification is based on session descriptions, not official categories. Unannounced sessions are excluded until their contents are known.

## Add a convention

1. Create a folder at the repository root, such as `another-con-2027/`.
2. Copy `vexpo-2026/index.html` into it and create `schedule.csv` with the existing columns.
3. Update the page title, event details, official link, timezone label, and footer.
4. Set the `<body>` attributes `data-event-name`, `data-event-id`, and `data-venue`. Use a unique event ID. Remove `data-uid-domain` from the copied page; VeXpo retains it to preserve previously exported calendar IDs.
5. Add a link to the new convention in the root `index.html`.

Dates and stage options are generated from each CSV. Shared assets use relative paths, so convention pages work under the GitHub repository URL.

## Deployment

Pushes to `main` automatically deploy through [GitHub Actions](https://github.com/uebagi/Vtuber-Conventions/actions/workflows/pages.yml). The workflow can also be started manually from that page.

Deployment includes the root index, shared assets, and the `index.html` and `schedule.csv` files from each convention folder. Research files in `sources/` are available in this public repository but are not included in the Pages deployment.

For a fork, select **Settings → Pages → Build and deployment → GitHub Actions**, and update the links in this README to your own site.

## Meet & greets and event tags

The VeXpo schedule includes 98 availability windows from the [official meet-and-greet page](https://vexpo.uk/meet-greets), checked September 5, 2026. These are the published talent availability windows, not individual appointment durations. Cards and calendar exports include the listed price, booth, and Virtual / IRL / Penplotter format. Booking requirements still apply, including to free listings.

**Meet & greets only** and **Concerts only** are mutually exclusive filters. Date, search, location and status filters combine with either one, and calendar downloads export the displayed results.

Official/unofficial tags describe the event, not this independent planner. All imported VeXpo events are tagged official. Future community events can be tagged unofficial; missing status is displayed as unconfirmed.

The source page contains duplicate tables. The import uses the first Saturday table set and the explicitly labeled Sunday table set. The Sunday 10:30–11:30 booth 5 slot is Phoebe Chan in the Sunday section but Féileacán Cú in an earlier duplicate; its notes flag that conflict. `sources/meet-greets.json` records the selected source rows.

Downloaded poster images have been removed from the current repository tree. Official poster URLs remain as citations; earlier commits still contain the old files.
