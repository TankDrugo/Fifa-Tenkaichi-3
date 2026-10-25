# Fifa Tenkaichi 3 — il rifacimento in Next.js, 3D e online

Questo file è il prompt e il piano per le chat che rifanno il gioco. Ogni chat nuova riceve il
messaggio della sezione 8, legge questo file, cerca in `DIARIO.md` l'ultima fase chiusa e fa la
fase successiva, una sola (`CLAUDE.md`, «One task per session»). Le decisioni della sezione 1 sono
di Tancredi e non si rimettono in discussione; se una fase mostra con un numero che una di esse non
regge, la chat lo scrive e chiede.

## 1. Decisioni di Tancredi (21/10/2026)

| Tema | Decisione | Conseguenza per il lavoro |
|---|---|---|
| Tecnologia | Next.js (App Router, TypeScript) per interfaccia **e** server; React; 3D con three.js tramite `@react-three/fiber` | API dentro Next.js; le partite in tempo reale in un servizio Node a parte (sezione 3), perché tengono aperta una connessione WebSocket per tutta la partita |
| Personaggi e animazioni | **Modelli GLB fatti da Tancredi**, prima senza animazioni, poi con (25/10/2026; il 22/10/2026 era «il modo che dà il personaggio migliore»; il 21/10/2026 era «disegnati nel codice, niente Mixamo, niente archivio, niente modelli esterni») | Il gioco carica i GLB dietro uno strato «aspetto del giocatore»; i pezzi in codice restano come riserva; piano in `docs/STUDIO-PERSONAGGI.md`, sezione 11 |
| Account | Nome utente e password, **nessuna email** | Hash argon2id; password dimenticata: la reimposta Tancredi da un pannello di amministrazione |
| Dati | **Postgres + Redis** | Postgres su disco per account, carte, crediti, scambi; Redis per sessioni, code delle partite, presenza, classifiche, limiti di frequenza |
| Online | **Tutto insieme**: UT 1 contro 1 in tempo reale, 2 contro 2 in tempo reale, mercato fra giocatori, salvataggio sul server e classifiche | Le fasi si fanno una alla volta, ma il gioco nuovo va online per gli amici solo quando funzionano tutte e quattro |
| Gioco attuale | **Resta com'è**: `web/`, GitHub Pages, itch.io, exe e link di lavoro non cambiano | Le correzioni chieste si fanno solo nel gioco nuovo; il gioco nuovo sostituisce il vecchio quando ha almeno le stesse modalità |
| Hardware | **Portatili normali** con la grafica integrata, 60 fotogrammi al secondo | Budget di disegno stretto (sezione 4.6); le chat cloud non hanno una scheda video, quindi i fotogrammi al secondo li misura Tancredi |
| Server | Oracle non ancora creato; prima **Docker Desktop** sul PC di Tancredi | Tutto parte con `docker compose up`; le immagini si costruiscono anche per Arm (le macchine gratuite di Oracle sono Ampere A1) |
| Distribuzione | Next.js anche come server | Il gioco nuovo vive solo sul server: la pagina itch.io e l'exe diventano un collegamento al sito (fase 7) |

## 2. Da dove si parte (misure del 19-21/10/2026)

- **Codice da portare:** `web/js/` ha 13 file e 5.052 righe; i più grandi sono `match.js` (1.028),
  `render.js` (877), `ai.js` (448), `ut.js` (425). La simulazione (`match.js`, `ai.js`,
  `skills.js`) non chiama `Math.random` (0 occorrenze): con lo stesso seme e gli stessi comandi
  dà la stessa partita, che è la base per il gioco online con il server che decide. `Math.random`
  compare in `ut.js` (4), `modes.js` (1), `data.js` (1): pacchetti, mercato, offerte, che nel
  gioco nuovo si spostano sul server.
- **Perché oggi non sembra 3D:** `web/js/render.js:4` disegna il terreno inclinato di 46° con una
  proiezione senza prospettiva («a metre on the ground is S px across and S*sin(46) deep») e i
  giocatori sono immagini già disegnate (fogli di sprite). Nessun oggetto si rimpicciolisce con la
  distanza e luci e ombre non cambiano mentre si gioca. Mario Strikers: Battle League usa modelli
  veri, una telecamera con prospettiva e luci e ombre calcolate a ogni fotogramma.
