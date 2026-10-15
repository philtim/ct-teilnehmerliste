# ADR-009: ChurchTools permissions decide what the list shows

- **Status:** Accepted
- **Date:** 2026-10-15
- **Decided by:** Philipp Timmalog

## Context

The list is personal data by design: names, addresses, e-mail addresses,
whatever the group's own fields hold (a camp's health insurance, allergies).
It is meant for people who prepare an event and already see this data in
ChurchTools — and only for what they see there.

## Decision

- **No permission model of its own.** Every request runs in the viewer's
  ChurchTools session. The group search lists the groups ChurchTools returns;
  the members, persons and fields are what the API returns to this viewer.
  Who may open the extension at all is the module permission an admin grants
  in ChurchTools.
- **Withheld data is shown as withheld, not guessed.** A member whose person
  record is not returned stays on the list with name and link only, and the
  preview says how many. A person field the API did not send for any listed
  person is not offered as a column.
- **The relationship list is read whole and reduced at once.**
  `GET /persons/relationships` has no person filter, so it returns every
  relationship the viewer may see. Only the edges between listed people (and a
  listed child's parents) survive `memberEdges`; nothing else is kept or shown.
- **The only thing stored is the column choice** — column ids per group id,
  in the extension's KV-Store. No personal data is written anywhere. A viewer
  without rights on the KV-Store gets a choice that lasts for the session.
- **Nothing installation-specific in the source.** Group types, statuses,
  roles, fields and relationship types are read at runtime; the labels of
  ChurchTools' own built-in keys (`familystatus.married`) are the only fixed
  vocabulary.

## Consequences

- The extension runs unchanged at any congregation, without configuration.
- It cannot show anyone more than ChurchTools already does.
- The downloaded file is outside ChurchTools' control. That is the point of
  it, and the responsibility of whoever downloads it.
