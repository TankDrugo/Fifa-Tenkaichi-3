# Prompt per 10 giocatori: Celestini contro rivali

Un giocatore per immagine. Ogni prompt si compone di tre parti incollate una dopo l'altra:

1. il **blocco base**, sempre uguale;
2. il **completo** della squadra;
3. il blocco del **personaggio**.

Allegati da dare al generatore:

- l'immagine di Fulmine, come riferimento di stile; il suo prompt è nella sezione 12 di
  `docs/STUDIO-PERSONAGGI.md`;
- l'immagine dei Celestini, per la somiglianza dei 5 della squadra A.

I 5 della squadra B sono rivali inventati, perché non c'è un'immagine dell'altra squadra.

**Posa.** In piedi, di fronte e senza prospettiva, perché il modello 3D si costruisce con le
misure prese dall'immagine. Con l'immagine di Fulmine, accovacciata e in prospettiva, il
confronto con il modello si è fermato a IoU 0,558 e i piedi risultavano il 10 % più stretti del
disegno (`docs/DETTAGLI.md`, sezione «CH_Fulmine dal riferimento»). Per la posa accovacciata c'è
la riga alternativa in fondo.

## Blocco base

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

## Completi

### Squadra A (Celestini)

```
Kit: short-sleeved sky-blue jersey (#5cc0ec) with navy (#1f2d5c) collar and cuffs, a small
invented round crest with a white star on the chest, navy shorts, sky-blue socks with two
navy stripes below the knee, white and navy football boots.
```

### Squadra B (rivali)

```
Kit: short-sleeved dark green jersey (#1f7a4a) with mustard-yellow (#f2c230) collar and cuffs,
a small invented crest with a yellow crown on the chest, white shorts, dark green socks with
one yellow stripe, black and yellow football boots.
```

## Squadra A: i Celestini dell'immagine allegata

I ruoli sono i 5 del gioco: portiere, difensore, centrocampista, ala, attaccante.

### 1. Portiere

```
GOALKEEPER: tall teenage girl, dark brown skin, long wavy black hair, small round
blue-tinted glasses on a sport strap, calm kind smile. Goalkeeper version of the kit:
long-sleeved bright yellow (#ffd23f) jersey with navy trims, white padded goalkeeper gloves.
```

### 2. Difensore

```
DEFENDER: slim teenage boy, olive skin, messy chin-length dark hair with bangs over one eye,
green eyes, relaxed half-smile; a blue hoodie tied around his waist over the kit.
```

### 3. Centrocampista

```
MIDFIELDER: teenage girl, dark brown skin, long straight black hair with one turquoise streak
and a turquoise hair clip, brown eyes, friendly open smile.
```

### 4. Ala

```
WINGER: energetic teenage girl, brown skin, bright red-orange hair in two spiky high buns
tied with turquoise bands, amber eyes, small earring, confident smirk, one hand on her hip.
```

### 5. Attaccante

```
STRIKER: short wiry boy, pale freckled skin, spiky bright orange hair, blue eyes, stubborn
frown with pouting lips, plasters on one knee.
```

## Squadra B: rivali inventati

Hanno silhouette diverse fra loro, così in partita si riconoscono anche a circa 55 px di altezza
(`art/CH_Fulmine/asset-brief.md`).

### 6. Portiere

```
GOALKEEPER: big broad-shouldered boy, light brown skin, shaved head, thick eyebrows,
gap-toothed grin. Goalkeeper version of the kit: long-sleeved mint (#2ee6a6) jersey with
black trims, white padded goalkeeper gloves.
```

### 7. Difensore

```
DEFENDER: very tall thin girl, pale skin, one long black braid down to her waist, stern
narrowed eyes, white sweatband on her forehead.
```

### 8. Centrocampista

```
MIDFIELDER: stocky round-faced boy, dark skin, big curly afro held by a yellow bandana,
wide cheerful grin.
```

### 9. Ala

```
WINGER: small quick girl, tanned skin, short white-blond bob, sharp grey eyes, plasters on
both knees, sly smile.
```

### 10. Attaccante

```
STRIKER: cocky teenage boy, light skin, tall slicked-back blue-black pompadour, a small scar
through one eyebrow, smug half-closed eyes.
```

## Varianti

### Posa accovacciata, come l'immagine di Fulmine

Sostituisce la riga `Pose and camera` del blocco base:

```
Pose and camera: wide athletic crouch facing the viewer, knees bent outward, weight low,
arms hanging, ready to sprint, whole body visible including both feet.
```

### Foglio per il modello 3D

Si genera dopo aver scelto l'illustrazione, uno per giocatore. Dà le viste di profilo e di
schiena, che per Fulmine sono state inventate.

```
Character turnaround model sheet of the same character: front, three-quarter, side and back
views side by side, same scale and aligned at the feet, standing in a relaxed A-pose (arms
45 degrees away from the body, legs slightly apart), neutral expression, orthographic view,
even flat lighting, same ink outlines and two-tone cel shading, plain white background,
no ground shadow, no text.
```