- **Crediti infiniti:** il mercato del gioco compra qualunque carta a 0,95 × (da 5 a 8 volte il
  valore di vendita rapida), senza limiti di quantità (`web/js/ut.js:233-236`, `ut.js:257`). Con i
  prezzi e le probabilità di `web/js/data.js:230-238` e il moltiplicatore medio delle versioni
  (1,26), un pacchetto rende in media, rivenduto al mercato: Bronzo 490%, Argento 514%, Oro 567%,
  Campioni 349%, Leggende 164% del prezzo. Con la sola vendita rapida: 79%, 83%, 90%, 54%, 25%.
- **Menu col joypad:** prova del 19/10/2026 con un joypad finto in Chromium: dopo ○ il cursore torna
  sulla prima voce del menu principale e non sull'ultima scelta, quindi si perde il punto dove si
  era. Le altre segnalazioni sono di Tancredi (21/10/2026): parti della scelta squadre e di alcuni
  menu non raggiungibili col joypad, scritte poco leggibili, valori delle carte tagliati in basso,
  nessuna animazione fra le schermate, nessuna differenza visiva fra menu principale, Ultimate Team
  e Carriera, barra di scorrimento visibile nella pausa.
- **Da conservare:** i profili dei joypad di `web/js/input.js` (Xbox, PS4, PS5, Linux, tabelle
  registrate a mano; 7 casi provati il 19/10/2026), i dati di club, carte, leggende e sfide
  (`data.js`), le regole della partita e dell'IA, e le prove `tools/web_checks.js` (11 prove),
  `tools/ai_bench.js`, `tools/tension_bench.js`, `tools/skill_frames.js` con i numeri scritti in
  `docs/DETTAGLI.md`.
- **Ambiente delle chat cloud (21/10/2026):** Node 22.22, npm 10.9, pnpm 10.28, 4 core, 15 GB di
  RAM. Docker 29.8.2 e Compose v5.6.0 ci sono ma il servizio va avviato a mano (`dockerd &`); poi
  `docker pull redis:8-alpine` e `docker run` funzionano. Nessuna scheda video: Chromium senza
  schermo disegna il WebGL in software, buono per le foto e non per misurare i fotogrammi al
  secondo. La rete passa da un proxy (`/root/.ccr/README.md`).
