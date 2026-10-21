# Strike Legends nel browser — scelte e misure fino al 21/10/2026

> Questo file era `web/README.md` nel repository di prima, ora archivio (README.md, «Archivio»).
> I percorsi `js/` e `assets/` stanno in `web/`. I rimandi a `GDD.md`, `PRODUCTION.md`,
> `PROMPT-WEB*.md`, `game/` e ai diari puntano a file dell'archivio. Le sezioni hanno i nomi
> che il codice cita (per esempio `docs/DETTAGLI.md, "Passaggi"`).


Versione giocabile online del gioco: una pagina HTML con WebGL, senza installazioni.

## Cosa c'è

- **Titolo** (19/10/2026): «Fifa Tenkaichi 3» nella scheda del browser e nella schermata
  d'apertura (`index.html`), nell'intestazione dei menu (`js/ui.js`), sui cartelloni a bordo campo
  (`js/render.js`, `drawBoards`), e il logo nel cerchio di centrocampo al posto di «SL» (sezione
  «Campi», «Il titolo sul campo»). Codice,
  commenti e chiavi di salvataggio (`strikelegends.*`) restano col nome di prima, perché una chiave
  nuova lascerebbe indietro i salvataggi. «Strike Legends» resta nel messaggio d'errore dell'exe
  (`tools/web_launcher/platform_windows.go:39`), che cambia solo rifacendo l'exe; «Strike FC» e
  «Coppa Strike» sono nomi di club e di coppa.
- **Menu principale** con una partita fra IA che gira dietro, su un campo a tema scelto a caso.
- **Amichevole rapida** (`js/modes.js`): tu contro l'IA, due persone una contro l'altra, o due
  persone nella stessa squadra contro l'IA; qualunque squadra in casa e fuori, compresa la tua
  dell'Ultimate Team e le sei leggendarie; campo di casa o a scelta.
- **Ultimate Team** (`js/ut.js`): divisioni da 5 a 1 (stagioni di 5 partite, 10 punti per salire,
  3 o meno si scende), Coppa Strike, squadra, collezione con vendita, maglie e campo di casa,
  pacchetti, walkout. Tutto resta nel browser fra un accesso e l'altro (`localStorage`,
  chiave `strikelegends.save.v2`; crediti, statistiche e impostazioni del salvataggio v1 passano
  nel nuovo).
- **Carriera** (`js/career.js`) da allenatore o da giocatore, senza pacchetti.
- **Sfide** (`js/modes.js`, `SL.CHALLENGES`): 8 di base che insegnano un comando ciascuna, 5 medie,
  5 difficili.
- **Squadre leggendarie** (`js/modes.js`, `SL.LORE` in `js/data.js`).
- **Allenamento** con gli avversari fermi, su qualunque campo.
- **Impostazioni** (`js/settings.js`): formazione, partita, comandi con «Prova joypad», audio,
  video, telecamera, salvataggio.

## Joypad

Fino al 16/10 una partita da soli leggeva solo la tastiera: `pickDevices` assegnava `"kb0"` al
giocatore 1 anche con un joypad collegato, e il joypad funzionava solo nei menu. Da `js/input.js`
ogni persona ha un dispositivo `{kb, pad}`: tastiera e joypad insieme, e il joypad si legge dal
primo tasto premuto anche se si sveglia a partita iniziata.

