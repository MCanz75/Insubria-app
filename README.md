
# Insubria App - PWA

Questa è la Progressive Web App per il *Lions Club Varese Insubria*.
Contenuti:
- index.html
- styles.css
- app.js
- manifest.json
- service-worker.js
- icons/icon-192.png, icons/icon-512.png

## Funzionalità
- Membri: aggiungi, modifica, elimina
- Eventi: crea, modifica, RSVP
- Bacheca (post)
- Chat locale tra soci (non sincronizzata)
- Galleria: upload immagini (salvate in localStorage)
- Documenti: upload file (salvati in localStorage)

## Local deployment (test in locale)
1. Apri `index.html` nel browser (meglio usare un piccolo server per evitare problemi con service worker).
2. Per avviare velocemente un server locale (Python 3):
   - `python3 -m http.server 8000`
   - poi apri `http://localhost:8000` nel browser.

## Pubblicare su GitHub Pages
1. Crea un nuovo repository su GitHub.
2. Carica il contenuto della cartella `InsubriaApp_PWA` nella root del repository.
3. Vai su Settings → Pages → scegli branch `main` e cartella `/ (root)`, salva.
4. Dopo qualche minuto la tua app sarà disponibile su `https://<tuo-username>.github.io/<repo>/`
5. Apri il link su iPhone Safari e seleziona **Condividi → Aggiungi a Home** per avere l'icona come app.

## Note importanti
- Questa versione è completamente client-side (i dati vivono in `localStorage` del browser).
- Se desideri sincronizzazione multi-utente, login e storage centralizzato, posso aiutarti ad aggiungere Firebase o Supabase.
