# OTC3000

OTC3000 records office attendance for one person, one Android phone, one office, and one Wi-Fi network (Neetrino_5). The phone's Automation app calls this server when that network is joined or left. The server does not detect Wi-Fi itself. It stores the two HTTP calls and assigns the event time.

Phase 1 is the Next.js application, the Neon database, and the presence API. Phase 2 derives statistics from that event log. The attendance screens read those statistics.

## Screens

`/` redirects to `/dashboard`. The screen reads `Asia/Yerevan` from the server, so clock labels do not follow the viewer's timezone.

- `/dashboard`
- `/history`
- `/history/[date]`
- `/calendar`
- `/statistics`

## Endpoints

These paths must stay exactly as they are. Automation is already configured to call them, and this phase leaves them unauthenticated so those existing phone rules keep working.

- `POST /presence/enter`
- `POST /presence/exit`

`GET /api/presence/status` is only a verification endpoint. It is not a substitute for the phone calls.

A duplicate enter or exit is still a success. The response sets `recorded` to `false` and includes `reason`. Nothing is inserted.

When two events have the same timestamp, the later row is the one with the greater `id`. Overlapping requests take one database lock inside a transaction, so they cannot both insert from the same previous state.

## Statistics

Statistics are calculated from the presence event log when a report is requested. Derived totals are not stored. These read routes are unauthenticated for now, same as the presence API.

A business day runs from local midnight to the next local midnight in `Asia/Yerevan`. The interval is half-open, so an instant exactly at midnight belongs to the new day. Weeks start on Monday and always contain seven dates. A month is the calendar month in that timezone.

Office time is the overlap between each presence session and that business day. An open session ends at the current time. A session that crosses midnight is split there: the first day has no last exit, and the next day can have office time with no arrival and no visit.

Outside time counts only the gaps between that day's office slices. Time before the first slice and after the last slice is not outside time, so one continuous slice has none. Visits are `ENTER` events whose own timestamp falls on that business date. They are not the number of slices.

Durations in the JSON are milliseconds.

- `GET /api/stats/today` — the Yerevan business date of the request
- `GET /api/stats/week` — Monday through Sunday. Optional `date=YYYY-MM-DD` selects another week.
- `GET /api/stats/month` — the calendar month. Optional `date=YYYY-MM-DD` selects another month.
- `GET /api/stats/range?from=YYYY-MM-DD&to=YYYY-MM-DD` — both dates are required and inclusive

The inclusive range can be at most 366 days. A date that is not a real `YYYY-MM-DD` day, a reversed range, or a longer range returns 400 with `invalid_range`. A range with no events returns one zeroed day per date.

```bash
curl.exe -s http://127.0.0.1:3000/api/stats/today
```

## Requirements

- Node.js 22.20.0 was used for this project. Prisma 7 requires Node.js 20.19+, 22.12+, or 24+.
- `DATABASE_URL`: pooled Neon connection (the hostname contains `-pooler`). Runtime queries use it.
- `DIRECT_URL`: direct Neon connection. Prisma migrations use it.

Copy `.env.example` to `.env` and fill in both values. Do not commit `.env`.

The business timezone is `Asia/Yerevan` (`src/lib/timezone.ts`). Events are stored as absolute `timestamptz` values. Status timestamps are rendered in that timezone with a numeric UTC offset.

## Local development

```bash
npm install
npx prisma migrate dev
npm run dev
```

Open `http://127.0.0.1:3000/`. It redirects to the dashboard.

`npm install` generates the Prisma client. `npx prisma migrate dev` creates and applies migrations on the direct connection.

## Coolify

Production is one Next.js app on Coolify at `https://otc3000.neetrino.com`, using the external Neon database. There is no database container.

Apply committed migrations with:

```bash
npx prisma migrate deploy
```

Run that against the same Neon database configured in `DIRECT_URL`. The install step generates the Prisma client.

## Checks

```bash
curl.exe -s -X POST http://127.0.0.1:3000/presence/enter
curl.exe -s -X POST http://127.0.0.1:3000/presence/exit
curl.exe -s http://127.0.0.1:3000/api/presence/status
curl.exe -s http://127.0.0.1:3000/api/stats/today
npm test
npm run lint
npm run build
```

## Scope

One person, one phone, one office, and one Wi-Fi network. The event log is append-only. Statistics are derived from these events when a report is requested. The screens are `/dashboard`, `/history`, `/calendar`, and `/statistics`.
