# oi-list

Interaktywna lista zadań z Olimpiady Informatycznej z filtrowaniem, wyszukiwaniem i sortowaniem po trudności.

## Co robi projekt

Aplikacja ładuje dane z pliku [`public/results.json`](./public/results.json) i wyświetla:

- kod zadania,
- nazwę zadania,
- etap,
- edycję OI,
- rating (wyliczany skryptami z folderu [`scripts/`](./scripts)).

Wersja webowa działa jako normalna aplikacja React, a dodatkowo projekt buduje widget do osadzania na zewnętrznych stronach.

## Funkcje

- wyszukiwanie po kodzie lub nazwie zadania,
- filtrowanie po etapie i edycji,
- sortowanie po ratingu, edycji i nazwie,
- przejście do źródła zadania (Szkopuł) po kliknięciu.

## Wsparcie

Projekt jest wspierany przez **OKI (Olimpijskie Koło Informatyczne)**.

[![OKI](./public/oki-logo.png)](https://oki.org.pl/)

## Wymagania

- Node.js 20+ (zalecane),
- npm.

## Uruchomienie lokalnie

```bash
npm install
npm run dev
```

## Dostępne skrypty

```bash
npm run dev      # serwer deweloperski
npm run build    # build produkcyjny
npm run preview  # podgląd buildu lokalnie
npm run lint     # lint (ESLint)
```

## Build i artefakty

```bash
npm run build
```

Po buildzie powstają m.in.:

- `dist/index.html` — główna aplikacja,
- `dist/embed.js` — bundle widgetu do osadzania.

## Osadzanie widgetu

Najprostsza opcja (działa prawie wszędzie): **`iframe`**.

Wystarczy wkleić:

```html
<iframe
  src="https://zadania.oki.org.pl/oi-list/?embed=1"
  title="Lista zadań OI"
  width="100%"
  height="760"
  style="border:0;"
  loading="lazy"
></iframe>
```

Jeśli chcesz wskazać inny plik danych:

```html
<iframe
  src="https://zadania.oki.org.pl/oi-list/?embed=1&dataUrl=https%3A%2F%2Fzadania.oki.org.pl%2Foi-list%2Fresults.json"
  title="Lista zadań OI"
  width="100%"
  height="760"
  style="border:0;"
  loading="lazy"
></iframe>
```

Zaawansowana opcja (web component):

1. Udostępnij `dist/embed.js` na swoim hostingu.
2. Dodaj do strony:

```html
<script src="https://zadania.oki.org.pl/oi-list/embed.js" defer></script>
<oi-list-widget data-url="https://zadania.oki.org.pl/oi-list/results.json"></oi-list-widget>
```

Programistycznie (manualny mount):

```html
<script src="https://zadania.oki.org.pl/oi-list/embed.js" defer></script>
<div id="list-container"></div>
<script>
  window.OIListWidget.mount(document.getElementById("list-container"), {
    dataUrl: "https://zadania.oki.org.pl/oi-list/results.json",
  });
</script>
```

## Format danych wejściowych

Plik [`public/results.json`](./public/results.json) powinien zawierać tablicę obiektów:

```json
[
  {
    "code": "slo",
    "stage": 2,
    "year": 33,
    "rating": 2200,
    "name": "Zadanie Słowa",
    "url": "https://szkopul.edu.pl/problemset/problem/..."
  }
]
```

## Generowanie danych (opcjonalnie)

W folderze [`scripts/`](./scripts) są skrypty Pythona do:

- pobierania wyników historycznych OI,
- liczenia ratingu ELO zadań,
- budowania końcowego `results.json`.

Przykładowy workflow:

```bash
cd scripts
pip install -r requirements.txt
python scrape.py
python calculate.py
```
