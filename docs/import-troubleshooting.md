# Skillio Import Troubleshooting

## Problem: Supabase SQL Editor meldet `Query is too large`

Die komplette Importdatei fuer alle Quizfragen kann fuer den Supabase SQL Editor zu gross sein.

Die Daten sind dadurch nicht fehlerhaft. Der Import muss nur in kleinere SQL-Dateien geteilt werden.

## Loesung

Nutze das Split-SQL-Importpaket.

Fuehre die Dateien im Supabase SQL Editor exakt in dieser Reihenfolge aus:

1. `01_schema_topics_lessons.sql`
2. alle Dateien mit `02_questions_...sql`
3. alle Dateien mit `03_options_...sql`
4. `99_verify_import.sql`

Nicht parallel ausfuehren. Immer eine Datei laufen lassen, Ergebnis abwarten, dann die naechste Datei.

## Erwartetes Ergebnis

Nach `99_verify_import.sql` sollen diese Werte erscheinen:

| Tabelle | Erwartete Anzahl |
|---|---:|
| `skillio.topics` | 2 |
| `skillio.lessons` | 32 |
| `skillio.quiz_questions` | 1876 |
| `skillio.quiz_options` | 7504 |

## Warum Split statt eine grosse Datei?

Der SQL Editor ist fuer sehr grosse Paste-Operationen nicht ideal. Die Split-Dateien bleiben klein genug und verwenden weiterhin `ON CONFLICT DO UPDATE`, sodass der Import erneut ausgefuehrt werden kann, ohne bestehende Zeilen vorher loeschen zu muessen.

## Alternative

Wenn der SQL Editor weiterhin zickt, koennen die CSV-Dateien ueber den Supabase Table Editor importiert werden. Dann gilt diese Reihenfolge:

1. `skillio_topics_import.csv`
2. `skillio_lessons_import.csv`
3. `skillio_quiz_questions_import.csv`
4. `skillio_quiz_options_import.csv`

Die Reihenfolge ist wichtig, weil spaetere Tabellen auf vorherige Tabellen verweisen.