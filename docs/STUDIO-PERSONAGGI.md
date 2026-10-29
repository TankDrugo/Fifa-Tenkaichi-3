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
  l'equipaggiamento della squadra; è la struttura già scritta in `apps/web/game/render/parts.ts`, da rifare
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

- **Le forme.** I prototipi sono sfere e capsule separate (`apps/web/game/render/parts.ts`): le giunture
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
  (`apps/web/game/render/faces.ts`), resta la strada; cambia il disegno: occhi manga con l'iride a
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

## 9. Il segno dei quattro manga (ricerca del 22/10/2026, chat del character design)

Fonti lette in questa chat; le pagine di wiki dei fan con le tavole (`*.fandom.com`) e il sito
ufficiale di Dragon Ball rispondono 403 dalla rete della chat, l'articolo tecnico di CGWORLD
sull'anime di Dorohedoro era in manutenzione: le misure sulle tavole (spessori in pixel, teste di
altezza) si fanno sulle foto che manda Tancredi. I libri e le slide annunciati nel messaggio di
apertura non erano allegati al 22/10/2026: la sezione 6 resta l'elenco da procurare.

### Akira Toriyama (Dragon Ball)

- **Linee e spessori.** Toriyama inchiostra con un pennino Zebra G (circa 40 pagine per pennino) e
  inchiostro Pilot, a volte pennarelli Copic e Pigma; le linee lisce, dice, vengono dalla carta
  liscia (intervista via mail del 19/03/2010,
  https://www.kanzenshuu.com/translations/training-manga-mind-akira-toriyama-qa, domande 1 e 3). Il
  pennino G allarga la linea quando si preme. Conseguenza: il contorno del nostro personaggio ha uno
  spessore che cambia lungo il tratto, non costante; nello scafo rovesciato è il colore dei vertici
  (sezione 1, Guilty Gear Xrd).
- **Ombre.** Il suo editore Torishima racconta che Toriyama usava le campiture nere perché
  all'inizio non aveva i soldi per i retini; Toriyama dice di aver imparato dall'anime di Dragon
  Ball e da Toyoo Ashida che i colori separati, non sfumati, rendono l'illustrazione più leggibile
  e più facile da colorare (https://en.wikipedia.org/wiki/Akira_Toriyama, sezione «Style», note
  107 e 112). Conseguenza: ombre a gradino netto (2 toni) e il nero pieno come terzo valore per le
  zone più scure; nessuna sfumatura morbida sul corpo.
- **Profondità.** «Nel mio stile non uso molte tecniche per dare profondità, ma la profondità la
  tengo a mente» (stessa intervista, domanda 4). Conseguenza: è la regola di Guilty Gear Xrd
  («uccidere tutto ciò che sembra 3D», sezione 1): niente luce speculare, niente occlusione
  morbida sul personaggio; il volume lo danno la silhouette e il gradino dell'ombra.
- **Capelli.** I capelli del Super Saiyan sono biondi perché lasciarli bianchi sulla pagina
  risparmiava l'inchiostro del nero pieno a un assistente (Hiroyuki Nakano, caporedattore di
  Shōnen Jump, https://www.animenewsnetwork.com/interest/2018-03-20/editor-in-chief-explains-why-dragon-ball-super-saiyan-hair-turns-blond/.129245).
  Conseguenza: in quel segno i capelli sono una massa grafica col contorno, riconoscibile dalla
  forma anche senza il riempimento; i nostri capelli si progettano come sagoma (passo 3) prima che
  come colore.
- **Personaggi piccoli e riconoscibili.** Per gli sprite di Dragon Quest, che sono minuscoli,
  basta un tratto distintivo per riconoscere il personaggio (Toriyama, 1995, Wikipedia, nota 126);
  per Goku ha attenuato i tratti distintivi per mettere in risalto personalità e movimenti (2010,
  domanda 9); i personaggi più potenti spesso sono piccoli (nota 128). Conseguenza: a 56 px in
  partita (sezione 2) il personaggio porta un tratto solo, grande; la forza si dice con la posa,
  non con la stazza.
- **Forme.** Il segno passa dalle forme tonde di Dr. Slump agli angoli più vivi della seconda metà
  di Dragon Ball (James S. Yadao, *The Rough Guide to Manga*, citato da Wikipedia, nota 129).
  Conseguenza: è il cerchio e il triangolo della sezione 1 dentro un autore solo: tondo per i
  volumi grandi (testa, busto), punte per capelli, mani e scarpe.
- **Corpi in movimento.** Nei combattimenti inclina le vignette e ne cambia la misura; nei
  movimenti continui usa vignette lunghe «per far capire dove si muovono e come» (2010, domanda
  5). Conseguenza: ogni posa del personaggio deve far leggere la direzione del moto da sola; è il
  controllo della silhouette in posa al passo 3.

### Yūsuke Nomura (ノ村優介, disegni di Blue Lock)

- **Occhi e aura.** Nomura porta da *Dolly Kill Kill* (2014) l'abitudine di caricare di dettagli
  gli occhi e di disegnare l'aura come un mostro; in Blue Lock aura e sequenza del tiro sono prese
  dal manga di combattimento per farsi capire anche da chi non segue il calcio
  (https://animecorner.me/interview-blue-lock-creators-muneyuki-kaneshiro-yusuke-nomura/).
  Conseguenza: l'occhio ricco di dettagli (iride disegnata, riflessi, ciglia) vale per i primi
  piani sopra i 100 px (sezione 2); l'aura è il linguaggio per tiro caricato e Cometa, cioè per gli
  effetti, non per il corpo.
- **Ogni giocatore con un aspetto suo.** Lo scopo dichiarato è distinguersi dagli altri manga di
  calcio con l'aspetto di ciascun personaggio (stessa intervista); i capelli e i gesti nascono
  dall'ego scritto dallo sceneggiatore, e le luci dentro i capelli di Bachira sono un'idea di
  Nomura (https://animecorner.me/interview-muneyuki-kaneshiro-and-megumu-tsuchiya-on-creating-blue-locks-characters/).
  Conseguenza: confermato l'ordine del passo 2 (riga di carattere, poi capelli e gesti); i riflessi
  dei capelli sono disegnati nella texture, a strisce, non calcolati dalla luce.
- **Il nome.** Il disegnatore si firma ノ村優介, con la «ノ» in katakana; «野村» è un altro, l'attore
  del film (ricerca su Natalie, https://natalie.mu/comic/artist/116600). Conseguenza: le ricerche in
  giapponese sul suo segno vanno fatte con ノ村.

### Q Hayashida (Dorohedoro)

- **Texture a mano.** Ha studiato pittura a olio all'Università delle Arti di Tokyo e lavora con
  vernici e stoffe (https://en.wikipedia.org/wiki/Q_Hayashida); le copertine sono collage con
  vernice spray, stoffa e il cartone delle scatole di Amazon (intervista a SigIkki riportata da
  https://animefeminist.com/the-devils-in-the-details-the-grotesquely-charming-world-of-hayashida-q);
  nelle tavole usa inchiostro e texture a mano con pochissimo retino
  (https://noflyingnotights.com/blog/2014/12/19/dorohedoro-vols-1-13/). Conseguenza: la «grana» del
  fumetto viene da una texture disegnata dentro l'ombra (tratteggio, segni di pennello), non da un
  filtro su tutto lo schermo; si prova al passo 8 solo nei primi piani, perché a 56 px un
  tratteggio sotto 2 px diventa grigio.
- **Linea ruvida.** La critica descrive il segno «ruvido e abbozzato, ma dettagliato con pazienza»
  e lo accosta a Kentaro Miura, Pushead, Simon Bisley, Tsutomu Nihei, Katsuhiro Otomo
  (https://en.wikipedia.org/wiki/Dorohedoro, sezione «Reception»). Conseguenza: il contorno può
  avere piccole irregolarità volute (spessore che oscilla lungo il bordo, interruzioni), ottenibili
  con un rumore sullo spessore per vertice; da mettere a confronto con il contorno regolare di
  Toriyama al passo 8.
- **Teste e maschere.** I protagonisti hanno teste non umane o mascherate (Caiman con la testa di
  lucertola, il tifoso di *Hanshin Hangi* con un sacco in testa) e la recensione nota corpi e
  maschere abbinati a facce e caratteri in contrasto (fonti sopra). La statuina in scala 1/6 di
  Caiman (210 cm nella storia) cambia espressione con due facce di lucertola da montare
  (https://www.goodsmile.info/en/product/5246/Caiman.html). Conseguenza: per la squadra della
  Cometa Verde e le altre squadre non umane il riconoscimento passa dalla forma della testa; le
  espressioni si fanno cambiando la parte della faccia, che è il nostro atlante di facce
  (`apps/web/game/render/faces.ts`).
- **Dorohedoro in 3D.** L'anime di MAPPA (2020) è il primo lavoro dello studio con una produzione
  basata sul 3D: secondo l'analisi di CGWORLD il 42% delle inquadrature è in 3D con resa a celle, il
  18% disegnato a mano, il 40% le due cose insieme, compresi effetti disegnati sopra i modelli
  (https://cgworld.jp/feature/202004-cgw260hs3doro.html, https://cgworld.jp/feature/202010-cgj-doro.html;
  numeri presi dal riassunto del motore di ricerca, perché il sito era in manutenzione: da
  ricontrollare sulla pagina). Conseguenza: il caso più vicino al nostro (fumetto ruvido portato in 3D) usa il
  modello 3D per il corpo e il disegno per gli effetti; per noi gli effetti (aura, Cometa) restano
  disegnati, con sprite o texture animate, sopra il personaggio 3D.

### Naoki Urasawa (Monster, 20th Century Boys, Pluto)

- **Facce che cambiano.** «Non ci sono facce uguali in situazioni diverse»: cerca i cambiamenti
  sottili da un momento all'altro e consiglia agli studenti un corso di recitazione prima della
  scuola d'arte (intervista a Japan House Los Angeles, 2019,
  https://j-generation.com/2019/01/naoki-urasawa-interview-monster-20th-century-boys-2019/).
  Conseguenza: le 8 espressioni dell'atlante sono il minimo; nei primi piani la faccia si compone da
  parti con un valore continuo (angolo delle sopracciglia, apertura di occhi e bocca), non da 8
  disegni fissi.
- **Scheletro, poi posa, poi penna.** Parte dallo scheletro («basta un piccolo cambiamento per
  cambiare la personalità»), decide l'emozione della vignetta, poi la postura, poi disegna; sconsiglia
  l'abitudine «prima il cerchio della testa, poi le spalle»
  (https://www.toy-people.com/en/?p=81923, che riprende Toyo Keizai Online). Conseguenza: il passo
  3 disegna silhouette in posa (tiro, esultanza, attesa), non solo in piedi; il carattere si legge
  da spalle, schiena e mani.
- **Il naso prima di tutto.** Disegna il naso per primo, «per fissare il centro», e in 20th Century
  Boys ogni personaggio importante ha un naso suo (corto e a punta, grande, largo) legato al
  carattere, sulla scia di Tezuka e Ishinomori (stessa fonte). Conseguenza: nella nostra faccia il
  naso, che nei prototipi è un punto (`docs/fase3/stili/`), diventa un tratto di carattere: una
  forma scelta al passo 6, visibile nei primi piani e nella silhouette di profilo.
- **Riconoscibili da soli.** I critici notano personaggi riconoscibili uno per uno e la somiglianza
  con attori del cinema; Natsume colloca il suo segno vicino a Katsuhiro Otomo dal 1979
  (https://en.wikipedia.org/wiki/Naoki_Urasawa, sezione «Style»). Conseguenza: le proporzioni della
  faccia (distanza fra gli occhi, lunghezza del naso, mascella) variano davvero da un personaggio
  all'altro, non solo capelli e colore; per il primo personaggio si fissano le misure che gli altri
  potranno spostare.

### Cosa prendo da ciascuno

| Parte del segno | Da chi | Regola per il primo personaggio | Dove si prova |
|---|---|---|---|
| Contorno | Toriyama (pennino G), Hayashida (linea ruvida) | spessore che cambia lungo il tratto, più grosso sul bordo esterno che dentro; irregolarità da provare | passo 8, scafo con spessore per vertice contro contorno a schermo |
| Ombre | Toriyama (neri e colori separati), TF2 (ombra fredda) | 2 toni a gradino netto più il nero pieno; ombra blu-viola, mai grigia | passo 5 in grigi, passo 8 nel 3D |
| Grana | Hayashida | tratteggio dentro l'ombra solo nei primi piani | passo 8, primo piano a 400 px |
| Proporzioni | Toriyama (piccolo e forte), sezione 2 (56 px) | prova a 3, 3,5 e 4,5 teste; la forza nella posa | passo 4 |
| Occhi | Nomura per i primi piani, Toriyama per la partita | iride disegnata sopra i 100 px; due segni semplici sotto i 20 px | passo 6, a 128 e a 20 px |
| Naso e faccia | Urasawa | naso come tratto di carattere; parti con valori continui | passo 6 |
| Capelli | Toriyama (massa col contorno), Nomura (luci dentro i capelli) | sagoma riconoscibile anche nera; riflessi dipinti a strisce | passi 3 e 6 |
| Corpo in movimento | Toriyama (direzione leggibile), Urasawa (emozione, poi postura) | silhouette in posa che dice direzione e stato d'animo | passo 3 |
| Effetti | Nomura (aura), Dorohedoro anime (effetti disegnati sopra il 3D) | aura e Cometa disegnate, non nel modello | dopo questo personaggio |

## 10. Strumenti provati in questa chat (22/10/2026)

| Strumento | Prova | Risultato | Uso proposto |
|---|---|---|---|
| Blender come modulo Python (`bpy` 5.2.3 da PyPI) | `pip install bpy==5.2.3` in un ambiente a parte | installato in 5 min 45 s, 1,0 GB | costruire il modello con uno script (forme fuse, suddivisione, scheletro con pesi automatici) ed esportarlo in glTF per three.js |
| Cycles (Blender, processore) | figura di prova di 4.092 triangoli a 400 × 400 | 1,4-2,4 s; il nodo «Shader to RGB» non esiste in Cycles, quindi niente ombra a gradino | foto da vicino senza toon |
| Eevee (Blender, OpenGL in software) | stessa figura, dopo `apt-get install libegl1 libegl-mesa0 libgl1-mesa-dri` | 12,7-38,1 s; ombra a 2 toni con «Shader to RGB» e rampa a gradini, contorno Freestyle | fogli del modello e primi piani del passo 7 |
| Esportazione glTF | stessa figura | file `.glb` di 30.668 byte; Draco e MeshOptimizer mancano nel pacchetto PyPI | il modello arriva al gioco senza compressione, che si aggiunge con `gltf-transform` se serve |
| three.js 0.186.1, Chromium senza schermo | già in `apps/web` (`DIARIO.md` nella storia git, fase 2) | WebGL in software: foto sì, fotogrammi al secondo no | resa nel gioco (scafo rovesciato, gradini, contorno a schermo) e foto di confronto |
| potrace, Inkscape, Krita | `apt-get install --dry-run` | si installano dai pacchetti di Ubuntu 24.04 | potrace trasforma in curve gli schizzi fotografati |
| Python: scikit-image 0.26, trimesh 5.1 | `pip download` | disponibili | campo di distanza trasformato in mesh (marching cubes), se si prova la strada del codice |
| Rete | Wikipedia, kanzenshuu, animecorner, PyPI, download.blender.org, apt | rispondono | ricerca e programmi |
| Rete | `*.fandom.com`, dragon-ball-official.com | 403 | le tavole dei manga le fotografa Tancredi |

Il vecchio gioco rendeva già i suoi fogli con Blender in un contenitore, circa 2,1 s a cella
(`docs/DETTAGLI.md`, «Undici personaggi VRoid»). Le foto di prova sono fuori dal repository, nella
cartella di lavoro della chat. Conseguenza: in questa chat si possono usare insieme Blender, per
costruire il modello e disegnare i fogli, e three.js, per la resa nel gioco; il confronto del passo 8
mette il modello fatto con Blender contro quello fatto con il campo di distanza in TypeScript, con la
stessa resa three.js.

## 11. Piano del 25/10/2026: architettura dei personaggi e modelli GLB

Tancredi, 25/10/2026: la chat nuova lavora sull'architettura e cambia i personaggi; i modelli li
passa lui in GLB, prima senza animazioni, poi se riesce con animazioni (per esempio la corsa).
Conseguenza: i passi 1-7 della sezione 4 (silhouette, proporzioni, faccia, foglio del modello)
escono dal lavoro della chat; restano le regole di resa della sezione 9 (contorno, ombra a
gradino) e il confronto del passo 8, applicati ai modelli di Tancredi.

### Da dove si parte

- Oggi un personaggio è fatto di pezzi costruiti nel codice (`apps/web/game/render/parts.ts`, 437 righe),
  fusi in un solo `SkinnedMesh` per tutti i giocatori, con uno scheletro proprio di 20 ossa a
  giocatore (`apps/web/game/render/character.ts:1-6`, `rig.ts:22`). Corsa e pose sono angoli scritti nel
  codice (`rig.ts:73`, `locomotion`). Conseguenza: un GLB ha geometria, materiali e scheletro suoi e
  non entra in questa catena; serve uno strato in mezzo fra la simulazione e il modello disegnato.
- Il materiale è lo standard lucido (`apps/web/game/render/materials.ts:1-4`, decisione «morbido e lucido»
  del 22/10/2026); lo studio porta al toon con contorno (sezione 9). Conseguenza: il materiale si
  sceglie con foto affiancate sui modelli di Tancredi.

### Decisioni

| Tema | Decisione | Appiglio |
|---|---|---|
| Libreria 3D | resta three.js 0.186.1 con `@react-three/fiber` 9.8.1; `GLTFLoader` di three per i modelli; drei per `<Outlines>` | sezione 10; la scena della fase 2 sta a 65 chiamate e 182.273 triangoli su 150 e 300.000 (`DIARIO.md` nella storia git, fase 2) |
| Formato | GLB (glTF 2.0 binario), mai STL | STL ha solo triangoli, senza colori, texture né scheletro (https://en.wikipedia.org/wiki/STL_(file_format)) |
| Personaggi esistenti | i pezzi in codice restano come riserva per le carte senza GLB, finché ogni figura non ha il suo modello | `packages/sim/src/data.ts:93-105`, 22 figure |
| Pose tenute | no | sezione 7 |

### Cosa deve avere un GLB di Tancredi

Glossario per la chat nuova, da scrivere anche in `docs/` per Tancredi: un file per personaggio;
in piedi, piedi sull'origine, guarda verso +Z, alto in metri qualsiasi (lo porta il gioco a
`CHARACTER_HEIGHT`, `apps/web/game/render/style.ts`); materiali con un nome per le parti che prendono i
colori della squadra (`maglia`, `maglia2`, `pantaloncini`, `calzettoni`, `scarpe`; il resto resta
com'è); texture dentro il file, lato massimo 2048; scheletro facoltativo, con nomi delle ossa
liberi (il gioco non li legge; aggiornato il 29/10/2026, prima chiedeva i nomi di Mixamo) e clip
con i nomi che hanno, legate agli stati del gioco dalla tabella del modello in
`apps/web/game/animation/models.ts` (dal 29/10/2026, `docs/PERSONAGGI.md`; senza tabella il gioco
cerca `idle`, `run`, `kick`); l'origine e la licenza del modello scritte nel messaggio. I triangoli si misurano: la
mediana dei prototipi di oggi è 5.736 a giocatore (`DIARIO.md` nella storia git, 22/10/2026).

### Punti da implementare nella chat nuova

1. **Strato «aspetto del giocatore»**: un'interfaccia sola che il resto del gioco usa (posizione,
   direzione, andatura e azione dalla simulazione in ingresso; disegno in uscita), con due
   realizzazioni: i pezzi in codice di oggi e il modello GLB. `players.ts`, `loop.ts`, `showroom.ts`
   e `scripts/bench3d.ts` parlano solo con l'interfaccia. Prova: `pnpm test`, `bench3d.ts` con gli
   stessi numeri di prima (40 chiamate di disegno, impronta `f405f43f0a2aff2c` dopo 900 passi).
2. **Registro dei modelli**: `apps/web/public/models/<id>.glb` più un elenco che lega figura o carta
   al modello; caricamento con `GLTFLoader` prima della partita, normalizzazione (altezza, piedi a
   terra, verso), controllo con errori leggibili (materiali senza nome, triangoli, texture troppo
   grandi). Prova: un test per ogni controllo.
3. **Colori di squadra**: i materiali con nome prendono maglia e secondo colore del club
   (`packages/sim/src/data.ts`), numero sulla schiena come decalcomania; foto delle 14 squadre con lo
   stesso modello.
4. **Resa**: toon a 2 e 3 gradini con ombra blu-viola contro lo standard di oggi; contorno con drei
   `<Outlines>`, `OutlineEffect` e contorno a schermo; foto affiancate in partita e da vicino, con
   triangoli e chiamate di disegno.
5. **Movimento senza animazioni**: il modello statico scivola, si gira e si inclina con l'andatura;
   se il GLB ha uno scheletro, le ossa si collegano a quelle di `rig.ts` e la corsa scritta nel
   codice (`locomotion`) muove braccia e gambe. Foglio di contatto della corsa.
6. **Animazioni dal GLB** (quando arrivano): `AnimationMixer` con la clip di corsa, velocità della
   clip legata all'andatura della simulazione, passaggio morbido fra ferma, camminata e corsa; poi le
   altre clip una alla volta.
7. **Budget**: `/bench` con 10 modelli GLB: chiamate di disegno, triangoli, tempo di caricamento;
   misura di Tancredi sul portatile.
8. **Guida in `docs/`** per i modelli (le regole sopra, con i numeri misurati), pull request unita su
   `main`.

**Ambiente** (sezione 10), se serve Blender per controllare o sistemare un GLB: `pip install
bpy==5.2.3` in un ambiente a parte (circa 6 minuti, 1 GB); Eevee vuole prima `apt-get update` e
`apt-get install -y libegl1 libegl-mesa0 libgl1-mesa-dri`.

## 12. Prompt per l'immagine di riferimento (facoltativo: per chi genera i modelli da un'immagine)

Non allegare al generatore l'immagine di Battle League: porterebbe nel risultato i colori e lo
stemma di un personaggio che esiste.

```
Full-body character illustration of an ORIGINAL football (soccer) striker for an arcade
football video game. Comic-book style: bold black ink outlines with varying line weight,
thicker on the outer silhouette and thinner on inner details, like the official
illustrations of Mario Strikers: Battle League, with a Japanese manga influence: Akira
Toriyama's simple readable shapes, the intense detailed eyes of Blue Lock (Yusuke Nomura),
the rough hand-inked texture of Dorohedoro (Q Hayashida), Naoki Urasawa's characterful
noses and faces. Flat cel shading: two tones per colour with hard edges, solid black for
the darkest areas, shadows tinted blue-violet (never grey). No soft gradients, no glossy
highlights, no airbrush.

Character: lanky, wiry young man, about 3.5 heads tall, long thin arms that reach his
knees, narrow waist, oversized hands in padded white sport gloves, big chunky boots.
Angular face, long pointed chin, sharp cheekbones, a short hooked nose, thick angular
eyebrows, narrowed eyes staring at the viewer, a cocky sneer showing gritted teeth.
Signature trait: a tall jagged crest of black hair shaped like a zig-zag lightning bolt.

Pose: wide athletic crouch facing the viewer, knees bent outward, weight low, arms hanging
with clenched fists, ready to sprint.

Kit: short-sleeved red jersey (#e23b2e) with cream (#f2f0e6) collar and cuffs, an invented
round crest with a lightning bolt on the chest, cream shorts, red socks pulled up over the
knees with two cream stripes, black and red football boots with thick soles.

Full body visible including both feet, centred, plain flat warm-orange background, no text.

Avoid: Waluigi, Wario, Mario or any existing Nintendo or anime character, letters or
logos on cap and gloves, purple, moustache, cap, photorealism, 3D render look,
soft shading, extra fingers, cropped feet.
```

Foglio per il modello da immagine (dopo il sì sull'illustrazione):

```
Character turnaround model sheet of the same character: front, three-quarter, side and back
views side by side, same scale and aligned at the feet, standing in a relaxed A-pose (arms
45 degrees away from the body, legs slightly apart), neutral expression, orthographic view,
even flat lighting, same ink outlines and two-tone cel shading, plain white background,
no ground shadow, no text.
```

### 12.1 Prompt per 10 giocatori: Celestini contro rivali (26/10/2026)

Un giocatore per immagine. Ogni prompt si compone di tre parti incollate una dopo l'altra:

1. il **blocco base**, sempre uguale;
2. il **completo** della squadra;
3. il blocco del **personaggio**.

Allegati da dare al generatore:

- l'immagine di Fulmine, come riferimento di stile; il suo prompt è più sopra in questa
  sezione;
- l'immagine dei Celestini, per la somiglianza dei 5 della squadra A.

I 5 della squadra B sono rivali inventati, perché non c'è un'immagine dell'altra squadra.

**Posa.** In piedi, di fronte e senza prospettiva, perché il modello 3D si costruisce con le
misure prese dall'immagine. Con l'immagine di Fulmine, accovacciata e in prospettiva, il
confronto con il modello si è fermato a IoU 0,558 e i piedi risultavano il 10 % più stretti del
disegno (`docs/DETTAGLI.md`, sezione «CH_Fulmine dal riferimento»). Per la posa accovacciata c'è
la riga alternativa in fondo.

#### Blocco base

```
Full-body character illustration of ONE young street-football player for an arcade football
video game. Style identical to the attached reference image: comic-book line art, bold black
ink outlines with varying line weight (thick on the outer silhouette, thin on inner details),
rough hand-inked texture, simple readable shapes, intense detailed eyes. Flat cel shading:
two tones per colour with hard edges, solid black in the darkest areas, shadows tinted
blue-violet, never grey. No gradients, no glossy highlights, no airbrush.
Proportions: lanky teenager about 6 heads tall, long thin arms and legs, slightly oversized
hands and big chunky football boots.
Pose and camera: standing facing the viewer, relaxed A-pose with arms 30 degrees away from the
body, feet shoulder-width apart, straight-on camera at chest height, no perspective
distortion, whole body visible from the top of the hair to the soles.
Background: plain flat warm orange (#f08a23), small shadow under the feet only.
Avoid: more than one person, cropped feet or hair, photorealism, 3D render look, soft
shading, extra fingers, text, numbers, logos, watermark.
```

#### Completi

##### Squadra A (Celestini)

```
Kit: short-sleeved sky-blue jersey (#5cc0ec) with navy (#1f2d5c) collar and cuffs, a small
invented round crest with a white star on the chest, navy shorts, sky-blue socks with two
navy stripes below the knee, white and navy football boots.
```

##### Squadra B (rivali)

```
Kit: short-sleeved dark green jersey (#1f7a4a) with mustard-yellow (#f2c230) collar and cuffs,
a small invented crest with a yellow crown on the chest, white shorts, dark green socks with
one yellow stripe, black and yellow football boots.
```

#### Squadra A: i Celestini dell'immagine allegata

I ruoli sono i 5 del gioco: portiere, difensore, centrocampista, ala, attaccante.

##### 1. Portiere

```
GOALKEEPER: tall teenage girl, dark brown skin, long wavy black hair, small round
blue-tinted glasses on a sport strap, calm kind smile. Goalkeeper version of the kit:
long-sleeved bright yellow (#ffd23f) jersey with navy trims, white padded goalkeeper gloves.
```

##### 2. Difensore

```
DEFENDER: slim teenage boy, olive skin, messy chin-length dark hair with bangs over one eye,
green eyes, relaxed half-smile; a blue hoodie tied around his waist over the kit.
```

##### 3. Centrocampista

```
MIDFIELDER: teenage girl, dark brown skin, long straight black hair with one turquoise streak
and a turquoise hair clip, brown eyes, friendly open smile.
```

##### 4. Ala

```
WINGER: energetic teenage girl, brown skin, bright red-orange hair in two spiky high buns
tied with turquoise bands, amber eyes, small earring, confident smirk, one hand on her hip.
```

##### 5. Attaccante

```
STRIKER: short wiry boy, pale freckled skin, spiky bright orange hair, blue eyes, stubborn
frown with pouting lips, plasters on one knee.
```

#### Squadra B: rivali inventati

Hanno silhouette diverse fra loro, così in partita si riconoscono anche a circa 55 px di altezza
(`art/CH_Fulmine/asset-brief.md`).

##### 6. Portiere

```
GOALKEEPER: big broad-shouldered boy, light brown skin, shaved head, thick eyebrows,
gap-toothed grin. Goalkeeper version of the kit: long-sleeved mint (#2ee6a6) jersey with
black trims, white padded goalkeeper gloves.
```

##### 7. Difensore

```
DEFENDER: very tall thin girl, pale skin, one long black braid down to her waist, stern
narrowed eyes, white sweatband on her forehead.
```

##### 8. Centrocampista

```
MIDFIELDER: stocky round-faced boy, dark skin, big curly afro held by a yellow bandana,
wide cheerful grin.
```

##### 9. Ala

```
WINGER: small quick girl, tanned skin, short white-blond bob, sharp grey eyes, plasters on
both knees, sly smile.
```

##### 10. Attaccante

```
STRIKER: cocky teenage boy, light skin, tall slicked-back blue-black pompadour, a small scar
through one eyebrow, smug half-closed eyes.
```

#### Varianti

##### Posa accovacciata, come l'immagine di Fulmine

Sostituisce la riga `Pose and camera` del blocco base:

```
Pose and camera: wide athletic crouch facing the viewer, knees bent outward, weight low,
arms hanging, ready to sprint, whole body visible including both feet.
```

##### Foglio per il modello 3D

Si genera dopo aver scelto l'illustrazione, uno per giocatore. Dà le viste di profilo e di
schiena, che per Fulmine sono state inventate.

```
Character turnaround model sheet of the same character: front, three-quarter, side and back
views side by side, same scale and aligned at the feet, standing in a relaxed A-pose (arms
45 degrees away from the body, legs slightly apart), neutral expression, orthographic view,
even flat lighting, same ink outlines and two-tone cel shading, plain white background,
no ground shadow, no text.
```
