# Teilnehmerliste

ChurchTools-Extension für Gemeinden: eine Gruppe wählen – eine Veranstaltung,
eine Freizeit, jede Gruppe, die man in ChurchTools sehen darf –, die Mitglieder
**nach Familien zusammengefasst** in einer Vorschau ansehen, die gewünschten
Spalten ankreuzen und die Liste als **Excel** herunterladen.

- **Familien** werden aus zwei Signalen erkannt: in ChurchTools hinterlegte
  Beziehungen (Eltern/Kind, Geschwister, Ehepaar) und gleiche Adresse mit
  gleichem Nachnamen. Zwei Personen an verschiedenen bekannten Adressen sind
  nie eine Familie.
- **Spalten**: Basisdaten (ID mit Link zum Profil, Name, Adresse, E-Mails),
  Mitgliedschaft (Rolle, Status, Eintrittsdatum), alle Gruppenmitgliedsfelder
  der gewählten Gruppe und auf Wunsch weitere Personenfelder. Die Auswahl wird
  pro Gruppe gemerkt.
- **Berechtigungen**: Die Extension zeigt nur, was der angemeldete Nutzer über
  die ChurchTools-API sehen darf. Eine Konfiguration ist nicht nötig.

## Entwicklung

```bash
npm ci
cp .env-example .env   # VITE_BASE_URL, VITE_USERNAME, VITE_PASSWORD
npm run dev
```

- `npm run check` — Lint, Typecheck, Tests, Build, Bundle-Budget (läuft in CI).
- `npm run deploy` — Build und ZIP unter `releases/`.

Für die lokale Entwicklung muss `http://localhost:5173` in ChurchTools unter
**System → Integrationen → API → CORS** erlaubt sein.

## Release und Deploy

[release-please](https://github.com/googleapis/release-please) pflegt aus den
Conventional Commits auf `main` einen Release-PR. Sein Merge erzeugt Tag,
Changelog und GitHub-Release, hängt das ZIP an und lädt es auf die
Demo-Instanz. Live wird per Hand ausgerollt: **Actions → Deploy ZIP** mit Ziel
`live` und dem Tag.

Benötigte Secrets: `CT_DEMO_BASE_URL`, `CT_DEMO_LOGIN_TOKEN`,
`CT_LIVE_BASE_URL`, `CT_LIVE_LOGIN_TOKEN`. Beim ersten Upload legt die Action
das Modul `teilnehmerliste` selbst an; die Rechte dafür vergibt man danach in
ChurchTools.

## Architektur

Siehe [`docs/adr/`](docs/adr/). Die Familienerkennung stammt aus dem
RR-Dashboard (`philtim/ct-rr-organigram`).
