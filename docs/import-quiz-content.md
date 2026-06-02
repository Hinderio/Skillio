# Skillio Quiz-Content-Import

Diese Dokumentation beschreibt den sauberen Import der beiden gelieferten Excel-Dateien in die aktuelle Skillio-Supabase-Struktur.

## Ausgangsdateien

- `change_management_data_mesh_500_quizfragen.xlsx`
- `it_bullshit_bingo_quiz_1000_aufbau.xlsx`

## Normalisierte Zielstruktur

Die Excel-Dateien werden nicht als rohe Tabellen importiert, sondern in die bestehenden Content-Tabellen normalisiert:

1. `skillio.topics`
2. `skillio.lessons`
3. `skillio.quiz_questions`
4. `skillio.quiz_options`

Die Tabellenstruktur dazu liegt in `sql/skillio-content-schema.sql`.

## Importreihenfolge

Wenn CSV-Dateien über den Supabase Table Editor importiert werden, ist die Reihenfolge wichtig:

1. `skillio_topics_import.csv` nach `skillio.topics`
2. `skillio_lessons_import.csv` nach `skillio.lessons`
3. `skillio_quiz_questions_import.csv` nach `skillio.quiz_questions`
4. `skillio_quiz_options_import.csv` nach `skillio.quiz_options`

Grund: `lessons`, `quiz_questions` und `quiz_options` referenzieren vorherige Tabellen.

## Empfohlener Weg

Für den produktiven Import ist ein idempotentes SQL-Seed am robustesten:

- Tabellen werden erstellt, falls sie noch fehlen.
- Inhalte werden per `ON CONFLICT DO UPDATE` aktualisiert.
- Bestehende Tabellen werden nicht gelöscht.

## Ergebnis der Normalisierung

- Themen: 2
- Lektionen/Module: 32
- Change-Management-Fragen: 500
- IT-Bullshit-Bingo-Fragen: 1376
- Fragen gesamt: 1876
- Antwortoptionen gesamt: 7504

## Mapping

### Change Management

| Excel-Spalte | Supabase-Ziel |
|---|---|
| `ID` | `quiz_questions.id` |
| `Themenfeld` | `quiz_questions.module_id` / `lessons.module_id` |
| `Frage` | `quiz_questions.question_text` |
| `Erklärung` | `quiz_questions.explanation` |
| `Data-Mesh-Bezug` | `quiz_questions.recommendation` |
| `Level` | `quiz_questions.difficulty` |
| `Option A-D` | `quiz_options.option_text` |
| `Richtige Antwort` | `quiz_options.is_correct` |

### IT Bullshit Bingo

| Excel-Spalte | Supabase-Ziel |
|---|---|
| `ID` | `quiz_questions.id` |
| `Thema` | `quiz_questions.module_id` / `lessons.module_id` |
| `Quizfrage` | `quiz_questions.question_text` |
| `Erklärung` | `quiz_questions.explanation` |
| `Begriff` | `quiz_questions.recommendation` |
| `Level` | `quiz_questions.difficulty` |
| `Antwort A-D` | `quiz_options.option_text` |
| `Korrekt` | `quiz_options.is_correct` |

## Validierung

Die generierten Importdaten wurden darauf geprüft, dass:

- jede Frage eine stabile ID hat,
- jede Frage genau vier Antwortoptionen besitzt,
- jede Frage genau eine korrekte Antwort hat,
- die Referenzen von `quiz_options` zu `quiz_questions` vollständig sind,
- die Daten zur bestehenden `skillio`-Tabellenstruktur passen.

## App-Anbindung danach

Nach erfolgreichem Import sollte die App nicht mehr primär aus lokalen Demo-Fragen lesen, sondern die Content-Tabellen aus Supabase laden:

- Themen aus `topics`
- Module/Lektionen aus `lessons`
- Fragen aus `quiz_questions`
- Antworten aus `quiz_options`

Lokale Demo-Daten sollten danach nur noch als Entwicklungsfallback oder Empty-State verwendet werden.