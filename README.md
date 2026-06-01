# Skillio

Skillio ist ein modularer, mobile-first Lernapp-Startpunkt für Enterprise Learning. Der erste produktive Lernbereich ist **Change Management** mit Transfer auf **Data Mesh, Domain Ownership und föderiertes Enablement**.

## Was im ersten Wurf enthalten ist

- Premium Dashboard mit XP, Level, Mastery, Badges und nächster bester Lernaktion
- Modularer Lernpfad für Change Management
- Lernformate: Micro-Lessons, Lernkarten, Quiz, Case Simulator, ADKAR Heatmap, 30/60/90 Roadmap und Coach
- Local-first Fortschrittsspeicherung in `localStorage`
- Supabase-ready Sync-Schicht ohne Secrets im Repository
- Responsive PWA-Shell mit Manifest, Icon und Service Worker
- Saubere Empty-, Feedback- und Error-States für die wichtigsten Interaktionen

## Lokale Nutzung

Die App ist bewusst ohne Build-Step umgesetzt.

```bash
python3 -m http.server 4173
# dann http://localhost:4173 öffnen
```

Alternativ kann sie direkt über GitHub Pages oder jeden Static Host deployed werden.

## Supabase optional aktivieren

Die App funktioniert lokal ohne Supabase. Für echte Multi-Device-Synchronisation:

1. `sql/skillio-schema.sql` in Supabase ausführen.
2. In Supabase unter **Settings → API → Exposed schemas** das Schema `skillio` ergänzen.
3. Supabase Auth aktivieren.
4. Die offizielle Supabase JS Library vor `app.js` laden.
5. `supabase-config.example.js` lokal in `supabase-config.js` kopieren und den öffentlichen Anon Key eintragen.
6. `supabase-config.js` nicht committen; die Datei ist in `.gitignore` eingetragen.

Der Browser nutzt Supabase nur, wenn `window.supabase.createClient` und ein gültiger `anonKey` vorhanden sind. Ansonsten bleibt Skillio local-first.

## Architektur

```text
index.html                  App Shell
style.css                   Premium responsive UI
app.js                      Lernlogik, State, Gamification, Coach, Supabase-ready Sync
manifest.json               PWA Metadaten
service-worker.js           Static Asset Cache
assets/icon.svg             Skillio Icon
sql/skillio-schema.sql      Optionales eigenes Supabase Schema
supabase-config.example.js  Public Config Template ohne Secret
```

## Lernarchitektur

Die Inhalte sind aktuell in `app.js` als strukturierte Lernbasis abgelegt. Die Datenstruktur ist bereits kategoriefähig:

- `categories`
- `modules`
- `lessons`
- `flashcards`
- `quizzes`
- `cases`
- `adkar`
- `badges`

Damit kann Skillio später ohne UI-Umbau um weitere Kategorien wie Strategie, Data & AI Leadership oder Projektmanagement erweitert werden.

## Qualitätsprinzipien

- Backend/Supabase ist Source of Truth, sobald Sync aktiviert ist.
- Lokaler State überschreibt keine Remote-Daten ohne expliziten Sync.
- Keine Secrets im Repository.
- Erweiterung statt Kopie der Beispiel-App.
- Mobile und Desktop sind gleichwertig gestaltet.
