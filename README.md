# Skillio

Skillio ist eine modulare, mobile-first Lernapp für Enterprise Learning. Die erste produktive Kategorie ist **Change Management** mit Transfer auf **Data Mesh, Domain Ownership und föderiertes Enablement**.

## Aktueller Stand

Der zweite Wurf ist keine reine Demo mehr:

- echtes Curriculum mit 12 Change-Management-Lektionen
- 20 Lernkarten
- 28 Quizfragen, nach Lerntracks filterbar
- 3 Management-Cases mit Review-Logik
- ADKAR-Heatmap nach Zielgruppe
- 30/60/90-Roadmap
- XP, Level, Mastery und Badges
- Local-first Fortschritt
- echter Supabase Auth + Upsert Sync nach Login

## Lokale Nutzung

```bash
python3 -m http.server 4173
# dann http://localhost:4173 öffnen
```

## Supabase aktivieren

Die App speichert lokal, bis Supabase eingerichtet und ein User angemeldet ist.

1. In Supabase `sql/skillio-schema.sql` im SQL Editor ausführen.
2. Unter **Settings → API → Exposed schemas** das Schema `skillio` ergänzen.
3. Supabase Auth aktivieren.
4. App öffnen, zu **DB & Profil** gehen.
5. Public `anon key` einfügen und speichern.
6. Mit E-Mail + Passwort registrieren oder einloggen.
7. Danach wird jede Lernaktion per Upsert in `skillio.user_learning_state` gespeichert.

Der Anon Key wird bewusst nicht ins Repository geschrieben. Er ist zwar ein Browser-Key, aber Skillio speichert ihn nur lokal im Browser, damit im öffentlichen GitHub-Repo keine projektbezogenen Tokens landen.

## Datenbanktabellen

- `skillio.learning_categories` — verfügbare Lernkategorien
- `skillio.user_learning_state` — aktueller Lernstand pro User und Kategorie
- `skillio.learning_events` — einfache Event-Historie für spätere Analytics

RLS ist aktiviert. User können nur ihre eigenen Lernstände und Events lesen/schreiben.

## Architektur

```text
index.html                  App Shell mit Supabase JS CDN
style.css                   Premium responsive UI
app.js                      Curriculum, Training, State, Auth und Supabase Sync
manifest.json               PWA Metadaten
service-worker.js           Static Asset Cache
assets/icon.svg             Skillio Icon
sql/skillio-schema.sql      Eigenes Supabase Schema inkl. RLS
supabase-config.example.js  Optionales Config-Template ohne Anon Key
```

## Lernarchitektur

Skillio ist kategoriefähig aufgebaut:

- Tracks
- Lessons
- Flashcards
- Quiz Questions
- Cases
- ADKAR Heatmap
- Roadmap
- Coach

Damit können später weitere Kategorien wie Strategie, Data & AI Leadership oder Projektmanagement ergänzt werden, ohne die App-Struktur neu zu bauen.
