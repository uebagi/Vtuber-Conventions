# Kumoricon 2026 research

Checked November 12, 2026 against the organizer's current [schedule](https://www.kumoricon.org/schedule), [content creator profiles](https://www.kumoricon.org/guests/content-creator), [musical guest profiles](https://www.kumoricon.org/guests/musical), [Idol Festival page](https://www.kumoricon.org/idol-festival) and [autograph policies](https://www.kumoricon.org/autographs).

The 36 timed entries comprise 27 meet-and-greet/autograph windows, two VTuber concerts, the Idol Festival hosted by Phoebe Chan, five panels and a fandom meetup. The seven hololive card-game-only sessions were removed in the VTuber scope audit because they do not establish talent attendance. Dates are November 13–15, 2026, Friday through Sunday, in America/Los_Angeles, PST (UTC−08:00).

## Unresolved details

- The Stellar Verse improv panel names the agency without an individual lineup. BEASTIEZ's panel and shared meet-and-greet name the group without individually labelled participants. Memberships do not expand these lineups.
- IMPROMPTUBER names PorcelainMaid but describes three VTubers. Guess That VTuber! names Nemimi Yane without identifying the remaining panelists. Idol Festival confirms Phoebe as MC, without a full attendee performer list.
- Lemi Lichen is explicitly named on the concert poster. Her generic pending card was removed after this timed appearance was confirmed.
- Booth meet-and-greet prices, booking requirements and virtual/in-person formats are not established. No general recording restrictions or international autograph reservation requirements are inferred for these slots. Phoebe's signing price is not published.
- Booth 507 windows overlap by 30 minutes for Chio/Perry, Miwabelle/Mogu and PorcelainMaid/Serena. The published one-hour windows are retained. Separate simultaneous stations have not been established.
- Phoebe's signing has a generic autograph-area location heading, but its description specifies Exhibit Hall Booth 923. The specific booth is used.
- hololive tournaments have generic TCG location headings, but the schedule's added-event notice gives Tabletop Gaming 11 on Friday and 7 on Saturday. These specific locations also distinguish simultaneous learn-to-play slots.
- Waffo and Koko are named workshop hosts whose VTuber identities could not be established. Their credits remain in listed_hosts; they are omitted from participants/Talent and socials.json.
- Some other social matches rely on directories or indexed creator profiles, identified in each profile's sources. X pages were often inaccessible directly; organizer-linked account targets are still documented. Unverified additional group memberships are omitted.

`research.json` retains a CSV-equivalent session snapshot with public source IDs and readable locators. `socials.json` and `groups.json` carry their own account and membership evidence. Direct downloads of the official pages returned HTTP 403; the web reader could read their indexed text. The 82 MB pocket guide could not be opened by that reader. Current organizer HTML was used for session times and updates. No source or promotional images are included in the site.

## Supplied Stellar Verse announcements

The [daily schedules](https://x.com/StellarVersePro/status/2119912923535392843) corroborate Booth 507 starts, the Saturday noon panel and Sunday concert. The [concert announcement](https://x.com/StellarVersePro/status/2119837478085702112) identifies sixteen individual performers, now added to the existing concert row. See `stellar-verse.json` for image locators, transcriptions and source IDs. All existing session dates, start/end times and locations remain unchanged, preserving exported calendar identities.

Perry, Mogu and Serena are printed as 11:30 PM on the daily posters. The [indexed agency correction](https://www.sotwe.com/StellarVersePro?lang=en) says these labels should be 11:30 AM, matching the convention schedule. The posters supply no end times; existing ends remain sourced to the official schedule. Source images were inspected locally and remain under ignored `tmp/`.

## VTuber scope audit

Removed seven card-game-only listings without confirmed VTuber appearances. The Live2D workshop remains because it specifically teaches VTuber model creation; Waffo and Koko remain credited as hosts and are no longer treated as verified VTuber Talent. Existing kept event times, locations and calendar identities are unchanged.
