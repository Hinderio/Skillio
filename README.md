# Skillio

Skillio ist eine professionelle, responsive Lernplattform für Enterprise Learning.

## Themen

- Change Management & Data Mesh
- IT Bullshit Bingo

## Architektur

Die App ist als statische Web-App ohne Build-Step aufgebaut.

```text
index.html
style.css
app.js
sql/skillio-schema.sql
```

Supabase ist die Source of Truth für Fortschritt, Quizversuche, XP und Streaks, sobald ein User angemeldet ist.
