# Studio di character design (22/10/2026)

Tancredi, 22/10/2026, dopo le foto delle 14 squadre (`docs/fase3/stili/`): i personaggi tornano
prototipi; prima se ne fa uno solo fino in fondo, poi gli altri. Lo stile cercato è da fumetto, con
i bordi neri come Mario Strikers, ispirato al manga recente. Questo file raccoglie la ricerca fatta
in rete, il vincolo che pone la telecamera del gioco, cosa si può fare nel codice e il metodo
proposto per arrivare allo stile. Ogni riga è nella forma osservazione → appiglio → conseguenza
(`CLAUDE.md`, «Analysis output format»).

Nota di partenza: il piano chiedeva già un «materiale a cartone animato (toon) con contorno e luce
di bordo» (`docs/PIANO-3D-ONLINE.md`, sezione 4.7). Il 22/10/2026 la scelta era passata al materiale
morbido e lucido; questo studio torna alla strada del piano.

## 1. Cosa mostrano i riferimenti

### Mario Strikers

- **Il contorno nero sta nelle illustrazioni, non nel gioco.** Nel portiere ingrandito dall'ingresso
  del Royal Castle (Super Mario Wiki, `MSBL_Royal_Castle_intro.jpg`, 1920 × 1080, ritaglio 360 × 320
  px intorno al portiere) il modello 3D non ha linee scure sul bordo: ombre morbide, sopracciglia
  disegnate nella texture. L'illustrazione di Wario (`MSBL_Wario_Artwork.png`, 1504 × 1334) ha invece
  linee d'inchiostro irregolari, tratteggio e schizzi di colore. Conseguenza: «bordi da fumetto come
  in Mario Strikers» vuol dire portare nel 3D il segno delle illustrazioni, cosa che Battle League in
  partita non fa; le tecniche per farlo vengono da altri giochi (Guilty Gear Xrd, Hi-Fi Rush, sotto).
