---
name: supabase-data-guard
description: Guards Khutwa Supabase writes, store.commit rollback, phone validation, honeypot, HTML escaping, and CSS urls. Use before editing js/data.js, js/forms.js, js/supabase.js, js/admin.js, js/views.js, js/components.js, or supabase-setup.sql, and whenever a change saves or renders registrations, joins, orders, check-ins, or settings.
---

# Supabase data guard

Read this before changing any file that saves or renders Khutwa data. Visual CSS may change. Data contracts below may not.

## Do not change

- Table names: `content`, `registrations`, `join_requests`, `orders`, `checkins`, `admins`.
- `TABLE_MAP`: joins → `join_requests`, regs → `registrations`.
- RLS policies or the organizer email in `supabase-setup.sql`.
- `store.commit`: clone `db` and `snap`, mutate, `syncToSupabase`, and on failure restore both, `report(err,'e_save')`, then rethrow. Remote partial writes are not rolled back.
- Challenge storage: only `store.db.set.challenge.done` and `.goal` inside the existing `set` jsonb. No new table. Invalid or missing values fall back to 312 and 500 via `boundedNumber` / `challengeBar()`.
- `peopleGen`: increment in `loadPeopleFromSupabase` and drop stale responses.
- People queries stay `.limit(1000)`.

Leave `js/data.js`, `js/supabase.js`, and `supabase-setup.sql` untouched unless a UI edit breaks one of these contracts.

## Public writes

Join, registration, shop, and check-in forms include honeypot `input.hp` with `name=hp`, `tabindex="-1"`, `autocomplete="off"`, `aria-hidden="true"`. If `data.hp` is set, return silently.

Phone path: `normPhone` (Arabic digits, Libya `9xxxxxxxx` → `218…`) then `isServerPhone` `/^[0-9]{7,15}$/`. Reject anything else with `e_valid` before commit.

Dates that fail parsing abort the whole save with `e_valid`. Do not drop the bad field and save the rest.

## Render

- Text in HTML goes through `E()`.
- Links through `U()` and only `http:` / `https:`.
- CSS image urls through `cssUrl`: `https?` or `blob`, no quotes, parentheses, or whitespace. Empty string if the test fails.
- Do not interpolate a caller class or status into an attribute unless it is a fixed token (`ok` or `err`).
- Empty exports toast `empty` and do not download a file. `saveBlob` revokes the object URL after 1500ms.

## Check before saving

- [ ] No new table, column rename, or RLS edit
- [ ] Challenge still lives in `set.challenge` with 312/500 fallback
- [ ] `commit` still restores local `db` and `snap` on failure
- [ ] Honeypot still short-circuits public forms
- [ ] Phone still matches `/^[0-9]{7,15}$/` after `normPhone`
- [ ] New markup uses `E()`, `U()`, and `cssUrl`
