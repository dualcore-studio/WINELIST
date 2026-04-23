# Wine List Manager (Carta vini)

App Next.js per gestire carta vini e grappe/distillati (backend [InstantDB](https://www.instantdb.com/)).

## Perché su GitHub non vedi `node_modules` né `.next`

È **normale e voluto**: non vanno nel repository (centinaia di MB, rigenerabili, e spesso con path locali). Il codice dell’app è tutto in `src/`, `scripts/`, ecc.

Dopo il clone l’ambiente si ricostruisce con i comandi sotto.

## Setup locale

1. **Node.js** 18+ (consigliato LTS).

2. **Dipendenze**

   ```bash
   npm install
   ```

3. **Variabili d’ambiente** (non committare segreti)

   ```bash
   cp .env.example .env.local
   ```

   Imposta `NEXT_PUBLIC_INSTANT_APP_ID` con l’ID della tua app Instant.

4. **Sviluppo**

   ```bash
   npm run dev
   ```

5. **Build produzione**

   ```bash
   npm run build
   npm start
   ```

## Script utili

Vedi `package.json`: `clear-wines`, `dedupe:wines`, `seed:page26`, `seed:distillati`, ecc.

Repository: `https://github.com/dualcore-studio/WINELIST`
