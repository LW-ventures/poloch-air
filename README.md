# ✈️ Poloch Air

Private Fahrgemeinschafts-App für eine kleine Pendler-Crew. Flüge ankündigen, Sitz buchen, Boarding Pass abreißen, Spritgeld fair teilen.

## Lokal starten

```bash
npm install
npm run dev
```

Dann http://localhost:5173 öffnen. Im **Testmodus** liegen alle Daten nur im Browser (localStorage), und oben rechts („Test ⇄“) wechselt man die Person. Demo-Daten lassen sich im Admin-Bereich (Profil → Admin) zurücksetzen.

```bash
npm test        # Kostenlogik & Regeln
npm run build   # Produktions-Build nach dist/
```

## Regeln (so rechnet die App)

- **Kosten pro Flug** = km × Verbrauch (l/100 km) × Spritpreis (€/l). Verbrauch und Preis werden beim Ankündigen eingefroren.
- **Anteil** = Kosten ÷ (Mitflieger mit abgerissenem Ticket + Pilot). Wer nicht mitfliegt, zahlt nichts.
- **Abreißen** geht ab 30 min vor Abflug bis Tagesende. Nicht entwertete Tickets klärt der Pilot (war dabei / nicht).
- **Kontostand** läuft centgenau pro Paar Pilot ↔ Mitflieger und wird kaufmännisch auf ganze Euro gerundet angezeigt.
- **Zahlungen:** Der Mitflieger meldet, der Pilot bestätigt. Der Pilot kann Bargeld auch direkt eintragen. Guthaben ist möglich.

## Aufbau

| Pfad | Inhalt |
| --- | --- |
| `src/lib/domain.js` | Fachlogik: Zeiten, Status, Kosten, Kontostände, Miles |
| `src/data/actions.js` | Zustandsänderungen mit Regelprüfung |
| `src/data/store.js` | Datenschicht (aktuell: Testmodus im Browser) |
| `src/components/` | Boarding Pass, Abflugtafel, Sitzplan |
| `src/pages/` | Seiten |

## Startanimationen & Icon

- Zwei Startanimationen („Scheibe“, „Airline“) in `src/components/Splash.jsx`. Welche läuft, stellt der Admin unter Profil → Admin für alle um.
- Die Polo-Grafiken (detailliert + stilisiertes Flügel-Auto) liegen in `src/lib/poloArt.js`.
- App-Icon: `node scripts/make-icon.mjs <1-4>` schreibt alle 4 Varianten nach `public/icons/` und macht die gewählte zu `public/icon.svg` (aktuell: 2, orange mit Flügel-Auto). Vergleich im Dev-Server unter `/icon-preview.html`. Die PNGs (`icon-192.png`, `icon-512.png`) danach aus `public/icon.svg` im Browser rendern.

## Noch offen

- Supabase als gemeinsame Datenbank und echte Logins (Name + Passwort)
- Hosting über GitHub Pages