- **Oracle, piano gratuito:** due fonti danno numeri diversi per le macchine Ampere A1: 4 core e
  24 GB di RAM (pagina di Oracle, https://docs.oracle.com/en-us/iaas/Content/FreeTier/resourceref.htm)
  oppure 2 core e 12 GB (https://linuxiac.com/oracle-quietly-cuts-free-tier-ampere-a1-resources-in-half/);
  200 GB di disco in tutto. Una macchina A1 ferma (sotto il 20% di processore, rete e memoria per 7
  giorni) può essere ripresa da Oracle, secondo una regola riportata da un forum e da verificare
  nella console. Da qui la pagina di Oracle è bloccata dal proxy: i numeri veri li legge Tancredi
  quando crea l'account.

## 3. Architettura

```
                 navigatore (React, three.js)
                 │ HTTPS                    │ WebSocket (WSS)
                 ▼                          ▼
   apps/web  (Next.js: pagine + API)   apps/realtime (Node: partite a 60 Hz)
                 │        │                 │         │
                 ▼        └──────┬──────────┘         │
            Postgres            Redis  ◄──────────────┘
   (account, carte,     (sessioni, code, presenza,
    crediti, scambi)     classifiche, messaggi fra servizi)

   davanti a tutto, in produzione: Caddy (HTTPS automatico)
```

- **Cartelle nuove** nello stesso repository, accanto a `web/` che non si tocca:
  - `apps/web`: Next.js, interfaccia React, scena 3D, input, audio, API (account, Ultimate Team,
    mercato, classifiche, amministrazione);
  - `apps/realtime`: server delle partite: riceve i comandi dei giocatori, fa girare la
    simulazione, manda lo stato;
  - `packages/sim`: la simulazione in TypeScript (partita, IA, skill, regole di Ultimate Team ed
    economia), senza DOM, la stessa nel navigatore, in Next.js, in `apps/realtime` e nelle prove;
  - `packages/shared`: tipi e messaggi fra client e server, controllati con schemi (zod);
  - `infra/`: `docker-compose.yml` (sviluppo), `docker-compose.prod.yml`, Caddyfile, script di
    backup, guida Oracle.
- **Gestione:** pnpm workspaces; TypeScript in modalità `strict`; versioni bloccate ed esatte nel
  lockfile; ogni libreria scelta con il suo perché scritto in `docs/DETTAGLI.md`.
- **Partita online:** il server decide (autorità del server). Il client manda solo i comandi;
  il server simula a 60 Hz e manda lo stato 30 volte al secondo; il client anticipa il proprio
  giocatore e interpola gli altri. Obiettivo: partita giocabile fino a 120 ms di andata e ritorno,
  provata con un ritardo artificiale di 50, 100 e 150 ms.
- **Sicurezza:** password con argon2id; sessione in cookie `httpOnly`, `Secure`, `SameSite`; limiti
  ai tentativi di accesso (Redis); pacchetti aperti sul server con il caso del server; carte e
  crediti solo in Postgres, scambi del mercato dentro transazioni; il client non decide mai un
  risultato. Solo crediti di gioco: nessun acquisto con soldi veri.
- **Immagini Docker:** costruite per `linux/amd64` (PC di Tancredi) e `linux/arm64` (Oracle A1);
  controlli di salute su ogni servizio; volumi per Postgres e Redis; file `.env.example` senza
  segreti veri.

## 4. Requisiti del gioco (messaggio di Tancredi del 21/10/2026)

Ogni requisito ha una prova che una chat può rifare e un numero da scrivere in `docs/DETTAGLI.md`.

### 4.1 Interfaccia e joypad
- Ogni elemento che si può usare si raggiunge con croce e levetta, in ogni schermata, compresa la
  scelta delle squadre. Navigazione spaziale (sopra, sotto, destra, sinistra verso l'elemento più
  vicino in quella direzione).
  *Prova:* Playwright con un joypad finto (sostituendo `navigator.getGamepads` con
  `page.addInitScript`, come il 19/10/2026) visita ogni schermata e conta gli elementi raggiunti
  sul totale; deve dare 100% in ognuna.
- Si vede sempre cosa è selezionato (contorno e ingrandimento, anche sopra le carte) e dove si è:
  intestazione con il percorso (per esempio «Ultimate Team › Rosa»). Tornando indietro il cursore
  ritrova l'ultima voce scelta.
- Leggibilità: a 1280 × 720 nessun testo sotto 14 px, il testo normale ad almeno 16 px; contrasto
  di almeno 4,5:1 (WCAG AA). *Prova:* axe-core su ogni schermata, zero errori di contrasto.
- Ogni parte del gioco ha la sua identità: menu principale, Ultimate Team, Carriera, Sfide,
  Amichevole, Allenamento, Impostazioni con colore, sfondo, intestazione e suono d'ingresso propri,
  così entrando in Ultimate Team si capisce di essere lì.

### 4.2 Carte di Ultimate Team
- Nessun valore tagliato. *Prova:* per ogni rarità e versione, ogni testo sta dentro il riquadro
  della carta (misura dei riquadri nel DOM o nel canvas).
- Carta più curata e dettagliata: cornice per rarità, ruolo, valutazione, nome, sei statistiche,
  stemma inventato del club, effetti delle versioni (olografica, numerata, oro unica).
- Premendo la levetta destra (R3 / RS, tasto 11 della disposizione standard; sulla tastiera un
  tasto indicato a schermo) su una carta si apre la scheda del giocatore, come la biografia di FC:
  rarità e versione, statistiche nel dettaglio, skill che sa fare, altezza, piede preferito, ruolo
  e ruoli secondari.

### 4.3 Animazioni dell'interfaccia
- La chat fa prima una ricerca su come passano da una schermata all'altra i giochi di calcio (EA
  Sports FC, eFootball, Mario Strikers: Battle League) e scrive in `docs/DETTAGLI.md` cosa ha
  trovato con le fonti; poi le realizza con una libreria di animazione per React (per esempio
  Motion). Durata fra 200 e 400 ms; con `prefers-reduced-motion` restano solo le dissolvenze.
- Animazioni da avere: passaggio fra schermate, ingresso in ogni parte del gioco, apertura dei
  pacchetti e walkout, carte che si girano, comparsa della scheda giocatore, menu di pausa.

### 4.4 Pausa e comandi
- Menu di pausa senza barra di scorrimento a 1280 × 720 e fino a 640 × 360. *Prova:* foto alle due
  misure e `scrollHeight` uguale a `clientHeight` in ogni contenitore della pausa.
- Comandi modificabili dalla pausa e dalle Impostazioni, per tastiera e joypad; i comandi
  modificati si salvano con un nome (più profili), sul PC e, con l'account, sul server.

### 4.5 Economia di Ultimate Team
- Pacchetti più difficili ma non come FC. Obiettivi di partenza, da far confermare a Tancredi con i
  numeri del banco: valore atteso in vendita rapida fra 55% e 75% del prezzo di ogni pacchetto;
  fra 15% e 25% dei pacchetti che rendono più del prezzo rivendendo tutto a prezzi di mercato
  realistici.
- Il mercato non compra più tutto: offline un acquirente del gioco paga al massimo 2 volte la
  vendita rapida, con un limite di vendite al giorno; online i prezzi li fanno i giocatori, con un
  minimo e un massimo per carta perché i crediti non si possano passare da un account all'altro.
- *Prova:* un banco dell'economia (`packages/sim`) apre 10.000 pacchetti per tipo e simula le
  vendite: valore medio, mediana, quota di pacchetti in guadagno, crediti per ora di gioco. I
  numeri prima e dopo vanno in `docs/DETTAGLI.md`.

### 4.6 3D: campo, telecamera, luci
- Telecamera con prospettiva che segue la palla, angolo e campo visivo da scegliere con delle
  prove e scritti con le foto; stadio con volumi veri (muri e cartelloni con spessore, tribune,
  fari), pubblico come istanze, ombre calcolate, luci per ogni campo a tema (i 12 di oggi), effetti
  (scia della palla, scintille della Cometa, polvere), post-elaborazione leggera (bloom a metà
  risoluzione, mappatura dei toni, vignettatura).
- Budget per i portatili con la grafica integrata: al massimo 150 chiamate di disegno, 300.000
  triangoli, una mappa d'ombra da 2048, risoluzione massima 1,5 volte i pixel CSS. Una schermata
  `/bench` mostra fotogrammi al secondo, tempo per fotogramma e i numeri di
  `renderer.info`. *Prova:* le chat controllano il budget con `renderer.info` nel Chromium senza
  schermo; Tancredi apre `/bench` sul suo portatile e scrive il risultato. Obiettivo: 60 di
  media, con l'1% dei fotogrammi più lenti sotto 25 ms. Tancredi, 22/10/2026: i 300.000 triangoli
  sono un riferimento e non un limite; il controllo che resta è la misura sul portatile.

### 4.7 Personaggi e animazioni

Tancredi, 22/10/2026: questa sezione descrive i prototipi della fase 3a. Lo stile nuovo (fumetto
con i bordi d'inchiostro, manga: Dragon Ball, Blue Lock, Dorohedoro, Naoki Urasawa) si studia su un
personaggio solo, con il metodo di `docs/STUDIO-PERSONAGGI.md`; i movimenti e le prove restano.

- Calciatori stilizzati, tipo giocattolo: testa grande, corpo arrotondato, arti con giunture
  nascoste da sfere, faccia disegnata su una texture fatta con canvas (occhi, sopracciglia, bocca,
  con espressioni che cambiano), capelli come forme modellate nel codice (varianti), maglia,
  pantaloncini, calzettoni e scarpini con i colori della squadra, numero sulla schiena. Materiale
  a cartone animato (toon) con contorno e luce di bordo. Varianti per carta: altezza (oggi da 0,92
  a 1,07), pelle, capelli. Nessun personaggio esistente copiato.
- Scheletro in TypeScript (bacino, schiena, petto, collo, testa, spalle, braccia, avambracci,
  mani, cosce, gambe, piedi) e animazioni come chiavi scritte nel codice più strati procedurali:
  corsa che segue la velocità (camminata, corsa, scatto, frenata), inclinazione in curva, sguardo
  verso la palla, piedi appoggiati al terreno.
- Movimenti da avere: passaggio, tiro, tiro caricato, pallonetto, colpo di testa, spallata,
  scivolata, finta, le 9 skill (Tunnel, Trascinamento, Finta di corpo, Doppio passo, Rullata,
  Colpo di tacco, Roulette, Sombrero, Elastico), portiere (tuffi, presa, rinvio), reazioni ai
  colpi, esultanze, la Cometa. La simulazione decide quando, l'animazione segue: il fotogramma del
  contatto coincide con l'istante in cui la simulazione fa partire la palla.
- *Prova:* fogli di contatto di ogni movimento (come fa oggi `tools/skill_frames.js`) fatti nel
  Chromium senza schermo e messi in `docs/` per Tancredi.

### 4.8 Online
- Account con nome utente e password; pannello di amministrazione per Tancredi (reimposta
  password, blocca account, vede le partite).
- Ultimate Team sul server: collezione, crediti, squadra, divisioni, coppe; il salvataggio si
  ritrova su ogni PC.
- Partite in tempo reale 1 contro 1 e 2 contro 2, con ricerca di un avversario (coda in Redis) e
  inviti agli amici con un codice; i posti vuoti di una squadra li gioca l'IA.
- Mercato fra giocatori: annunci, acquisto immediato, commissione del 5%, limiti di prezzo per
  carta, storico delle vendite.
- Classifiche (insiemi ordinati di Redis) per divisione e generali.
- *Prova:* partite fra bot sul server con ritardo artificiale; a fine partita lo stato dei client e
  quello del server coincidono (stessa impronta dello stato); banda per giocatore misurata.

### 4.9 Infrastruttura
- `docker compose up` sul PC di Tancredi avvia tutto: `apps/web`, `apps/realtime`, Postgres, Redis;
  una pagina di stato mostra i quattro servizi collegati.
- Integrazione continua su GitHub Actions: controllo dei tipi, lint, prove della simulazione,
  prove Playwright col joypad finto, costruzione delle immagini per amd64 e arm64.
- Guida in italiano per Oracle (fase 7): creazione dell'account e della macchina A1, porte aperte,
  Docker, dominio, HTTPS con Caddy, backup notturno di Postgres, aggiornamento del gioco con un
  comando.

## 5. Fasi

Una fase per chat; alla fine: misure, voce in `DIARIO.md`, commit, pull request e merge su `main`.
Il gioco vecchio continua a essere pubblicato come oggi da `.github/workflows/pages.yml`.

| Fase | Cosa | Finita quando |
|---|---|---|
| 0 · Fondamenta | pnpm workspaces, scheletro di `apps/web` e `apps/realtime`, Postgres e Redis in `infra/docker-compose.yml`, integrazione continua, pagina di stato; proposta di modifiche a `CLAUDE.md` e `README.md` per il gioco nuovo, che Tancredi approva | `docker compose up` dà la pagina di stato con i quattro servizi collegati, nella chat e sul PC di Tancredi; immagini costruite per amd64 e arm64 |
| 1 · Simulazione condivisa | `packages/sim` in TypeScript da `match.js`, `ai.js`, `skills.js`, `data.js`; prove e banchi portati | le 11 prove di `web_checks` danno gli stessi numeri di `docs/DETTAGLI.md`; `ai_bench` su 48 partite resta nel rumore di quello vecchio; stesso seme e stessi comandi danno la stessa impronta in Node e in Chromium; misurate le partite simultanee per core |
| 2 · Motore 3D | scena con `@react-three/fiber`: campo, stadio, telecamera, luci, ombre, palla, calciatore stilizzato con la corsa, guidato dalla simulazione; `/bench` | budget della sezione 4.6 rispettato con `renderer.info`; misura di Tancredi sul portatile scritta nel diario |
| 3 · Personaggi e movimenti | tutti i movimenti della sezione 4.7, varianti dei corpi, i 12 campi a tema | fogli di contatto approvati da Tancredi; una partita intera contro l'IA nel gioco nuovo |
| 4 · Interfaccia | menu in React con navigazione spaziale, identità di ogni parte, animazioni, carte nuove con la scheda giocatore, pausa senza barra, comandi modificabili con profili | prove 4.1-4.4 tutte verdi; tutte le modalità di oggi giocabili offline nel gioco nuovo |
| 5 · Account e dati | registrazione e accesso, schema Postgres, Ultimate Team sul server, economia nuova col banco, classifiche, pannello di amministrazione | prove della sezione 4.5; un account ritrova la squadra da un altro navigatore |
| 6 · Online | `apps/realtime`, 1 contro 1 e 2 contro 2, coda e inviti, anticipo e interpolazione, mercato fra giocatori | prove della sezione 4.8 con 50, 100 e 150 ms di ritardo; partite di prova di Tancredi con un amico sul suo PC |
| 7 · Messa online | Oracle, dominio, HTTPS, backup, monitoraggio; itch.io e l'exe puntano al sito | il gioco nuovo raggiungibile da fuori con tutte e quattro le parti online funzionanti; il vecchio resta raggiungibile su GitHub Pages |

Una fase che si rivela troppo grande per una chat si divide in sotto-fasi (per esempio 3a, 3b),
scritte nel diario prima di cominciare.

## 6. Regole di lavoro per le chat del rifacimento

- Valgono le regole di `CLAUDE.md`: lingue, forma delle analisi, misure prima e dopo, voce del
  diario, niente `git add -A`, chiedere prima di cancellare file o creare servizi fuori dal
  repository. Dalla fase 0 `CLAUDE.md` ha anche le regole del gioco nuovo, approvate da Tancredi.
- `web/` non si modifica: è il gioco che i suoi amici usano adesso.
- Si spediscono solo cose provate: una fase la cui prova non passa resta aperta e il diario dice
  perché.
- Nelle chat cloud: avviare Docker con `dockerd &`; le costruzioni che scaricano pacchetti
  dentro un contenitore possono aver bisogno del proxy e del certificato
  `/root/.ccr/ca-bundle.crt` (da verificare alla fase 0 e scrivere nel diario); i fotogrammi al
  secondo veri li misura Tancredi.
- Servizi a pagamento, domini, account esterni (Oracle, registrar, GitHub Apps): si chiede prima.

## 7. Domande ancora aperte (da fare a Tancredi nella fase indicata)

- **Fase 5 — salvataggi vecchi:** il gioco vecchio salva nel navigatore (`strikelegends.save.v2`)
  su un altro indirizzo, quindi il gioco nuovo non può leggerlo da solo. Le due strade sono un
  pulsante «Esporta salvataggio» nel gioco vecchio (che quindi cambierebbe) oppure ripartire da
  zero con gli account.
- **Fase 5 — economia:** gli obiettivi della sezione 4.5 sono una proposta; li fissa Tancredi
  guardando i numeri del banco.
- **Fase 7 — nome e dominio:** con un server pubblico e gli account il nome diventa più visibile.
  «FIFA» è un marchio della federazione: EA ha tolto «FIFA» dal nome della serie, che dal 2023 si
  chiama EA Sports FC, quando è finita la licenza
  (https://www.techradar.com/news/ea-blows-the-final-whistle-on-30-year-fifa-partnership).
  Tancredi decide il nome del sito e del dominio.
- **Fase 7 — Oracle:** forma della macchina (core e RAM che la console concede davvero), regione,
  e se passare l'account a consumo per evitare che una macchina ferma venga ripresa.

## 8. Messaggio da incollare nella chat nuova

```
Leggi CLAUDE.md e docs/PIANO-3D-ONLINE.md per intero, poi in DIARIO.md solo le voci dal
21/10/2026 in poi. Trova l'ultima fase del piano già chiusa e fai la successiva, solo quella,
rispettando le decisioni della sezione 1. Prima di cominciare dimmi in poche righe cosa farai e
cosa misurerai; se una domanda della sezione 7 tocca questa fase, fammela subito. Alla fine:
misure in docs/DETTAGLI.md, voce in DIARIO.md, commit, pull request e merge su main.
Scrivimi sempre in italiano.
```
