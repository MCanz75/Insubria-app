# Insubria App v2

Versione corretta per GitHub Pages come **Project Site**:
- tutti i percorsi sono relativi (`./`), quindi CSS, JavaScript, logo, manifest e service worker funzionano anche in `/nome-repository/`;
- interfaccia responsive pensata per iPhone;
- Home, Soci, Eventi, Bacheca, Chat, Galleria, Documenti e Impostazioni;
- foto dei soci;
- foto e documenti locali;
- navigazione a sezioni/pagine.

## ATTENZIONE
Questa è ancora una demo client-side: `localStorage` salva i dati sul singolo dispositivo/browser.
Quindi i messaggi, soci, foto e documenti NON vengono condivisi automaticamente tra i 30 soci.

Per una vera app del club servirà un database online e autenticazione (ad esempio Supabase/Firebase). La struttura grafica è già pronta per fare questo passaggio.

## Pubblicazione
Sostituisci i file della vecchia versione nel repository GitHub mantenendo:
- index.html
- app.js
- styles.css
- manifest.json
- service-worker.js
- assets/logo.jpg
- icons/

Poi fai Commit changes. GitHub Pages pubblicherà la modifica dal branch configurato.