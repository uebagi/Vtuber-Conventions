# VtuberConventions

A static, unofficial VeXpo 2026 schedule for GitHub Pages. Search participants and sessions, filter by day or stage, and expand a session for lineup notes and official sources. Times stay in British Summer Time (UTC+1), regardless of the viewer's location.

## Preview locally

Run `python -m http.server 8000` in this folder, then open http://localhost:8000. Opening `index.html` directly from disk will not reliably load the CSV.

## Publish on GitHub Pages

1. Push these files to the `main` branch of a GitHub repository.
2. In the repository, open **Settings → Pages → Build and deployment** and choose **GitHub Actions** as the source.
3. Run **Publish schedule to GitHub Pages** from the Actions tab, or push another change to `main`.
4. The workflow's deployment link opens the site.

If your default branch has a different name, update the branch in `.github/workflows/pages.yml`. All site asset paths are relative, so this works under a repository subpath. No build tools or dependencies are needed. Google Fonts are optional; the page uses local fallback fonts if unavailable.

## Update the schedule

The **Concerts only** checkbox uses the CSV's explicit `is_concert` field (`true` or `false`) and also applies to calendar downloads. For this planner, concerts include primarily musical performances: Opening Concert, The VX Factor, Bonnie & Friends, To Hell and Back Again, hololive Meet Karaoke Relay, Maids Of England Stage, PhaseVision (a singing competition), and the hololive concert screening. These classifications are inferred from the official session descriptions, not official event categories. Mixed cosplay showcases, panels, workshops, games and interviews are excluded. Unannounced slots are excluded pending details, not confirmed non-concerts. `concert_classification_notes` records the rationale; the research JSON stores the same flag as a boolean.

Use **Download Calendar (.ics)** on a card to save one event, or the download button above the schedule to export all currently filtered sessions. With filters reset, it exports the full weekend. Import the file into Apple Calendar, Google Calendar, Outlook, or another iCalendar-compatible app. Downloads include performers, lineup notes, locations, and sources. Times are encoded as UTC instants converted from the CSV's British offset; your calendar displays them in its configured timezone. These are snapshots, not automatically updating subscriptions.

Edit `vexpo-2026/schedule.csv` and push. The website reads this file directly; `vexpo-2026/sources/participants.json` is the research snapshot and is not read by the website. Separate participants and source URLs with semicolons inside their CSV fields. Preserve CSV quoting for commas, quotes, and newlines. `lineup_status` supports `unannounced`, `partial`, and `named lineup published`.

Research posters and participant notes are saved under `vexpo-2026/sources/`. The deployment includes the root index, shared assets, and each convention folder containing a schedule.csv and index.html. Research sources are not published. Update the checked date in `vexpo-2026/index.html` after refreshing performer information. The site does not imply that virtual performers are physically attending the venue.

The workflow follows [GitHub's custom Pages workflow documentation](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages).

## Convention folders

- `index.html`: convention index.
- `assets/`: shared schedule JavaScript and styles.
- `vexpo-2026/index.html`: VeXpo page and event settings.
- `vexpo-2026/schedule.csv`: VeXpo schedule.
- `vexpo-2026/sources/`: VeXpo research.

To add a convention, create a sibling folder such as `another-con-2027/`. Copy `vexpo-2026/index.html` into it and add a `schedule.csv` using the same columns. Update the title, event details, official link, timezone label and footer. On the body element, set `data-event-name`, a unique `data-event-id`, and `data-venue`; remove `data-uid-domain` (VeXpo keeps it to preserve existing calendar event IDs). Day controls and headings are generated from the CSV dates. Set each row's timezone and UTC offset for that event date. Add a link to the convention in the root index. The deployment workflow discovers convention folders automatically.

Preview VeXpo at http://localhost:8000/vexpo-2026/ after starting the server at the repository root.
