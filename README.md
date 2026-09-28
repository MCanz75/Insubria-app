# Insubria App v3 — versione condivisa

PWA per **Lions Club Varese Insubria**, con lo stesso aspetto grafico della v2 ma con backend Supabase.

## Cosa cambia rispetto alla v2
- Accesso personale con email e password.
- Soci, eventi, bacheca e chat condivisi online.
- Partecipazione agli eventi (Partecipo / Non partecipo).
- Galleria fotografica online.
- Documenti online.
- Aggiornamenti in tempo reale per chat, bacheca, eventi e contenuti condivisi.
- Ruoli: Socio, Presidente, Segretario, Amministratore.
- GitHub Pages rimane il sito/PWA gratuito del frontend.

## Configurazione Supabase
1. Crea un progetto su Supabase.
2. Apri **SQL Editor** e incolla tutto il contenuto di `supabase_schema.sql`.
3. In **Project Settings → API** copia Project URL e Publishable/Anon Key.
4. Duplica `config.js.example` chiamandolo `config.js` e inserisci URL e key.
5. Non pubblicare mai la Service Role Key nel frontend.
6. Per il primo amministratore, crea il tuo account dalla app e poi esegui nello SQL Editor:
   `update public.profiles set role='Presidente' where email='LA-TUA-EMAIL';`
7. Aggiungi `config.js` al repository GitHub insieme agli altri file.
8. Pubblica la cartella su GitHub Pages.

## Account dei 30 soci
Ogni socio crea il proprio account con la propria email. Dopo la conferma email potrà accedere all'app. Il profilo viene creato automaticamente come `Socio`.

Per il primo periodo puoi promuovere manualmente Presidente/Segretario dal SQL Editor. Non è necessario creare 30 utenti dal codice.

## Privacy e sicurezza
Le tabelle sono protette con Postgres Row Level Security. I bucket Storage sono privati e i file vengono aperti tramite URL temporanei. Non inserire dati sanitari o altre informazioni non necessarie. Prima dell'uso effettivo del Club, definire informativa/privacy e consenso per fotografie e dati dei soci.

## Nota sul piano gratuito
Supabase offre un piano Free. I limiti possono cambiare nel tempo: controllare sempre la pagina Pricing prima di un uso intensivo.


## Logo v5
Il logo principale è incorporato direttamente nell'HTML come immagine inline, così non dipende dal percorso /assets/ e non può rompersi per un problema di GitHub Pages o cache.
