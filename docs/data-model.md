# Skillio Datenmodell

Dieses Dokument beschreibt das Zielmodell fuer die Supabase-gestuetzte Skillio Lernplattform.

## Content Tabellen

- `topics`: Lernbereiche wie Change Management und Bullshit Bingo.
- `lessons`: textbasierte Lerneinheiten mit Thema, Modul, Lernziel und XP Wert.
- `quiz_questions`: Multiple Choice Fragen mit Schwierigkeit, Erklaerung und Empfehlung.
- `quiz_options`: Antwortoptionen je Frage inklusive Korrekt-Markierung.
- `badges`: Achievement Definitionen mit Kriterien und XP Bonus.

## User Tabellen

- `profiles`: Profilinformationen pro User.
- `user_progress`: Lektions- und Modulfortschritt pro User.
- `quiz_attempts`: Quizversuche mit Score, Prozentwert, Antwortauswertung und Empfehlungen.
- `user_xp`: XP Summe und Level pro User.
- `user_badges`: erreichte Badges pro User.
- `streaks`: aktuelle und laengste Lernserie pro User.

## Source of Truth

Produktiv ist Supabase die Source of Truth. Lokale Speicherung darf nur als nicht-dauerhafter Demo- oder Offline-Zustand genutzt werden und Remote-Daten nie ungeprueft ueberschreiben.

## RLS Prinzip

Alle User Tabellen muessen Row Level Security verwenden. Ein User darf nur eigene Profile, Fortschritte, XP, Badges, Streaks und Quizversuche lesen oder schreiben. Content Tabellen sind lesbar, aber nicht clientseitig schreibbar.

## Erweiterbarkeit

Neue Themen koennen ergaenzt werden, indem `topics`, `lessons`, `quiz_questions` und `quiz_options` erweitert werden. Die UI erwartet keine hart codierten Spezialseiten pro Thema, sondern arbeitet thema- und modulbasiert.