- Disposizione **standard** del W3C (Chrome, Edge, Safari con Xbox Series via USB o Bluetooth):
  A=0, B=1, X=2, Y=3, LB=4, RB=5, LT=6, RT=7, View=8, Menu=9, croce 12-15
  ([w3c.github.io/gamepad](https://w3c.github.io/gamepad/#remapping)).
- Disposizione **xpad** (Firefox su Linux, `mapping` vuoto): View=6, Menu=7, grilletti sugli assi 2 e
  5, croce sugli assi 6 e 7.
- Ogni altra disposizione si registra a mano: Impostazioni → Comandi → Prova joypad → «Assegna i
  tasti», salvata nel browser per l'id di quel joypad.
- Due disposizioni dei tasti in partita: Classico (X tiro, B finta, RB cambia) e Stile FC (B tiro,
  X finta, LB cambia). Vibrazione su spallate e gol dove il browser la espone (`vibrationActuator`).
- **Prova joypad** mostra se la pagina può leggere i joypad (`document.featurePolicy.allowsFeature
  ("gamepad")`, e l'errore `SecurityError` che `getGamepads()` lancia quando la pagina che contiene
  il gioco lo vieta), ogni joypad visto con id e `mapping`, ogni tasto e asse grezzo, e l'azione che
  la partita legge. In Chrome la regola predefinita per i riquadri è `*`, cioè consentito
  ([MDN](https://developer.mozilla.org/docs/Web/HTTP/Headers/Permissions-Policy/gamepad)).
- Prova automatica (Chromium senza schermo, joypad finto con `mapping: "standard"`): la levetta porta
  il giocatore da x = -1,5 a x = -0,13 in 1,5 s, RT a 0,8 dà lo scatto a 6,2 m/s, A passa, Menu
  apre la pausa; con 11 tasti e 8 assi e `mapping` vuoto la lettura passa a xpad.

### Joypad PS4, ufficiali e non (20/10/2026)

- Un DualShock 4 che il browser riconosce (Chrome ed Edge con l'id Sony 054c, anche i cloni che lo
  copiano) arriva già con la disposizione `standard`, lo stesso ordine dell'Xbox per posizione: ✕ dove
  sta A, ○ dove sta B. Cambiano solo i simboli a schermo.
- Due casi arrivavano letti male (`js/input.js`, `profileName`):
  - **PS4 non riconosciuto** (cloni con un id loro, Windows senza driver Sony): `mapping` vuoto, 13 o
    più tasti, 10 assi. Ora profilo `ds4raw`, la disposizione DirectInput del database SDL dei
    controller (✕ b1, ○ b2, □ b0, △ b3, levetta destra a2/a5) e la croce sull'asse 9, un asse solo
    per le otto direzioni, che a riposo vale 9/7 e che si legge con gli stessi limiti del
    `DpadFromAxis` di Chromium (`gamepad_standard_mappings_win.cc`). Prima la croce non si leggeva.
  - **PS4 su Linux** senza disposizione standard (Firefox): 13 tasti, 8 assi, ordine del driver
    `hid-sony` (✕, ○, △, □). Prima era letto come un Xbox su Linux: △ e □ scambiati, L2, R2 e
    OPTIONS su View, Menu e levetta. Ora profilo `ds4linux`.
- Simboli PlayStation (✕ ○ □ △, L1, R2, OPTIONS) per ogni joypad con un nome Sony o letto con uno
  dei due profili PS4. Un joypad non riconosciuto, al collegamento, rimanda ad «Assegna i tasti».
- **Assegna i tasti** registra tasti, direzioni della croce su un asse, assi analogici (grilletti) e
  le due levette (destra e giù), uno alla volta, aspettando che tutto torni a riposo fra due nomi;
  con più joypad registra quello che si muove per primo. Le tabelle salvate prima (solo tasti)
  restano valide.
- Prova (Chromium senza schermo, joypad finti): PS4 DirectInput e PS4 Linux, ✕ avvia, croce giù
  scorre il menu, ✕ entra, ○ torna; in partita la riga dei comandi mostra ✕ □ ○, □ tira, △ fa la
  speciale. Joypad generico sconosciuto registrato con Assegna i tasti (10 tasti, la croce
  sull'asse 6, levette sugli assi 0, 1, 3, 2): dopo, il tasto 2 vale ✕/A, l'asse della croce dà su
  e giù, l'asse 3 la levetta destra.

### Joypad PS5 (19/10/2026)

- Un DualSense (Sony 054c, prodotto 0ce6) o un DualSense Edge (0df2) ha la stessa disposizione del
  DualShock 4 in ogni caso provato, quindi lo leggevano già i profili che c'erano: `standard` in
  Chrome ed Edge; `ds4raw` dove il browser non lo riconosce, perché la riga «PS5 Controller» per
  Windows del database SDL (https://github.com/mdqinc/SDL_GameControllerDB) ha ✕ b1, ○ b2, □ b0,
  △ b3, levetta destra a2/a5, come il PS4; `ds4linux` in Firefox su Linux, perché la riga per il
  driver `hid-playstation` ha ✕ b0, ○ b1, △ b2, □ b3, L2 a2, R2 a5, L3 b11, R3 b12, come
  `hid-sony`.
- Cambiato: il tasto a sinistra del touchpad, sul PS5, si chiama CREATE (prima il gioco scriveva
  SHARE: `js/input.js`, `labels`); i due profili si chiamano «PlayStation non riconosciuto
  (DirectInput)» e «PlayStation su Linux», il messaggio al collegamento «Joypad PlayStation
  collegato» (`js/ui.js`); l'aiuto di Impostazioni → Prova joypad dice PS4 e PS5.
- Prova (Chromium senza schermo, joypad finti, 7 casi): DualSense e DualSense Edge in Chrome;
  DualSense senza disposizione su Windows, con l'id di Chromium e con quello di Firefox; DualSense
  in Firefox su Linux; un clone con un id suo; per controprova un DualShock 4 in Chrome. In tutti
  e 7: 16 comandi (✕ ○ □ △, L1, R1, L2, R2, CREATE, OPTIONS, L3, R3, croce) e 4 assi delle levette
  letti giusti, nessun comando acceso a riposo; ✕ lascia la schermata d'apertura, croce giù sposta
  il cursore, ✕ entra in Ultimate Team, ○ torna indietro. CREATE sui 5 DualSense, SHARE sul clone e
  sul DualShock 4. Lo stesso giro prima della modifica: 16 comandi e menu uguali, SHARE ovunque.
- Non provato: la vibrazione del DualSense. Il gioco la chiede con `vibrationActuator`
  (`js/input.js`, `rumble`) solo dove il browser la offre per quel joypad.

### Menu col joypad (19/10/2026)

- **Difetto.** I menu segnavano la voce scelta con `:focus-visible`. Dopo un clic col mouse il
  browser non dà `:focus-visible` a un `focus()` chiamato dallo script: nel browser di prova, clic
  su una voce e poi croce giù, `document.activeElement.matches(":focus-visible")` → `false`. Righe,
  carte, pacchetti e pulsanti rossi non mostravano più dove si era, e il mouse fermo sopra una voce
  la teneva accesa con `:hover`. In più `.cta`, `.card` e `.pack` hanno `clip-path`, che taglia
  anche il contorno e l'ombra: sui pulsanti rossi il fuoco non si vedeva mai.
- **Correzione.** Il cursore è del gioco (`navCur` in `js/ui.js`, classe `.navcur`): lo muovono
  joypad, frecce e il mouse solo quando si sposta davvero (`mousemove`); il `focus()` del browser
  resta, ma il disegno non dipende più da lui, quindi regge anche in un riquadro di un altro sito
  che rifiuta il `focus()`. Dopo un ridisegno il cursore torna sull'elemento con gli stessi
  `data-*`. Pulsante rosso scelto: bianco; carta e pacchetto: più chiari e più grandi.
- **Ripetizione.** Croce o levetta tenute: il primo passo subito, il secondo dopo 0,35 s, poi uno
  ogni 0,15 s (`input.js`, `REPEAT_FIRST`, `REPEAT_EVERY`). Con il cursore su niente, la prima
  pressione lo mette sul primo pulsante.
- **Tutti i joypad.** I menu leggono ogni joypad collegato, non solo il primo della lista; un asse
  della levetta conta solo dopo essere stato visto a riposo (|valore| < 0,3), così un dispositivo
  con un asse fermo a −1 non tiene premuta una direzione.
- **Prova joypad.** Riga «Nei menu leggo»: su, giù, sinistra, destra, A, B, LB, RB, Menu, View come
  arrivano ai menu. Croce e levetta muovono il cursore; A tenuto un secondo preme il pulsante
  scelto, B tenuto un secondo esce, così una pressione breve resta una prova.
- Prova (Chromium senza schermo, gioco in un riquadro di un'altra origine, joypad vero all'indice 1
  e un dispositivo con l'asse a −1 all'indice 2, clic col mouse prima): croce giù sposta il cursore
  di una voce, tenuta 1,2 s lo porta da «Ultimate Team» a «Impostazioni», B torna indietro, A entra.

## Passaggi (19/10/2026)

- **Difetto.** Col passaggio il controllo passava subito al ricevitore (`setHuman` in `js/match.js`,
  `pass`), e la levetta ancora tenuta verso di lui lo faceva correre lungo la linea della palla. La
  palla parte a 12 m/s e il rallentamento (`C.drag` 0,55 al secondo) la porta sotto i 4,6 m/s della
  corsa dopo 1,74 s: il ricevitore scappava alla velocità della palla e il pallone non lo raggiungeva.
  Misura (`node tools/web_checks.js`, 200 passaggi a caso con la levetta tenuta 2,5 s): 56,5% al
  compagno scelto con avversari fermi (33% non lo prende nessuno), 44,5% contro l'IA.
- **Ricevitore.** Finché la palla viaggia verso di lui, per al massimo 2,5 s (`C.receiveMax`), il
  compagno corre da solo al primo punto della traiettoria che raggiunge di scatto (`meetPoint`); la
  levetta torna a guidarlo quando ha la palla. Un cerchio bianco segna il ricevitore mentre la palla
  viaggia. Vale anche quando il passaggio arriva da un compagno dell'IA o dal portiere.
- **Assistenza**, Impostazioni → Comandi → Passaggi, come i tre livelli di EA FC
  ([fifplay](https://www.fifplay.com/fc-25-controller-settings/),
  [FIFAUTEAM](https://fifauteam.com/fc-25-game-settings/)):
  - *Assistito*: compagno nella direzione della levetta, potenza secondo la distanza
    (min(12, 6 + 1,4 × distanza) m/s), passaggio alla pressione;
  - *Semi* (predefinito): stesso compagno, la potenza va dal 75% al 125% di quella con quanto si
    tiene premuto (0,5 s per il pieno, `C.passCharge`), passaggio al rilascio o a potenza piena;
  - *Manuale*: nessun compagno scelto, la palla va dove punta la levetta a 6-18 m/s secondo la
    pressione; il ricevitore è il compagno che arriva prima sulla traiettoria (`firstToBall`).
  - Mentre si tiene premuto, un arco azzurro attorno al giocatore cresce con la potenza; lo stesso
    arco, arancione, mostra la carica del tiro.
- **Misura dopo**, stessa prova:

  | Assistenza | Avversari fermi | Contro l'IA, normale |
  |---|---|---|
  | prima della modifica | 56,5% | 44,5% |
  | Assistito | 95% | 89,5% |
  | Semi, un tocco | 95% | 83,5% |
  | Semi, tenuto 0,25 s | — | 79,5% |
  | Manuale, tenuto 0,25 s | 74,5% (19% non lo prende nessuno) | — |

  Il banco dell'IA non cambia (4,75 gol, 10,5 cambi al minuto, 91% di passaggi riusciti): i
  passaggi fra IA non passano da questo codice. Nel browser, joypad finto, levetta tenuta verso un
  compagno a 7 m e A tenuto 0,25 s: 6 passaggi su 6 arrivati.

## Skill (19/10/2026)

`js/skills.js`. Col pallone, la levetta destra fa le skill come in EA FC
([FIFAUTEAM](https://fifauteam.com/fc-25-skill-moves/),
[Push Square](https://pushsquare.com/guides/fc-25-all-skill-moves-and-how-to-do-them)); sulla
tastiera i tasti 1-9. Le direzioni sono rispetto a dove guarda il giocatore.

| Tasto | Skill | Stelle | Levetta destra | Cosa fa |
|---|---|---|---|---|
| 1 | Tunnel | 1 | colpo avanti | palla a 7,5 m/s fra le gambe, il difensore non la ferma per 1,0 s |
| 2 | Trascinamento | 1 | colpo indietro | mezzo giro con la suola, poi indietro a 1,5 m/s |
| 3 | Finta di corpo | 2 | colpo a sinistra o a destra | 1,0 m di lato in 0,22 s |
| 4 | Doppio passo | 2 | quarto di giro da avanti a un lato | 0,3 m da un lato, poi 0,9 m dall'altro |
| 5 | Rullata | 2 | tenuta a un lato | di lato a 2 m/s finché si tiene, al massimo 0,6 s |
| 6 | Colpo di tacco | 3 | quarto di giro da dietro a un lato | taglio di 90° senza perdere velocità |
| 7 | Roulette | 3 | giro completo | giro su se stesso di 0,45 s in diagonale, intoccabile mentre gira |
| 8 | Sombrero | 4 | colpo indietro, poi avanti | calcio dopo 0,28 s, palla sopra la testa del difensore (picco circa 2 m), ricade circa 4 m avanti |
| 9 | Elastico | 5 | mezzo giro da un lato all'altro passando dietro | 0,35 m da un lato, 1,2 m dall'altro in 0,35 s |

- **Stelle dei giocatori** (sulla carta, accanto al ruolo): (valutazione − 50) / 10, +1 ali,
  +0,5 attaccanti, −1 difensori, +0,5 leggende e Mito, fra 1 e 5; portieri 1. Chi ne ha meno della
  skill non la riesce. La squadra iniziale dell'Ultimate Team ha 1-2 stelle.
- **Difensore che abbocca.** Un difensore dell'IA a meno di 2,2 m davanti abbocca con probabilità
  0,35 + 0,1 × stelle (−0,1 a difficoltà difficile, +0,1 a facile): resta sbilanciato dalla parte
  della finta per 0,35-0,8 s secondo le stelle (0,8 s il tunnel, che lo costringe a girarsi) e la
  sua spallata aspetta altri 0,5 s. Senza quel ritardo la spallata (7,2 m/s per 0,28 s, cioè 2 m
  di raggio) arrivava appena finito l'inganno e nessuna skill teneva la palla.
- **Misura** (`node tools/web_checks.js`): un difensore dell'IA davanti, skill a 1,6 m, poi scatto;
  palla ancora tua dopo 1,5 s su 200 prove: dritto 1%, girandogli attorno 2%; Tunnel 63%,
  Trascinamento 24%, Finta di corpo 70%, Doppio passo 70%, Rullata 69%, Colpo di tacco 73%,
  Roulette 73%, Sombrero 75%, Elastico 86%. I 10 gesti della levetta sono riconosciuti tutti.
- **IA.** Chi ha palla ed è pressato (avversario a meno di 1,5 m) tenta una skill fra quelle delle
  sue stelle con probabilità 0,01 / 0,02 / 0,035 a ogni decisione (ogni 0,1 s) secondo la
  difficoltà, dalla parte opposta al difensore. Banco su 48 partite, senza → con: 7,1 skill a
  partita, gol 4,13 → 4,23, cambi di possesso 10,5 → 9,9 al minuto, palla al piede 4,15 → 4,42 s,
  passaggi riusciti 91% → 92%. Su 12 partite il numero dei gol oscilla di ±1 fra due sorteggi:
  le differenze piccole si misurano su 48.
- **Disegno** (20/10/2026, senza Blender, su richiesta del proprietario). Le skill sono disegnate
  con i fogli che ogni figura ha già (`idle_stand`, `walk`, `run`, `shot`): la direzione del corpo
  fra le 8 dei fogli, un tratto del tiro come tocco, un saltello, e dove sta la palla mentre il
  giocatore la tiene (`POSE` in `js/skills.js`). `node tools/skill_frames.js <url> <cartella>`
  fotografa ogni skill dentro una partita in pausa, un fotogramma ogni 1/30 s, sul figurino base, su
  un corpo e su un personaggio. Tenute dopo i provini: trascinamento (la suola riporta la palla
  sotto il corpo, poi mezzo giro), roulette (giro in tutte le direzioni con la palla al centro),
  finta di corpo e doppio passo (il corpo si apre di 45° da una parte e poi dall'altra), elastico
  (la palla esce di 0,25 m e rientra dall'altra parte), rullata (passo laterale con la palla di
  fianco al piede), sombrero (caricamento del tiro, poi la palla sopra la testa del difensore).
  Tolte: tunnel e colpo di tacco, perché i fotogrammi del tiro sono un calcio intero e un tocco
  leggero disegnato con loro sembrava un tiro; restano con la corsa.
  - Il sombrero prima partiva subito, a 4,9 m/s verso l'alto, e passava all'altezza dei fianchi del
    difensore: ora parte al contatto del calcio (0,28 s) a 7,3 m/s verso l'alto e 5 m/s in avanti.
    Duello: 76% → 78%.
  - Tunnel e sombrero usavano il foglio `pass`, che i 10 corpi non hanno: `resolve` ripiegava sul
    figurino base e per un attimo il giocatore cambiava aspetto. Ora non lo usano più.
  - Le pose non cambiano il gioco: banco su 96 partite con la palla delle pose spenta → accesa,
    cambi di possesso 10,6 → 10,7 al minuto, palla al piede 4,10 → 4,04 s, passaggi riusciti 92% →
    92% (su 48 partite la differenza sembrava 10,5 → 11,0: era rumore).
- **FIFA Street** (2012) teneva i trucchi su un tasto più la levetta, con la palla ferma
  (Street Ball Control) e il tunnel (panna) premiato a punti
  ([GameSpot](https://www.gamespot.com/fifa-street-2012/reviews/fifa-street-review-6366375/?page=1)).
  Qui le skill restano sulla levetta destra senza tasto da tenere, come in FC; il tasto da tenere
  servirebbe se la levetta destra servisse ad altro.

## Tensione (20/10/2026)

La barra della mossa speciale è diventata la Tensione, proposta il 19/10 e approvata dal
proprietario: una barra di squadra come il Tension Gauge di Inazuma Eleven Victory Road
([LEVEL-5](https://www.level5.co.jp/blog_inazuma/en/230822/)), con la scadenza della sfera di Mario
Strikers Battle League ([Twinfinite](https://twinfinite.net/guides/mario-strikers-battle-league-how-to-do-a-hyper-strike/))
e il tiro caricato dai passaggi di Strikers Charged. Numeri in `C.tension` (`js/match.js`); misura: `node tools/tension_bench.js`.

- **Tre tacche** da 33,3 punti. Si caricano solo battendo l'avversario: dal 3° passaggio di fila
  senza tocchi avversari +2 a passaggio, intercetto +4, spallata che ruba palla +3, scivolata vinta
  +4, parata +2, gol subito +6. Il passaggio singolo e il tiro non parato non danno più niente
  (prima: +1,3 a passaggio riuscito, +3,9 a spallata, scivolata o parata, +7,8 a gol subito, +1,3 a
  tiro non parato).
- **Usi**, col tasto della speciale (Y, Spazio): con 1 tacca il **tiro caricato**, per 5 s: il
  primo tiro della squadra costa al portiere il doppio della riserva (fino a 68 invece di 34); con 3
  tacche, nella metà avversaria, il **Colpo della Cometa** di prima.
- **Rara:** piena, la barra resta piena 20 s, poi scende a 2 tacche (non in allenamento e nelle
  sfide di base, dove il tempo è libero). Durante la carica della Cometa (0,5 s) chi tira si può
  colpire: colpito, la mossa salta e le tacche sono perse; prima era intoccabile.
- **IA:** tiene le tacche per la Cometa e la tenta vicino alla porta; con meno di 8 s di barra piena,
  ovunque nella metà avversaria; negli ultimi 40 s spende le tacche rimaste in tiri caricati.
  (Provate e scartate: tiro caricato con 2 tacche → 0,06 Comete a partita; in svantaggio → 2,81
  tiri caricati a partita.)
- **HUD:** la barra ha le 3 tacche e la scritta «Tensione 2/3», «Cometa 14» (i secondi prima che
  scenda) o «Tiro caricato 4».
- **Misura**, 48 partite fra IA (12 coppie × 4), prima → dopo: punti a squadra 118,9 → 103,8
  (la proposta ne stimava 108); barre piene a squadra 0,85 → 0,49; prima barra piena al minuto
  2,88 → 3,19, raggiunta dall'85% → 48% delle squadre; Comete 1,40 → 0,60 a partita, fermate da una
  spallata 0,08; tiri caricati 0 → 1,60; barre scese a 2 tacche 0,31 a partita; gol 5,10 → 5,63.
- Nel browser (joypad finto): con 40 punti Y prepara il tiro caricato (barra a 7, «Tiro caricato
  5»), il tiro dopo è caricato; con la barra piena la Cometa parte e una spallata durante la carica
  la ferma.

## Ruoli (19/10/2026)

In `js/ai.js` (`ROLES`), presi da FC IQ di EA FC 25
([EA, Pitch Notes](https://www.ea.com/fr/games/ea-sports-fc/fc-25/news/pitch-notes-fc-25-fc-iq-deep-dive),
[Dexerto](https://www.dexerto.com/ea-sports-fc/every-fc-iq-player-role-and-focus-in-ea-fc-25-2838974/)):
ruolo, varianti e familiarità (Ruolo+ e Ruolo++). Ogni ruolo è una serie di scostamenti su quello
che l'IA già fa; il primo ruolo di ogni posto non ne ha, e con quelli il gioco è identico
fotogramma per fotogramma a prima (`ROLES=base node tools/ai_bench.js`).

| Posto | Ruolo (FC IQ) | Cosa cambia |
|---|---|---|
| ATT | Attaccante avanzato (Advanced Forward) | niente: l'IA di prima |
| ATT | Torre (Target Forward) | +2 m in attacco, larghezza ×0,25, preferisce il centro, non torna (resta alla metà campo e lascia i compiti difensivi agli altri), +0,15 al passaggio |
| ATT | Rapinatore (Poacher) | +2 m, larghezza ×0,6, pericolo del punto ×1,8, non torna, tira prima (−0,08 di linea libera richiesta) |
| ATT | Falso nueve (False 9) | −2,5 m, passaggio sicuro ×1,4, vicino a chi ha palla, +0,12 al passaggio |
| ALA | Ala (Winger) | niente |
| ALA | Ala interna (Inside Forward) | larghezza ×0,7, preferisce il centro, pericolo ×1,5, tira prima |
| ALA | Regista largo (Wide Playmaker) | −1,5 m, larghezza ×1,2, passaggio sicuro ×1,5, +0,1 al passaggio |
| CEN | Box to box | niente |
| CEN | Regista (Deep-Lying Playmaker) | −2 m, passaggio sicuro ×1,6, vicino a chi ha palla, +0,12 al passaggio |
| CEN | Mediano (Holding) | −3,5 m, preferisce il pressing |
| DIF | Difensore (Defender) | niente |
| DIF | Stopper | +0,5 m, preferisce il pressing e sta 0,3 m più vicino a chi ha palla |
| DIF | Difensore regista (Ball-Playing Defender) | +1 m, passaggio sicuro ×1,3, +0,1 al passaggio |
| POR | Portiere (Goalkeeper) | niente |
| POR | Portiere libero (Sweeper Keeper) | fuori dai pali ×1,8 |

- **Familiarità.** Dalle statistiche della carta nel suo posto (Torre su FIS, Rapinatore su TIR,
  i registi su PAS, Ala e Box to box su VEL): il ruolo che le somiglia di più è ++ da 80 in su e +
  sotto, il secondo è + da 70 in su. Gli scostamenti valgono ×0,6 senza familiarità, ×1 con +,
  ×1,25 con ++. Senza una scelta, ogni giocatore prende il suo ruolo più familiare per il posto.
- **Dove si sceglie:** Ultimate Team → Rosa: si sceglie un posto in alto, poi la riga «Ruolo» con
  sinistra e destra; vale per quella carta anche in amichevole. I club dell'IA giocano i ruoli
  familiari delle loro carte. Ogni formazione dichiara i suoi posti (`places` in `js/match.js`).
- **Misura del movimento** (`node tools/web_checks.js`, 12 partite fra IA per ruolo, un giocatore
  nel ruolo provato e gli altri nel primo ruolo; metri dalla propria porta):

  | Ruolo | Col pallone | Quando difende (palla nella sua metà) | Dal centro | Tiri | Passaggi | Spallate |
  |---|---|---|---|---|---|---|
  | Attaccante avanzato | 15,1 | 10,5 | 2,8 | 3,7 | 8,5 | 1,8 |
  | Torre | 14,9 | 13,5 | 1,5 | 3,2 | 10,2 | 0 |
  | Rapinatore | 15,7 | 12,6 | 2,5 | 5 | 5,2 | 0 |
  | Falso nueve | 9,3 | 8,4 | 2,3 | 1,3 | 15,4 | 2 |
  | Ala | 13,6 | 8,9 | 4,8 | 3 | 9,1 | 2,5 |
  | Ala interna | 12,8 | 9,8 | 3,4 | 4,3 | 9,2 | 1,7 |
  | Regista largo | 10,5 | 9,3 | 5,2 | 2,3 | 13,7 | 3 |
  | Box to box | 11,3 | 7,7 | 3,8 | 1,6 | 9,8 | 2,2 |
  | Regista | 9,3 | 7,1 | 3,5 | 1,2 | 13,2 | 2,8 |
  | Mediano | 7,5 | 7 | 3,9 | 1,3 | 11,2 | 3 |
  | Difensore | 7,1 | 5,4 | 2,5 | 0,8 | 12,1 | 1,8 |
  | Stopper | 6,1 | 5,7 | 2,5 | 1,3 | 15,3 | 3,4 |
  | Difensore regista | 8,4 | 5,4 | 2 | 0,4 | 15,2 | 2,2 |

  Portiere a 0,5 m dalla linea, portiere libero a 0,9 m. Le 9 direzioni attese (torre più alta
  quando difende e più centrale, falso nueve più basso, rapinatore che tira di più, mediano più
  basso, ala interna più centrale, stopper con più spallate, difensore regista più alto, portiere
  libero più fuori) tornano tutte.
- **Banco**, 48 partite, ruoli di base → ruoli delle carte: gol 4,23 → 5,46, tiri 15,9 → 18,6,
  cambi di possesso 9,9 → 10,4 al minuto, palla al piede 4,42 → 4,13 s, passaggi riusciti 92% →
  92%, squadra che difende larga 6,28 → 5,85 m. Una torre o un rapinatore che non tornano lasciano
  tre difensori su quattro attaccanti: i gol salgono, e le partite fra 4 e 8 gol restano 27 su 48.

## Distribuzione (19/10/2026)

`bash tools/build_web_dist.sh [cartella]` prepara le due cose da dare in giro; le copie del
20/10 (con Tensione e pose delle skill) sono in `tools/web_launcher/`. Tutte e due hanno `index.html` col `<!doctype html>` davanti:
la pagina pubblicata come artifact riceve lo scheletro dal servizio, un file aperto da solo senza
doctype andrebbe in modalità quirks.

- **`strikelegends-web.zip`** (5,7 MB, 427 voci): `index.html` alla radice, `js/`, `assets/`, il
  formato che itch.io chiede per un gioco HTML. Scompattato e servito da un server statico, nel
  browser di prova: modalità standard (`CSS1Compat`), menu con 7 voci, partita avviata, nessun
  errore.
- **`StrikeLegendsWeb.exe`** (14 MB, Windows a 64 bit), da `tools/web_launcher/` in Go con `web/`
  dentro (`go:embed`): serve il gioco solo su questo computer (127.0.0.1, porta 47820) e lo apre in
  una finestra senza schede né barra degli indirizzi (Edge, poi Chrome, con `--app`; altrimenti il
  browser predefinito). La porta resta la stessa a ogni avvio perché i salvataggi del browser
  appartengono all'indirizzo; un secondo avvio mentre il primo è aperto riapre la stessa finestra.
  La pagina avvisa il programma ogni 3 s; chiusa la finestra, il programma si chiude da solo
  (misurato: 17 s dopo). Electron non è stato usato: si scarica dai rilasci di github.com, che il
  proxy di questo ambiente rifiuta (403 il 19/10/2026).
  - L'exe non è firmato: al primo avvio Windows SmartScreen mostra «Windows ha protetto il PC» →
    «Ulteriori informazioni» → «Esegui comunque».
  - I salvataggi dell'exe sono di Edge per `http://127.0.0.1:47820`: separati da quelli della
    versione sul link e da quelli di itch.io.
  - Senza rete il gioco va lo stesso; solo i due caratteri di Google Fonts tornano a quelli di
    sistema (Arial Narrow, Segoe UI).
- **itch.io**: https://goleador0702.itch.io/fifa-tenkaichi-3 (progetto 5190226, in bozza), canale
  `html5`. Primo caricamento il 19/10/2026 da una chat: `butler push` dello zip (5,88 MiB, 208
  file) in 3,4 s, build 2162777 elaborata da itch.io in 7 s, versione `8a9596e`. Un `push`
  successivo aggiorna lo stesso file (19878189) e manda solo le differenze.
  - Rete di questo ambiente: `itch.io` e `api.itch.io` rispondono; `broth.itch.ovh` (502),
    `broth.itch.zone` (403), `butler.itch.ovh` (502), `html-classic.itch.zone` e
    `tankdrugo.github.io` (403) sono rifiutati. Senza `broth` butler non si scarica e non controlla
    gli aggiornamenti (lo scrive e va avanti); senza `html-classic.itch.zone` da qui non si vede il
    gioco servito da itch.io.
  - butler si compila dai sorgenti, che passano da `proxy.golang.org`:
    `GOBIN=<cartella> GOTOOLCHAIN=auto go install github.com/itchio/butler@master` (vuole Go 1.25,
    che `GOTOOLCHAIN=auto` scarica, e `gcc` per SQLite; 81 s, eseguibile da 36 MB). `@latest`
    risolve alla v14.14.0 del 2018, che con le librerie di oggi non compila.
  - Chiave: il proxy mette la chiave API di itch.io come `Authorization: Bearer` sulle richieste a
    itch.io, al posto dell'intestazione che manda il programma (`/profile` risponde 200 anche con
    un'intestazione finta). Con `BUTLER_API_KEY=x`, un valore qualsiasi, butler ha caricato.
  - butler carica solo su un progetto che esiste: prima della creazione rispondeva
    `invalid game`. Il progetto si crea dal sito (Dashboard → «Create new project», tipo HTML).
  - **Copertina** (`tools/cover/cover.jpg`, 1260 × 1000, il doppio dei 630 × 500 che itch.io
    consiglia): un calciatore inventato in rovesciata, con capelli dorati a punte dritte e un'aura a
    fiamme d'oro (chiesti da Tancredi), la scritta cromata stampata un
    po' fuori registro, i bollini «SUPER 3 IN 1» e «NEW!», il prezzo da mercatino, pieghe e
    angolo sbiadito. La rifà `node tools/cover/render_cover.js` da `tools/cover/cover.html`
    (SVG, caratteri Bangers, Permanent Marker e Saira da Google Fonts). Si carica a mano: l'API di
    itch.io non ha una chiamata per la copertina (Edit game → «Cover image»). Goku non c'è: è un
    personaggio di Toei e Shueisha, e le regole di itch.io chiedono materiale proprio o concesso
    (https://itch.io/docs/legal/terms).
  - Dopo il primo `push`, una volta, nella pagina di modifica del progetto:
    1. sul file `fifa-tenkaichi-3-html5.zip` spuntare «This file will be played in the browser»
       (finché non è spuntato l'API lo dà senza il tratto da browser);
    2. «Embed options»: 1280 × 720, «Fullscreen button» acceso; con «Click to launch in
       fullscreen» il gioco parte a tutto schermo e la tastiera arriva subito alla pagina;
    3. «Visibility & access»: «Draft» per provarlo da solo, poi «Restricted» (con password) o
       «Public»;
    4. nel gioco Impostazioni → Comandi → Prova joypad: la riga «Permesso della pagina» dice se il
       riquadro di itch.io lascia passare il joypad.
  - Stato al 19/10/2026: pagina pubblica (risponde 200) e gioco che parte nel riquadro (prova di
    Tancredi). Il riquadro ha `allow="… gamepad …"`; nel gioco la riga «Permesso della pagina» dice
    «permesso concesso» e il joypad funziona (prova di Tancredi). Il riquadro salvato per primo era
    1080 × 720: il gioco tiene l'altezza e taglia la larghezza (`render.js:680`, la tela prende la
    misura della finestra), e nel menu la porta di destra finiva sul bordo; a 1280 × 720 il campo
    intero resta 95 px dentro.

## Come si gioca in locale

I file si caricano con `fetch`, che da `file://` non funziona: serve un piccolo server.

    cd web && python3 -m http.server 8000

poi `http://localhost:8000` nel browser.

## Struttura

| File | Cosa fa |
|---|---|
| `index.html` | la pagina: stile, schermate, ordine degli script |
| `js/data.js` | club, squadre leggendarie, carte (leggende e Mito comprese), versioni, pacchetti, salvataggio |
| `js/input.js` | tastiera, joypad (disposizioni standard, xpad, assegnata a mano), vibrazione |
| `js/audio.js` | suoni sintetizzati con WebAudio (fischio, calci, folla) |
| `js/render.js` | disegno WebGL: fogli a indici di palette, campo e stadio pre-disegnati |
| `js/match.js` | la partita a 60 Hz: giocatori, palla, portiere, mossa speciale, IA, comandi |
| `js/ui.js` | navigazione, lancio della partita, HUD, pausa, risultati, ciclo principale |
| `js/modes.js` | amichevole rapida, squadre leggendarie, allenamento, sfide |
| `js/ut.js` | Ultimate Team: divisioni, coppa, squadra, collezione, maglie, pacchetti, walkout |
| `js/career.js` | carriera da allenatore o da giocatore |
| `js/settings.js` | impostazioni e Prova joypad |
| `js/skills.js` | skill: gesti della levetta destra, tasti 1-9, stelle, difensori che abboccano |
| `../tools/web_launcher/` | l'exe per Windows con il gioco dentro (`tools/build_web_dist.sh`) |
| `assets/sprites/` | i fogli degli sprite del gioco, copiati da `tools/build_web_assets.py` |

I fogli si aggiornano con `python3 tools/build_web_assets.py` dopo un nuovo render.

## Ritmo

Le velocità vere, misurate con il GPS, non vanno bene su un campo di 28 m. La velocità massima media
dei giocatori delle quattro migliori squadre di un Mondiale è **8,34 m/s**. A quella velocità il
nostro campo si attraversa in circa 3 s, e una partita fra IA del 16/10 dava **33 cambi di
possesso al minuto**, cioè un possesso ogni 0,96 s. Su un campo vero da 105 m la stessa velocità
richiede circa 12 s.

Valori di oggi (`js/match.js`, `C`):

- corsa 4,6 m/s e scatto ×1,35 (6,2 m/s): il campo si attraversa in circa 6 s di corsa;
- spallata a 7,2 m/s per 0,28 s, con una protezione di 0,8 s per chi ha appena preso palla;
- l'IA colpisce una volta ogni 16, 11 o 8 s (facile, normale, difficile), e una squadra al massimo
  una volta ogni 20 s;
- un passaggio lo intercetta solo chi sta a 0,4 m dalla sua linea (0,55 m per chi lo riceve);
- riserva di parata 100, costo 34 a 28 m/s, ricarica 0,7 al secondo.

Dodici partite fra IA da 4 minuti, prima e dopo:

| | Prima | Dopo |
|---|---|---|
| cambi di possesso al minuto | 33 | 11,3 |
| durata di un possesso | 0,96 s | 3,7 s |
| spallate a partita | 104 | 20 |
| gol a partita | 5,5 | 4,83 (9 partite su 12 fra 4 e 8) |

Fonti: [velocità massime ai Mondiali](https://doaj.org/article/a5c187472d324e64a97f772bb8083f81),
[distanze e quote di corsa in partita](https://sportmont.ucg.ac.me/clanci/SM_June_2025_Katanic.pdf).

## Personaggi

Undici figure: player01 com'è, più dieci corpi ricavati da lui con le proporzioni di
`tools/bodies.json` (Toro, Folletto, Torre, Muro, Lampo, Roccia, Testone, Spillo, Barile, Ragazzo).
`tools/render_sprites.py` con `BODY` scala busto, spalle, braccia, collo e testa, ingrossa o
assottiglia le gambe, e fissa il risultato come posa di riposo. `tools/render_bodies.py` rende i
fogli di un giocatore di movimento per ogni corpo, in `web/assets/bodies/`. Le gambe cambiano solo di
spessore, perché seguono le giunture delle clip. Ogni carta ha il suo corpo, l'altezza sullo schermo
(da 0,92 a 1,07) e i colori di pelle e capelli; il portiere resta player01, l'unico coi fogli del
portiere.

**Undici personaggi VRoid** dal VRoid Project, CC0 o licenza VRoid Hub che consente tutto
(`assets_raw/SOURCES.md`, «VRoid CC0»): Shibu, Ombra, Bibi, Vita, Vicky, Matricola, Recluta, Coda,
Ciuffo, Fumiriya, Shino (`tools/characters.json`). Passano nella stessa pipeline di player01:

1. `tools/fetch_vroid_cc0.sh` li scarica da opengameart.org, controlla gli sha256, li porta a 4,28
   teste con `tools/vrm_proportion_rewrite.py` e li mette sulle gambe di player01 con
   `tools/vrm_match_legs.py` (mezzo giro per i VRM 0.x, che guardano verso −z; anche, ginocchia,
   caviglie e punte sulle quote di riposo di player01, così le clip li muovono con uno scarto fra
   le articolazioni di 0,025 m al massimo sui 110 fogli);
2. `tools/render_characters.py` rende i dieci fogli di un giocatore di movimento (`RECOLOR=1` in
   `tools/render_sprites.py`: capelli castani, maglia azzurra della divisa, pantaloni grigi), in
   `assets/chars/<id>/`, e riprende da dove si è fermato;
3. `tools/build_web_assets.py` li aggiunge all'indice come `<id>/<foglio>`.

Risultato del 16/10: 110 fogli (10 per personaggio), 0 celle tagliate, 4,4 MB; circa 2,1 s a cella
con tre Blender insieme nel container.

Le carte usano corpi e personaggi insieme (`SL.FIGURES` in `js/data.js`). Un personaggio senza un
foglio usa quello di player01.

## Campi

Dodici campi in `js/render.js` (`THEMES`), da scegliere nella preparazione della partita (riga
«Campo»). Il rettangolo di 28 × 16 m, le porte e le righe hanno le stesse misure ovunque; cambiano
il fondo, il colore delle righe, ciò che sta intorno, la luce sui giocatori e il tempo.

| Campo | Fondo | Intorno | Altro |
|---|---|---|---|
| Stadio di notte | erba a strisce | tribune, fari | |
| Stadio di giorno | erba a strisce | tribune, sole, nuvole | luce calda 5% |
| Tramonto | erba | tribune, sole basso | luce arancio 12% |
| Spiaggia | sabbia, righe blu | mare, ombrelloni, palme | |
| Campo innevato | neve, righe rosse | tribune innevate | neve che cade |
| Gabbia di quartiere | asfalto crepato, righe gialle | palazzi, rete, lampioni | |
| Cratere Lunare | regolite con crateri, righe luminose | bordo del cratere, lander, Terra, cupole | gravità della palla ×0,6 |
| Cimitero di Nottefonda | erba scura | castello, luna rossa, pipistrelli, lapidi | nebbia |
| Bocca del Vulcano | basalto con crepe di lava | vulcano, fossato di lava, rocce | braci |
| Officina Neon | lamiere rivettate, righe neon | tubi, ingranaggi, insegne | |
| Ponte del Galeone | assi di legno | mare, alberi e vele, barili | |
| Ghiacciaio | ghiaccio | montagne, blocchi di ghiaccio | neve che cade |

Gli sfondi stanno entro 4,5 m d'altezza sopra la fila lontana: la visuale larga arriva a circa
z = −13,7 m equivalenti (271 px dall'alto della texture del terreno), e la telecamera può salire
2 m oltre il bordo lontano quando la palla è da quella parte (`setCamera`).

### Il titolo sul campo (19/10/2026)

- Nel cerchio di centrocampo, su tutti e 12 i campi, il logo della copertina: 4,6 m di larghezza
  (il cerchio ne misura 5,2), schiacciato come il terreno, al 62% di opacità, così le righe ci
  passano sotto (`js/render.js`, `buildGround`). Sui cartelloni, i due pannelli «FIFA TENKAICHI 3»
  hanno il viola e il rosso della copertina e la scritta su una riga (`drawBoards`).
- Sono due immagini, `assets/logo/ft3_logo.png` (585 × 302) e `assets/logo/ft3_wordmark.png`
  (495 × 85), fatte da `tools/cover/render_cover.js` con lo stesso disegno della copertina: il
  carattere Bangers arriva da Google Fonts solo quando si rifanno, quindi nell'exe senza rete il
  campo resta uguale.
- Se le immagini non arrivano, il campo torna alla scritta «FT3» e i cartelloni al testo semplice.
  Prova con le due richieste bloccate: gioco avviato, menu raggiunto, nessun errore.
- Provato nel browser su Stadio di notte, Campo innevato, Spiaggia, Officina Neon e in una partita
  vera al calcio d'inizio: il logo si legge su erba, neve, sabbia e lamiera; i giocatori sopra
  restano contornati.

## Squadre leggendarie

Sei squadre in `js/data.js` (`SL.LORE`), ognuna con un popolo, una storia, un campo e una maglia a
due colori. Il motivo si disegna sulla maglia nello shader (`js/render.js`, `FS`): ogni giocatore ha
due righe di palette, la maglia e il suo secondo colore, diverse solo sulle voci `kit`, e
`u_pattern` sceglie dove si vede la seconda in pixel della cella da 128.

| Squadra | Popolo | Campo | Maglia | Pelle e capelli (`LOOKS`) |
|---|---|---|---|---|
| Cometa Verde | alieni | Cratere Lunare, gravità ×0,6 | verde e blu, luminosa che pulsa | 8, verde |
| Conti di Nottefonda | vampiri | Cimitero di Nottefonda | cremisi e nero, fascia | 9, pallida |
| Ciurma del Mare Storto | pirati | Ponte del Galeone | nero e bianco, righe | 10, abbronzata |
| Draghi di Brace | draghi | Bocca del Vulcano | arancio e rosso, cerchi | 11, rosso fuoco |
| Unità V-0LT | robot | Officina Neon | azzurro e magenta, a metà | 12, metallo |
| Yeti del Passo Gelato | yeti | Ghiacciaio | bianco e celeste, zigzag | 13, bianca |

Ogni squadra ha sette giocatori con nome (carte «Mito», 77-89). La prima vittoria contro una di
loro porta la carta Mito del suo attaccante nella collezione dell'Ultimate Team. Anche tre club
normali hanno un secondo colore: Marea Blu a cerchi, Corvi Neri a righe, Viola Tempesta a fascia.

## Ultimate Team

- **Rarità:** bronzo 58-66, argento 67-74, oro 75-84, campione 85-91; leggenda 88-95 (12 campioni
  ritirati del mondo inventato, con una riga di storia); mito (le squadre leggendarie).
- **Versioni speciali** di una carta da 85 in su, con le stesse statistiche: olografica (12%),
  numerata da 1 a 10 (5%, il numero si estrae all'apertura), oro unica (1%, una sola copia per
  collezione: una seconda estrazione esce olografica). In collezione ogni copia è una voce a sé
  (`{k, id, v, n}`); vendita: valore della rarità ×1, ×2, ×3, ×5.
- **Walkout** per ogni pacchetto con un giocatore da 85 in su: luci, ruolo, club, valutazione, il
  giocatore che cammina verso lo schermo (il foglio `walk`, riga di fronte), la carta. 6,6 s, A o
  Invio per saltare.
- **Pacchetti:** Bronzo 400, Argento 1.200, Oro 3.000 (leggenda 1%), Campioni 7.500 (leggenda 4%),
  Leggende 20.000 (leggenda 15%).
- **Gestione del club** (19/10/2026). Entrando nell'Ultimate Team si è nel club, con 7 schede da
  scorrere con LB e RB sul joypad, Q ed E sulla tastiera: Gioca (divisione e coppa), Rosa,
  Mercato, Pacchetti, Obiettivi, Collezione, Stadio (maglie, motivo, campo, nome). La scheda resta
  quella lasciata; finita una partita si torna al club. Amichevole, allenamento e sfide tengono i
  menu di prima.
- **Mercato.** 12 offerte di carte che non hai, estratte bronzo 34%, argento 30%, oro 22%, campione
  10%, mito 3%, leggenda 1%; elenco nuovo dopo ogni partita dell'Ultimate Team, o subito per 100
  crediti. Prezzo di una carta scelta: da 5 a 8 volte il suo valore di vendita rapida lungo
  l'intervallo di valutazione della rarità (bronzo 300-480, argento 900-1.450, oro 2.500-4.000,
  campione 7.500-12.000), da 6 a 9 volte per mito e leggende (10.800-16.200, 24.000-36.000): più di
  una carta media di pacchetto della stessa rarità, perché si sceglie. Vendere: una carta fuori
  dalla squadra va in vendita al 95% del prezzo di mercato (commissione del 5%, come sul mercato di
  EA FC) e l'incasso arriva alla fine della partita dopo; finché è in vendita non entra in squadra.
  La vendita rapida della collezione resta, subito e al valore più basso. Acquisto e riscatto si
  confermano con una seconda pressione.
- **Obiettivi.** 12, ognuno riscattabile una volta: prima vittoria 300, 3 vittorie di divisione
  800, 15 gol 600, 60 passaggi riusciti 500, 10 spallate a segno 500, 10 skill 600, una vittoria
  senza gol subiti 600, 5 pacchetti 700, un acquisto al mercato 300, cinque titolari da 75 in su
  1.000, una promozione 2.000, una Coppa Strike 1.000. Le partite di divisione e di coppa fanno
  avanzare i contatori (`record` in `js/ut.js`, dalle statistiche della partita); un pallino sulla
  scheda segna un obiettivo da riscattare.
- Prova nel browser (joypad finto): dal menu principale A su Ultimate Team, RB sette volte passa
  per le 7 schede e torna a Gioca; acquisto di un bronzo da 400 crediti, obiettivo «Primo acquisto»
  riscattato (+300), una carta messa in vendita e venduta a fine partita per 380 crediti.

## Carriera

- **Allenatore:** un club fra gli otto, rosa di 8 (i cinque del club più tre vicini alla sua
  valutazione), al massimo 10. Campionato a 8 squadre, 7 giornate (girone all'italiana col metodo
  del cerchio). A ogni giornata si pagano gli stipendi (valore/40), si incassano 60 k€ in casa e il
  premio (80 vittoria, 30 pareggio). Mercato di 14 giocatori che cambia a ogni giornata; cessione al
  90% del valore. Valore in k€ = 7 × (valutazione − 55)², ×1,15 sotto i 22 anni, in calo del 12%
  all'anno dopo i 29. Le partite degli altri si simulano con gol di Poisson, media
  1,9 + (differenza di valutazione)/9.
- **Crescita:** chi gioca accumula esperienza (×1,4 sotto i 23 anni, ×0,5 dopo i 28, più con le
  vittorie); a 4 punti sale di 1 fino al potenziale. A fine stagione: un anno in più, calo di 1-3
  dopo i 30, ritiro probabile dai 35, due giovani dal vivaio, premio per il piazzamento.
- **Giocatore:** crei il tuo calciatore (nome, ruolo, fisico fra corpi e personaggi, aspetto), parte
  da 62 a 18 anni. In partita controlli solo lui (`lock` in `js/match.js`). Voto da 4 a 10 da gol,
  passaggi, contrasti e risultato; il voto moltiplica l'esperienza. A fine stagione fino a tre
  offerte di club con valutazione vicina alla tua.

## Sfide

Base, a campo libero con gli avversari fermi (il portiere para dove serve): entrare in area, 3
passaggi, un gol, 3 secondi di scatto, una spallata vinta, una scivolata vinta, un gol di
pallonetto, il Colpo della Cometa con la barra piena. Medie e difficili sono partite con un
obiettivo (scarto di gol, porta inviolata, rimonta da 0-2, tre spallate, gol da due). Si contano
dagli eventi della partita (`match.events`: `pass`, `hit`, `tackle`, `shot`, `goal` con `chip` e
`worth`, `specialResult`). Premio alla prima riuscita: 300, 800, 2.000 crediti.

## Impostazioni

| Scheda | Cosa |
|---|---|
| Formazione | Rombo 1-2-1, Quadrato 2-2, Piramide 2-1-1, Muro 3-1, Tridente 1-1-2 (`SL.FORMATIONS` in `js/match.js`), con lo schema; cambio automatico; spallate dell'IA |
| Partita | durata, difficoltà, gol d'oro, IA avversaria, disegno della spallata |
| Comandi | Prova joypad, disposizione Classico o Stile FC, vibrazione, comandi a schermo, schema |
| Audio | volume generale, effetti, pubblico, telecronaca, telecronista sì/no |
| Video | schermo intero, nomi sui giocatori (nessuno, il tuo, tutti), tempo atmosferico, scossa |
| Telecamera | inquadratura (10,5 m, 13,5 m, campo intero), velocità nel seguire la palla (1,6, 3,2, 6,0 al secondo), anticipo su chi ha palla |
| Salvataggio | azzera l'Ultimate Team, la carriera, o tutto |

## Telecronaca

Frasi in italiano in `assets/voice/lines.json`: 53 testi in 20 momenti (inizio, gol, gol da due,
pallonetto, pareggio, vantaggio, parata, riserva del portiere quasi finita, palo, spallata,
scivolata, intercetto, uscita del portiere, sei passaggi di fila, mossa speciale, mossa sprecata, gol
d'oro, ultimo minuto, fine con vincitore o pari) e i nomi delle 14 squadre, letti dopo un gol e alla
fine. `js/voice.js` li lega agli eventi della partita (`match.events`), con una pausa di 9 s fra due
frasi dello stesso tipo e senza parlare sopra la frase precedente, salvo gol, mossa speciale, gol
d'oro e fine, che la interrompono.

- **Con Chatterbox:** `tools/make_commentary.py` registra ogni testo con Chatterbox Multilingual
  (Resemble AI, lingua `it`) sulla CPU del container, un `.mp3` mono a 64 kbit/s per testo, e
  scrive i nomi dei file in `lines.json`. Il gioco suona le clip su un canale suo e abbassa il
  pubblico sotto la voce.
- **Senza le clip:** legge i testi con la voce italiana del browser (Web Speech API), dove esiste.
- **Stato al 16/10/2026:** il pacchetto `chatterbox-tts` si installa da pypi, ma i pesi del modello
  (`huggingface.co/ResembleAI/chatterbox`) arrivano da `us.aws.cdn.hf.co`, che il proxy della rete
  dell'ambiente rifiuta (`CONNECT tunnel failed, response 403`). Le clip si generano appena quel
  dominio è consentito.

## IA

Le decisioni delle squadre stanno in `js/ai.js` (prima erano in `match.js`, `thinkAi` e
`aiCarrier`); `match.js` tiene i movimenti con cui le eseguono. Si pensa ogni 0,1 s.

### Da dove viene ogni parte

| Parte | Cosa fa nel gioco | Fonte |
|---|---|---|
| Forma che segue il pallone | ogni posto della formazione si sposta col pallone: in possesso avanza di 4 m più metà della posizione del pallone e si allarga del 20%; senza palla arretra, si stringe al 78% e scivola verso il lato del pallone, mai più di 9,5 m dietro di esso | posizionamento a triangolazione di Delaunay di Akiyama e Noda, RoboCup 2D ([Gliders2d](https://arxiv.org/pdf/1812.10202), [JSAI 2007](https://www.ai-gakkai.or.jp/jsai2007/data/pdf/100194.pdf)); qui una regola lineare al posto della triangolazione |
| Punti di appoggio | chi attacca senza palla prova 25 punti fino a 5 m dal suo posto e prende quello con il passaggio più sicuro, più spazio, più minaccia e almeno 3,2 m dai compagni; la scelta dura 0,6 s | `SupportSpotCalculator` di Simple Soccer, M. Buckland, *Programming Game AI by Example* ([O'Reilly](https://www.oreilly.com/library/view/programming-game-ai/9781556220784/chapter-77.html)) |
| Spazio come tempo | un punto è di chi ci arriva prima (distanza su velocità più 0,2 s di reazione all'avversario) | pitch control di W. Spearman ([Training Ground Guru](https://archive.trainingground.guru/articles/william-spearman-how-liverpool-create-pitch-control)), field control di Fernández e Bornn, *Wide Open Spaces* (MIT Sloan 2018) |
| Valore della posizione | una minaccia per ogni punto, più alta vicino alla porta e al centro; passaggio e dribbling valgono la minaccia dopo l'azione per la probabilità che riesca, meno quella che si regala perdendo palla lì | expected threat di K. Singh ([socceraction](https://socceraction.readthedocs.io/en/stable/documentation/valuing_actions/xT.html)) |
| Sicurezza del passaggio | per ogni avversario, tempo per arrivare sulla traiettoria contro tempo della palla | probabilità di passaggio di Soccermatics, lezione 6 ([soccermatics](https://soccermatics.readthedocs.io/en/latest/lesson6/PassProbability.html)) |
| Tiro | una regola più che un valore, perché la parata la decide la riserva del portiere (`keeperSaves`): si tira con la linea libera in zona (soglia 0,20 sotto i 6 m, 0,33 sotto i 9,5, 0,55 oltre; 0,15 quando la riserva è sotto il costo di una parata), nell'angolo con la linea più libera, e si rinuncia se un difensore la chiude durante la carica | |
| Difesa a ruoli | il primo difensore si mette fra chi ha palla e la porta (a 1,7, 1,35, 1,1 m per difficoltà) e prova spallata o scivolata; il secondo copre 4,5 m dietro e 1,4 m verso il centro; gli altri tagliano le linee verso i due ricevitori più pericolosi, dal lato della porta; i compiti si danno con la corsa totale più corta fra le 24 combinazioni | le note di EA su FC 26 chiedono «more support» e difensori «positionally-responsible» ([EA, Pitch Notes FC 26](https://www.ea.com/es/games/ea-sports-fc/fc-26/news/pitch-notes-fc26-gameplay-deep-dive)); la marcatura delle linee dal modello di pressing di [Bojinov e Bornn](https://sloansportsconference.com/research-papers/the-pressing-game-optimal-defensive-disruption-in-soccer) |
| Palla vagante | ognuno calcola quando arriva sulla traiettoria del pallone che rotola (attrito del gioco) e il primo di ogni squadra ci va | |
| Portiere | sulla linea fra il centro della porta e il pallone, più avanti man mano che il pallone si avvicina (da 0,55 a 1,5 m) | portiere «line-based», il migliore nello studio TU Delft sull'AI World Cup (+27% sul portiere di base, [repository TU Delft](https://repository.tudelft.nl/file/File_b626f6f1-4c5f-4208-9b4f-7985843e19a0?preview=1)) |
| Difficoltà | tempo di reazione (0,42, 0,26, 0,14 s) prima che chi ha palla agisca e che la squadra passi in difesa, rumore sulle scelte, distanza del pressing, frequenza delle scivolate | il bot di Google Research Football regola la difficoltà col tempo di reazione e di decisione ([arXiv 1907.11180](https://arxiv.org/pdf/1907.11180)) |

### Misura prima e dopo

`node tools/ai_bench.js 12 4 <difficoltà>`: 12 partite fra IA da 4 minuti senza browser, le stesse
coppie di club e gli stessi semi; prima = l'IA del commit `844e66b` (`--root` su quel commit),
dopo = `js/ai.js`, con le stesse rose e formazioni. Il possesso è della squadra dell'ultimo giocatore
che ha avuto la palla al piede. A difficoltà normale (le altre due nel diario):

| | Prima | Dopo |
|---|---|---|
| gol a partita | 3,00 | 4,42 |
| partite fra 4 e 8 gol | 5 su 12 | 8 su 12 |
| tiri | 13,6 | 16,2 |
| spallate | 19,1 | 17,1 |
| scivolate dell'IA | 0 | 0,8 |
| cambi di possesso al minuto | 11,7 | 10,2 |
| palla al piede per possesso | 3,65 s | 4,17 s |
| passaggi riusciti (quota) | 117,1 (88%) | 105,1 (91%) |
| compagno più vicino | 4,26 m | 4,63 m |
| squadra che difende, lunga × larga | 9,84 × 5,53 m | 7,13 × 6,33 m |
| 3 o più giocatori a 3 m dalla palla | 2,1% dei campioni | 1,0% |

Con le rose del 16/10 (prima delle carte nuove) e tutte le squadre in rombo, l'IA di prima dava gli
11,5 cambi al minuto e i 3,62 s di palla al piede del §0 (11,3 e 3,7 misurati allora): il banco
riproduce quel metodo. La difficoltà pesa: difficile contro facile finisce 12 vittorie su 12
(7,58 gol a 0,67), anche a campi invertiti (7,17 a 0,42; `SKILLS=2,0` e `SKILLS=0,2`).

### Registro delle modifiche misurate (sessione del 19/10/2026)

Ogni riga: stesso banco, `node tools/ai_bench.js 12 4 1`, prima → dopo la modifica.

| Modifica | Gol | Cambi al minuto | Palla al piede | Passaggi riusciti | Altro |
|---|---|---|---|---|---|
| Portiere escluso da spallata, bersaglio e scivolata (`match.js`, `nearestOpponent`, `lunge`; `ai.js`, `tryWinBall`) | 4,42 → 4,75 | 10,2 → 10,5 | 4,17 → 4,16 s | 91% → 91% | colpi al portiere 1,7 → 0,0 a partita |
| Ricevitore che va incontro alla palla, assistenza Assistito / Semi / Manuale (`match.js`, `pass`, `meetPoint`, `stepHumans`) | 4,75 → 4,75 | 10,5 → 10,5 | 4,16 → 4,16 s | 91% → 91% | passaggi di una persona al compagno scelto, contro l'IA: 44,5% → 83,5% (Semi), 89,5% (Assistito) |
| Skill con la levetta destra, IA che le usa (`skills.js`; `ai.js`, `trick`, `wary`), banco su 48 partite senza → con | 4,13 → 4,23 | 10,5 → 9,9 | 4,15 → 4,42 s | 91% → 92% | 7,1 skill a partita |
| Ruoli di FC IQ (`ai.js`, `ROLES`), banco su 48 partite con i ruoli di base → con i ruoli delle carte | 4,23 → 5,46 | 9,9 → 10,4 | 4,42 → 4,13 s | 92% → 92% | squadra che difende larga 6,28 → 5,85 m |
| Tensione e pose delle skill (`match.js`, `C.tension`; `skills.js`, `POSE`), banco su 96 partite: Tensione senza tiri caricati dell'IA e senza la palla delle pose → versione finale | 5,25 → 5,77 | 10,6 → 10,7 | 4,10 → 4,04 s | 92% → 92% | Comete 1,40 → 0,60 a partita, tiri caricati 1,60 (misura a parte su 48 partite) |

`node tools/web_checks.js` gioca senza browser le situazioni di una persona col joypad, ognuna con
il numero che deve dare: spallata sul portiere che ha la palla → il portiere la tiene (prima della
modifica: la perdeva); la stessa spallata su un giocatore di movimento → la palla cambia piede.

## Gioco nuovo · fase 0, fondamenta (21/10/2026)

Piano e decisioni in `docs/PIANO-3D-ONLINE.md`. Qui le scelte della fase 0 con il loro perché e le
misure. `web/` non cambia: `git diff` contro `main` su `web/` dà 0 righe.

### Cosa c'è

| Percorso | Cosa |
|---|---|
| `package.json`, `pnpm-workspace.yaml`, `pnpm-lock.yaml` | workspace pnpm con `apps/*` e `packages/*`; `web/` e `tools/` ne restano fuori |
| `tsconfig.base.json`, `eslint.config.mjs`, `vitest.config.mts` | TypeScript `strict` per tutti i pacchetti, lint, prove |
| `packages/shared` | schemi zod: righe della pagina di stato, risposta di `/health`, messaggi WebSocket (`ping`, `pong`, `hello`, `error`) |
| `apps/realtime` | server Node: `GET /health` (stato proprio e di Redis), WebSocket `/ws` con messaggi fino a 1.024 byte |
| `apps/web` | Next.js: `/status` (i quattro servizi e un WebSocket aperto dal navigatore), `/api/status` in JSON, `/api/health` per Docker |
| `infra/docker-compose.yml`, `infra/.env.example` | Postgres, Redis, realtime, web con controlli di salute, volumi `pgdata` e `redisdata` |
| `infra/check-status.mjs` | verifica dall'esterno: `/api/status` e 20 ping WebSocket; codice 0 solo se tutto risponde |
| `.github/workflows/ci.yml` | tre lavori: tipi, lint, prove, build; immagini amd64 e arm64 con l'avvio delle arm64 sotto QEMU; `docker compose up` con `check-status.mjs` |

### Versioni e perché

| Cosa | Versione | Perché |
|---|---|---|
| Next.js, React | 16.4.2, 19.3.1 | decisione di Tancredi (piano, sezione 1); ultime su npm al 21/10/2026 |
| TypeScript | 6.0.3, non 7.0.2 | `typescript-eslint` 8.72.0 accetta `typescript >=4.8.4 <6.1.0` (`npm view typescript-eslint peerDependencies`): con la 7 il lint non legge i tipi; si passa alla 7 quando quel limite sale |
| ESLint | 10.13.0, senza `eslint-config-next` | npm segna la 9.39.5 «This version is no longer supported»; `eslint-config-next` 16.4.2 porta `eslint-plugin-react` 7.37.5, `eslint-plugin-import` e `eslint-plugin-jsx-a11y`, che accettano ESLint fino alla 9. Le regole di Next.js (`@next/eslint-plugin-next` 16.4.2, 22 regole `core-web-vitals`) e degli hook di React (`eslint-plugin-react-hooks` 7.1.1) si prendono direttamente. Mancano le regole di accessibilità di `jsx-a11y`: il contrasto lo prova axe-core nella fase 4 (piano, sezione 4.1) |
| Vitest | 5.0.5 | esegue TypeScript senza costruire prima, una sola configurazione per tutti i pacchetti; la fase 1 ci porta le prove di `tools/` |
| zod | 4.6.7 | lo nomina il piano (sezione 3) per i messaggi fra client e server |
| ws | 8.22.0 | Node 22 e 24 hanno il client WebSocket (lo usano le prove e `check-status.mjs`) ma non il server |
| redis (node-redis) | 6.3.0 | il client del progetto Redis (https://github.com/redis/node-redis), in JavaScript: 0 file nativi |
| pg | 8.23.1 | driver Postgres in JavaScript: 0 file nativi nello standalone; lo schema e gli strumenti di migrazione li sceglie la fase 5 |
| esbuild | 0.28.2 | `apps/realtime` diventa un file solo, `dist/server.mjs` da 2,5 MB, costruito in 0,7 s: l'immagine non ha `node_modules` |
| pnpm | 10.28.0 (c'è la 12.14.0) | è la versione installata nelle chat cloud (piano, sezione 2): nessuno scaricamento di corepack nelle chat |
| Node nelle immagini e in CI | 24.22.0 | supporto fino al 30/04/2028, la 22 fino al 30/04/2027 (https://nodejs.org/en/about/previous-releases). `engines` chiede `>=22.12`: le chat hanno Node 22.22 e le prove passano su entrambe |
| Postgres, Redis | 18.6, 8.10.2 | ultime stabili su Docker Hub al 21/10/2026 (Postgres 19 è alla rc1) |

L'immagine `node:24.22.1-alpine3.24` è uscita il 21/10/2026 alle 11:38 UTC senza nessuna
architettura dentro: il primo giro di CI è fallito con «no match for platform in manifest». Si usa
la 24.22.0 del 14/10/2026, che ha amd64 e arm64. Prima di alzare un'etichetta va guardato che le
abbia tutte e due (`https://hub.docker.com/v2/repositories/library/node/tags/<etichetta>`).

### Scelte di struttura

- **Import con `.ts` ed `erasableSyntaxOnly`:** Node 22.22 esegue i sorgenti senza costruirli
  (`node apps/realtime/src/main.ts` parte e risponde su `/health`), quindi i banchi della fase 1
  potranno girare con `node` su `packages/sim` come oggi `tools/*.js` su `web/js/`.
- **Immagini senza emulazione:** la fase di costruzione gira sull'architettura di chi costruisce
  (`FROM --platform=$BUILDPLATFORM`), quella finale copia soltanto. Funziona perché lo standalone
  di Next.js, tolti `sharp` e `libvips` (`next.config.ts`, `outputFileTracingExcludes`; nessuna
  pagina usa l'ottimizzatore di immagini), scende da 61 a 23 MB e contiene 0 file `.node`. Una
  libreria nativa futura (argon2 nella fase 5) dovrà installare i binari per arm64 con
  `supportedArchitectures` di pnpm, oppure costruire sotto QEMU.
- **Postgres e Redis non esposti sul PC:** solo i contenitori li raggiungono, così un Postgres già
  installato da Tancredi sulla porta 5432 non blocca `docker compose up`.
- **Postgres 18:** l'immagine tiene i dati in `/var/lib/postgresql/18/docker`, quindi il volume va
  su `/var/lib/postgresql` (`infra/docker-compose.yml`).
- **Redis con `--appendonly yes`:** sessioni e code sopravvivono al riavvio del contenitore.
- **Controlli con scadenza:** ogni controllo della pagina di stato si ferma a 2 s
  (`packages/shared/src/status.ts`, `timed`); i client Redis hanno `disableOfflineQueue`, quindi
  con Redis spento la riga diventa rossa subito invece di aspettare.
- **Contrasto della pagina di stato:** con la formula WCAG, sullo sfondo il testo fa 15,5:1 e il
  rosso 8,1:1; il valore più basso è il rosso sui riquadri della tabella, 7,1:1 (AA chiede 4,5:1).

### Misure

| Misura | Valore |
|---|---|
| `node tools/web_checks.js` prima / dopo | 11 `ok` su 11 / 11 `ok` su 11, stesse righe (4 min 51 s) |
| `pnpm install` | 15,0 s con la cache vuota (primo giro, ancora con ESLint 9), 1,5 s con la cache piena; 311 pacchetti nel lockfile, 627 MB in `node_modules/.pnpm` |
| `pnpm typecheck`, `pnpm lint`, `pnpm test` | 5,7 s; 2,7 s su 17 file; 8 prove su 8 in 1,5 s |
| build | `apps/web` 14,3 s, `apps/realtime` 0,7 s |
| CI, tre lavori in parallelo (secondo giro) | tipi-lint-prove-build 32 s, compose 60 s, immagini 77 s |
| `docker compose up` in CI (GitHub Actions, Node 24.22.0) | 17,6 s dal primo contenitore creato a web sano |
| `check-status.mjs` in CI | web 1,3 ms, realtime 4,6 ms, Postgres 18.6 1,5 ms, Redis 8.10.2 2,4 ms; WebSocket mediana 0,44 ms su 20 ping, massimo 4,33 ms |
| memoria a riposo in CI (`docker stats`) | web 89,3 MiB, realtime 52,7 MiB, Postgres 35,2 MiB, Redis 6,0 MiB: 183,2 MiB in tutto |
| immagini arm64 | costruite su amd64 senza emulazione; sotto QEMU `node -p process.arch` dà `arm64`, web risponde a `/api/health`, realtime risponde 503 su `/health` (nessun Redis nel lavoro, come previsto) |
| `docker image ls` in CI | `ft3-web` 66,1 MB e `ft3-realtime` 62,6 MB per arm64, 271 MB e 246 MB per amd64. La differenza di 4 volte non viene dal contenuto, che è lo stesso standalone su due basi `node:24.22.0-alpine3.24`: il comando conta in modo diverso le immagini dell'architettura del runner. Quanto scarica Oracle si misura quando le immagini andranno in un registro (fase 7) |
| pila locale senza Docker (chat, Redis 7.0.15 e Postgres 16.15 del contenitore, Node 22.22) | web risponde a `/api/health` 651 ms dopo l'avvio; `check-status.mjs`: web 1,6 ms, realtime 4,5 ms, Postgres 1,3 ms, Redis 3,8 ms, WebSocket 0,27 ms di mediana su 20 ping |
| WebSocket dal navigatore (Chromium senza schermo, `/status`) | collegato, mediana 0,6 ms su 10 ping |
| Redis spento | `/api/status` risponde 503, le righe Redis e realtime diventano rosse («acceso, ma non raggiunge Redis»), Postgres resta verde |

### Cosa non è provato

- **`docker compose up` in questa chat:** l'avvio di `dockerd` (piano, sezione 6) è stato rifiutato
  due volte dal controllo dei permessi della sessione. Le prove con Docker sono quelle di GitHub
  Actions; nella chat la pila è girata senza Docker, con le versioni del contenitore (Postgres 16 e
  Redis 7 invece di 18 e 8). La strada per sbloccarlo è in `docs/PROPOSTA-FASE-0.md`.
- **`docker compose up` sul PC di Tancredi** con Docker Desktop: lo fa Tancredi (`README` proposto
  in `docs/PROPOSTA-FASE-0.md`).
- **Proxy delle chat dentro `docker build`:** non provato, perché Docker non è partito.