- **Corpo base più equipaggiamento.** Il responsabile dei personaggi di Battle League descrive il
  lavoro come «personaggi base e set di equipaggiamento»
  (https://markhenriksen.artstation.com/projects/zPvXJZ, citato da una ricerca: la pagina risponde
  403 a una lettura diretta); i pezzi dell'equipaggiamento cambiano le statistiche, per esempio il
  Turbo Helmet dà Velocità +2 e Tecnica −2 (https://www.thegamer.com/mario-strikers-battle-league-football-gear-guide/).
  Conseguenza: un personaggio del gioco nuovo si progetta in due strati, il corpo con la sua faccia e
  l'equipaggiamento della squadra; è la struttura già scritta in `apps/web/game/parts.ts`, da rifare
  con lo stile nuovo.
- **Il tono è venuto da una scelta esplicita.** Super Mario Strikers (2005) nasceva come gioco di
  calcio più realistico ed è diventato «sopra le righe» dopo i confronti con Nintendo, che voleva
  stili aggressivi vicini alla personalità dei personaggi (https://en.wikipedia.org/wiki/Super_Mario_Strikers).
  Conseguenza: il carattere va deciso prima della forma; nel metodo della sezione 4 è il passo 2.

### Manga di calcio

- **Blue Lock costruisce ogni giocatore dal suo «ego».** Lo sceneggiatore Kaneshiro passa al
  disegnatore Nomura passato, personalità, un'idea dell'aspetto e l'ego principale del giocatore;
  poi insieme decidono capelli e gesti; le luci gialle dentro i capelli di Bachira sono un'idea di
  Nomura (https://animecorner.me/interview-muneyuki-kaneshiro-and-megumu-tsuchiya-on-creating-blue-locks-characters/).
  Nomura porta in Blue Lock gli occhi ricchi di dettagli e l'aura «da mostro» del suo lavoro
  precedente, per dare a ogni personaggio un aspetto suo
  (https://animecorner.me/interview-blue-lock-creators-muneyuki-kaneshiro-yusuke-nomura/).
  Conseguenza: per ogni nostro personaggio si scrive prima una riga di carattere (passo 2), e da
  quella escono capelli, occhi e gesti; occhi e aura sono gli strumenti dei primi piani.
- **Inazuma Eleven: Victory Road** ha modelli con contorni che riprendono la serie animata
  (https://www.cubed3.com/features/previews/inazuma-eleven-victory-road-tokyo-game-show); **Captain
  Tsubasa: Rise of New Champions** usa il toon shading con effetti realistici, secondo la scheda
  dell'editore riportata dai negozi (https://en.wikipedia.org/wiki/Captain_Tsubasa:_Rise_of_New_Champions).
  Conseguenza: due giochi di calcio con personaggi da anime (il primo del 2020, il secondo provato al
  Tokyo Game Show 2025): sono i confronti diretti per le prove di render del passo 8.

### Giochi che portano il fumetto e l'anime nel 3D

- **Guilty Gear Xrd (Arc System Works, GDC 2015).** Contorno con lo «scafo rovesciato»: una
  seconda copia del modello, gonfiata lungo le normali, di cui si disegnano solo le facce di dietro;
  il colore dei vertici decide lo spessore della linea e può cancellarla; le linee interne non si
  fanno con lo scafo; il principio è «uccidere tutto ciò che sembra 3D»
  (https://www.ggxrd.com/Motomura_Junya_GuiltyGearXrd.pdf, https://www.arcsystemworks.com/guilty-gear-xrd-art-talk-at-game-developers-conference-2015/).
  Le animazioni sono chiavi senza interpolazione, per imitare l'animazione giapponese a pochi disegni
  al secondo, con il gioco a 60 fotogrammi (https://steamcommunity.com/app/376300/discussions/0/487877107130580768,
  fonte secondaria). Conseguenza: lo scafo rovesciato con lo spessore per vertice è la tecnica più
  vicina al «bordo da fumetto»; le pose tenute sono una scelta da provare (domanda 3).
- **Lo stesso metodo, nel documento di Arc System Works sulle linee**
  (https://www.docswell.com/s/ASW_Academy/5LVY67-GG-Toonline-Eng): lo scafo rovesciato nasce con Jet
  Set Radio (2000); lo spessore cresce con la distanza dalla telecamera (distanza × tan(campo visivo /
  2)); il colore dei vertici vale 0,5 di norma, 0 toglie la linea, 1 la raddoppia; linee più sottili
  su capelli e dettagli, più spesse sui volumi; nelle pieghe si abbassa a 0,1 per chiudere i buchi.
  L'alternativa è un contorno in post-elaborazione (profondità e normali dei pixel vicini), uniforme
  su tutto lo schermo e con poco controllo per parte. Conseguenza: nel prototipo si provano tutte e
  due, con lo spessore per vertice scritto nel codice che costruisce il corpo.
- **Hi-Fi Rush (Tango Gameworks, GDC 2024)**: tutto il mondo, personaggi e ambienti, in toon
  shading, a 60 fotogrammi e risoluzione nativa, con un shader da fumetto, luci toon e ombre del viso
  dedicate (https://80.lv/articles/the-making-of-hi-fi-rush-s-3d-toon-rendering-style,
  https://gdcvault.com/play/1034251/3D-Toon-Rendering-in-Hi). Conseguenza: le ombre del viso vanno
  trattate a parte; nei giochi anime 3D si usano mappe disegnate per il viso (mappe SDF, come in
  Genshin Impact: https://github.com/NoiRC256/URPSimpleGenshinShaders).
- **Spider-Man: Into the Spider-Verse (Sony Imageworks)**: linee d'inchiostro costruite come
  geometria 3D, di tre tipi (forma nel modello, struttura disegnata come il mento sul collo, linee
  delle espressioni legate all'animazione); animazione quasi tutta «a due» (ogni posa tenuta 2
  fotogrammi), retinature a punti al posto delle sfumature, tratteggio nelle ombre, nessuna
  sfocatura di movimento, colori da pochi colori di partenza
  (https://www.cartoonbrew.com/feature-film/if-its-not-broke-break-it-sony-imageworks-renegade-approach-to-spider-man-into-the-spider-verse-167321.html).
  Conseguenza: retino e tratteggio sono il «fumetto» che il contorno da solo non dà; sono candidati
  per l'ombra dei personaggi e per gli effetti (scia della Cometa).

### Come si progetta un personaggio di un gioco

- **Team Fortress 2 (Valve, GDC 2008)**, gerarchia di lettura: squadra dal colore; ruolo da
  silhouette, proporzioni e arma; il contrasto più alto all'altezza del petto, con un passaggio dal
  piede scuro al petto chiaro. Processo in 6 passi: silhouette, forme interne, foglio del modello,
  modello 3D, texture, personaggio nel gioco. Le ombre vanno verso il freddo e non verso il nero;
  i bordi sono marcati da luci di contorno più che da linee scure
  (https://cdn.fastly.steamstatic.com/apps/valve/2008/GDC2008_StylizationWithAPurpose_TF2.pdf).
  Conseguenza: il colore della squadra sta sul petto e sulla maglia, la silhouette porta il ruolo;
  le ombre dei nostri personaggi vanno colorate (blu-viola), non grigie.
- **League of Legends (Riot)**: «la silhouette è la cosa più importante per riconoscere un
  campione»; ogni personaggio ha un tratto principale che non cambia mai, nemmeno nelle versioni
  alternative; la grandezza della silhouette dice il modo di giocare; da sola la silhouette deve dire
  dove guarda il personaggio; l'animazione aiuta, ma viene dopo
  (https://www.leagueoflegends.com/en-us/news/dev/clarity-in-league/). Conseguenza: ogni personaggio
  ha un tratto principale scritto nel suo foglio (per esempio la cresta, il ciuffo, le corna), che
  l'equipaggiamento della squadra non copre mai.
- **Linguaggio delle forme**: cerchio amichevole, quadrato stabile, triangolo energia o pericolo,
  spesso combinati (https://blog.cg-wire.com/character-shape-language/,
  https://dreamfarmstudios.com/blog/shape-language-in-character-design/, fonti divulgative).
  Conseguenza: le 21 figure delle carte (`packages/sim/src/data.ts`, `FIGURES`) si possono
  ridisegnare su queste tre forme: Muro e Roccia quadrati, Folletto e Spillo triangolari, Barile
  rotondo.
- **Proporzioni**: le figure dell'anime sono alte 7-8 teste, quelle deformate (chibi) 2-3 teste, con
  la testa fra un terzo e metà dell'altezza (https://en.wikipedia.org/wiki/Chibi_(style)). Conseguenza:
  la scelta delle teste dipende dalla telecamera, sezione 2.
- **Colore da anime**: due toni con il bordo netto (base e ombra), ombra spostata verso il viola o il
  blu, una luce principale sola (https://www.strayspark.studio/blog/how-to-get-anime-toon-look-blender).
  Conseguenza: con un gradiente a 2 o 3 gradini (three.js, `MeshToonMaterial.gradientMap`, filtro
  `NearestFilter`: https://threejs.org/docs/pages/MeshToonMaterial.html) il materiale dei personaggi
  diventa una texture di pochi pixel, senza costi di disegno.
- **Le fasi di un character design**, nelle guide trovate: brief e riferimenti, miniature di
  silhouette, forme e varianti, fogli di rotazione (davanti, tre quarti, lato, dietro), fogli delle
  espressioni, guida di stile con i limiti tecnici (poligoni, texture, shader). Le pagine trovate
  sono copie della stessa guida senza autore certo; le fonti citabili sono i libri della sezione 6.

## 2. Il vincolo della telecamera

La telecamera di partita (`docs/DETTAGLI.md`, «Telecamera: le prove») mostra un calciatore vicino
alto 56 px e uno lontano alto 43 px a 1280 × 720. La testa, a seconda delle proporzioni:

| Teste di altezza | Testa del calciatore vicino | Testa del lontano |
|---|---|---|
| 2,5 (i prototipi di oggi) | 22 px | 17 px |
| 3 | 19 px | 14 px |
| 3,5 | 16 px | 12 px |
| 4 | 14 px | 11 px |
| 5 | 11 px | 9 px |
| 7 (manga) | 8 px | 6 px |

- Un occhio da manga occupa circa un quarto dell'altezza della testa: a 7 teste sono 2 px in
  partita, a 3 teste 5 px. Conseguenza: in partita il personaggio si riconosce da silhouette,
  capelli e colore; occhi ed espressioni lavorano nei primi piani (ingresso in campo, esultanze,
  carte, menu), dove la testa supera i 100 px.
- Mario Strikers mette in partita personaggi di 45-55 px (`docs/DETTAGLI.md`, stessa sezione) con
  teste grandi. Conseguenza: per il manga recente servono arti più lunghi del chibi; la proposta è
  provare 3, 3,5 e 4,5 teste sullo stesso personaggio e scegliere guardando le foto in partita e da
  vicino (passo 4).

## 3. Cosa si può fare nel codice

La decisione della sezione 1 del piano è «personaggi disegnati nel codice, niente modelli esterni».

- **Le forme.** I prototipi sono sfere e capsule separate (`apps/web/game/parts.ts`): le giunture
  si vedono e il contorno di uno scafo rovesciato disegnerebbe una linea intorno a ogni pezzo, anche
  dentro il corpo. Conseguenza: per un contorno da fumetto il corpo deve essere una superficie unica.
  Nel codice si può fare descrivendo il corpo come campo di distanza (forme fuse con un'unione
  morbida) e trasformandolo in una mesh al caricamento (marching cubes o surface nets); i pesi delle
  ossa vengono dall'osso più vicino. Tempo di costruzione e triangoli per personaggio non sono
  misurati: sono la prima misura del prototipo.
- **I capelli manga** sono ciocche affusolate e curve con le punte nette: nel codice sono superfici
  costruite lungo curve (estrusioni a sezione che si stringe), con le luci interne dipinte nella
  texture, come i capelli di Bachira.
- **Il contorno.** Con i personaggi di oggi `/bench` ha misurato 245.861 triangoli e 40 chiamate di
  disegno, con una mediana di 6.820 triangoli a giocatore (questa chat, Chromium in software).
  Uno scafo rovesciato ridisegna i 10 personaggi: circa 68.000 triangoli e 1 chiamata in più, cioè
  circa 314.000 triangoli contro il budget di 300.000 (piano, sezione 4.6). Il contorno in
  post-elaborazione costa un passaggio a schermo intero e nessun triangolo. Conseguenza: o i
  personaggi scendono sotto circa 5.000 triangoli l'uno, o il contorno si fa in post-elaborazione; il
  prototipo misura le due strade. three.js 0.186.1 ha già lo scafo rovesciato
  (`three/examples/jsm/effects/OutlineEffect.js`).
- **Facce ed espressioni**: l'atlante disegnato con canvas, 8 espressioni per giocatore
  (`apps/web/game/faces.ts`), resta la strada; cambia il disegno: occhi manga con l'iride a
  disegno, linee spesse e sottili, il segno delle guance.
- **Animazione a pose tenute**: tenere ogni posa 2 fotogrammi su 60 si fa nel codice dei movimenti
  senza costi. Cambia la sensazione del gioco: è la domanda 3.

## 4. Metodo proposto

Ogni passo produce un'immagine o un numero da guardare; si va avanti solo con il sì di Tancredi.
Gli schizzi li faccio disegnando in codice (canvas e SVG per silhouette e fogli, three.js per il 3D):
non ho uno strumento che generi illustrazioni, quindi un disegno a mano di Tancredi o di un amico
accorcerebbe i passi 3-7.

1. **Brief**: tre parole che dicono il gioco (proposta da discutere: veloce, sfrontato, a fumetto),
   il pubblico (gli amici di Tancredi), i vincoli in numeri (56 px in partita, 300.000 triangoli,
   150 chiamate).
2. **Il primo personaggio**: passato, personalità, ego in una riga, come in Blue Lock; il suo tratto
   principale (Riot); una forma dominante (cerchio, quadrato, triangolo).
3. **Silhouette**: 12-20 silhouette nere del personaggio, ognuna a 56 px e a 400 px; prova di
   lettura: riconoscerlo in mezzo agli altri 9 a 56 px.
4. **Proporzioni**: la silhouette scelta a 3, 3,5 e 4,5 teste, in partita e da vicino.
5. **Forme interne e colori**: studio in grigi (il petto più contrastato, TF2), poi i colori della
   squadra, pelle e capelli; l'ombra colorata.
6. **Faccia**: occhi, sopracciglia, bocca, le 8 espressioni nello stile scelto, a 128 px e a 20 px.
7. **Foglio del modello**: davanti, tre quarti, lato, dietro.
8. **Prototipo 3D** dello stesso personaggio, in codice: contorno a scafo e in post-elaborazione,
   due e tre toni, pose tenute sì e no; foto affiancate in partita e da vicino, con triangoli e
   chiamate di disegno.
9. **Guida di stile** scritta (`docs/`): spessori delle linee, colori delle ombre, proporzioni,
   triangoli per personaggio, regole per capelli ed equipaggiamento; poi si applica agli altri
   personaggi, uno alla volta.

## 5. Domande per Tancredi

Risposte del 22/10/2026 nella sezione 7.

1. **Personaggi nel codice.** La decisione «niente modelli esterni» resta? Se resta, il corpo si fa
   con il campo di distanza della sezione 3; se cade, serve qualcuno che modelli in Blender e la
   regola della sezione 1 del piano cambia.
2. **Il primo personaggio**: uno nuovo che faccia da volto del gioco, o un giocatore che esiste già
   (per esempio l'attaccante dei Fulmini Rossi o un alieno della Cometa Verde)?
3. **Pose tenute** (animazione a 30 pose al secondo invece di 60, come Guilty Gear e Spider-Verse):
   da provare nel prototipo, o no?
4. **Quale manga**: Blue Lock, o anche altri (titoli, capitoli, tavole che ti piacciono)? «Manga
   recente» copre segni diversi: le tavole scelte da te fissano il riferimento.
5. **Chi disegna**: disegni tu, o qualcuno dei tuoi amici? Uno schizzo su carta, fotografato, vale
   più di molte mie prove in codice ai passi 3-7.

## 6. Testi utili

Se puoi procurarli, in quest'ordine di utilità per il lavoro:

- Tom Bancroft, *Creating Characters with Personality* (forma, misura e varianza, un capitolo sul
  passaggio al 3D; https://search.icpl.org/Record/1277092);
- Stephen Silver, *The Silver Way: Techniques, Tips, and Tutorials for Effective Character Design*;
- Michael Mattesi, *Force: Character Design from Life Drawing* (pose e gesti;
  https://www.allbookstores.com/Force-Character-Design-Life-Drawing/9780240809939);
- Preston Blair, *Cartoon Animation* (pose, peso, animazione a pose chiave;
  https://pcweenies.com/?p=13526);
- le slide e il video di Guilty Gear Xrd alla GDC 2015 (https://gdcvault.com/play/1022031/GuiltyGearXrd-s-Art-Style-The)
  e di Hi-Fi Rush alla GDC 2024 (https://gdcvault.com/play/1034251/3D-Toon-Rendering-in-Hi), che il
  GDC Vault dà solo con l'accesso;
- tavole dei manga che ti piacciono, fotografate: occhi, capelli, figure intere in corsa e al tiro.

Le immagini guardate per questo studio restano fuori dal repository, come le foto di Mario
Strikers della fase 2.

## 7. Risposte di Tancredi (22/10/2026)

- **Strumento**: nessuna regola sul codice; si fa ciò che dà il personaggio migliore. Il piano è
  aggiornato (`docs/PIANO-3D-ONLINE.md`, sezione 1, riga «Personaggi e animazioni»). Conseguenza: il
  campo di distanza della sezione 3 diventa una delle strade, da mettere a confronto con un modello
  fatto in Blender o altrove, sulle stesse foto.
- **Triangoli**: i 300.000 non sono un limite (piano, sezione 4.6). Conseguenza: lo scafo rovesciato
  non è più escluso dai 314.000 triangoli stimati nella sezione 3; decide la misura sul portatile.
- **Quanti personaggi**: per ora uno solo, finito. Resta da scegliere quale (uno nuovo che faccia da
  volto del gioco, o uno esistente) e chi disegna gli schizzi: domande per la chat nuova.
- **Pose tenute**: per ora no.
- **Manga di riferimento**: Dragon Ball (Akira Toriyama), Blue Lock (Yusuke Nomura), Dorohedoro (Q
  Hayashida), Naoki Urasawa. La chat nuova ne studia il segno prima del passo 2.
- **Testi**: Tancredi li manda nella chat nuova.

## 8. Messaggio da incollare nella chat nuova

```
Leggi CLAUDE.md e docs/PIANO-3D-ONLINE.md per intero, poi in DIARIO.md le voci dal 22/10/2026 in
poi e docs/STUDIO-PERSONAGGI.md per intero. Parti da main: c'è tutto il lavoro della chat
precedente; i movimenti a metà sono fuori da main e restano nella storia al commit ac0cd0d
(DIARIO.md, 22/10/2026), da non toccare in questa chat.

Il compito di questa chat è uno solo: il character design del gioco, fino a un personaggio finito
e ottimo che fissi lo stile di tutti gli altri. Non fare altri personaggi, movimenti, campi o
interfaccia.

Mie decisioni del 22/10/2026:
- stile da fumetto, con i bordi d'inchiostro delle illustrazioni di Mario Strikers: Battle League,
  e il manga come ispirazione: Dragon Ball (Toriyama), Blue Lock (Nomura), Dorohedoro (Hayashida),
  Naoki Urasawa; si copia lo stile, mai i personaggi;
- nessuna regola sullo strumento (codice, Blender o altro): si sceglie quello che dà il personaggio
  migliore, mettendo a confronto le prove con foto; prima di scegliere dimmi cosa si può usare in
  questa chat (programmi installabili, rete) e cosa servirebbe da me;
- i 300.000 triangoli non sono un limite: conta la misura dei fotogrammi sul mio portatile;
- niente pose tenute (animazione a 30 pose al secondo) per ora.

Prima di cominciare: ricerca sul segno dei quattro manga (linee e spessori, proporzioni, occhi,
capelli, ombre, corpi in movimento) e sui libri e le slide che ti mando in questa chat; scrivi in
docs/STUDIO-PERSONAGGI.md cosa prendi da ciascuno, con le fonti. Poi dimmi in poche righe cosa farai
e fammi le domande ancora aperte: quale personaggio (uno nuovo come volto del gioco o uno che
esiste già) e chi disegna gli schizzi.

Segui i 9 passi della sezione 4 dello studio: ogni passo finisce con immagini da mostrarmi e si va
avanti solo con il mio sì. Alla fine: guida di stile e misure in docs/, voce in DIARIO.md, commit,
pull request e merge su main. Scrivimi sempre in italiano.
```
