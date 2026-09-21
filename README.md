# מי מכיר את מוריס?

Live quiz show for five sectors — a projector screen, a host console, and the
reps' own phones as buzzers. Everything runs on one laptop; there is no database
and no cloud service.

## Running it

Double-click `start-server.bat`. It builds, prints the three URLs, and starts the
server. The phone URL uses whatever IP the laptop has today.

| Screen | URL | Runs on |
| --- | --- | --- |
| Projector | `/screen` | laptop, second display |
| Host console | `/host` | laptop |
| Rep buzzer | `/play` | each rep's phone |
| Content editor | `/host/content` | laptop, before the show |

The reps' phones must be on the same Wi-Fi as the laptop. `/screen` shows a QR
code during the boarding stage that points at `/play`.

## State

The game lives in `data/state.json`, rewritten after every change. Closing the
window, restarting the server, or refreshing any browser does not lose scores —
each device picks the game back up where it was. Reps stay joined across a
refresh because their phone remembers its sector.

To wipe scores and start over, use **איפוס משחק** on the host console.

Because the state is held in the server process, this has to run as one
long-lived server. It will not work on Vercel or any serverless host, where each
request would get its own empty copy.

## Content

The 20 trivia questions, 5 true/false stories, and 8 speech trap words ship in
`lib/seedContent.ts` and are copied into `data/state.json` the first time the
server starts. Edit them live at `/host/content`; edits go to the state file, not
back to the seed. Delete `data/state.json` to start again from the seed.

Answers never leave the server — `/play` only ever receives the game state and
the scoreboard, never the question bank.

## Before the show

- Test with a **real phone on the venue's Wi-Fi**. Some corporate networks block
  device-to-device traffic entirely, which no change here can work around.
- If Windows asks about firewall access for Node, allow it for that network.
- `NEXT_PUBLIC_HOST_KEY` in `.env.local` gates the host screens. It defaults to
  `morris`; change it if the URL will be visible to the audience.
