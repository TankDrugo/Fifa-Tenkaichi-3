# Fifa Tenkaichi 3 (Strike Legends) — working instructions

The project is the browser game in `web/`; `README.md` says what is where, `docs/DETTAGLI.md` why
each number is what it is, `DIARIO.md` what each session changed. One chat works at a time.

## Language

- Code, comments, identifiers, commit messages: **English**. The browser APIs are in English, and
  a mixed identifier costs friction on every line that reads it.
- Project documents: **Italian**. `README.md`, `docs/DETTAGLI.md` and `DIARIO.md` already are,
  and they are read by Tancredi, who decides on them.
- Every explanation addressed to Tancredi: **Italian**.

## Analysis output format

Every claim in an analysis is written as:

    observation -> anchor -> consequence

- **observation** — what is actually there.
- **anchor** — something Tancredi can check or falsify by himself: a measured number,
  a `file:line` reference, a URL, or a rule of the game that the observation contradicts.
- **consequence** — what follows for the project: what to change, measure, or decide.

A sentence without an anchor is **deleted**, not softened. Value predicates are not used,
neither positive nor negative, and neither about his work nor about mine — the closed list lives in
`tools/style_guard/verdict_words.txt`. Evaluative openers carry no information and are removed
entirely, not softened.

A **recommendation is not a verdict** and stays required: when there are options, name the one
that produces the better game explicitly, and attach its anchor — the number, the measurement
or the constraint that makes it the choice. "Option A, because it costs 2 days more and removes
the 60 fps risk measured in benchmarks/" is a recommendation. "Option A is more elegant" is a verdict.

### Before / after

Rewrite this:

> Il GDD è scritto bene, la struttura è solida. Il campo però mi sembra troppo grande,
> come nella maggior parte dei progetti arcade.

Into this:

> `GDD.md:42` fissa il campo a 90 metri. A 7 m/s un attaccante lo attraversa in 12,8 secondi,
> sopra il tetto di 10 secondi scritto in `GDD.md:55`: o si alza la velocità base, o il campo
> scende sotto i 70 metri.

## How this is enforced

`tools/style_guard/check_output.pl` runs as a `Stop` hook (registered in `.claude/settings.json`)
and inspects the assistant message before it is delivered.

- **R1** — a value predicate from `tools/style_guard/verdict_words.txt` is always a violation.
- **R2** — a claim about an unobservable population from `tools/style_guard/population_claims.txt`
  is a violation unless the sentence carries an anchor (a digit or a URL).
- **R3** — an adjective from `tools/style_guard/soft_verdicts.txt` (`forte`, `scarso`, `pulito`)
  judges a design choice but measures a game quantity or a tool output: it is a violation unless
  one of the subjects in `tools/style_guard/subject_exemptions.txt` is the **subject of the
  copula**. `Il tiro è forte` passes, `L'idea è forte` does not; `l'albero è pulito` is the output
  of `git status`, `il codice è pulito` is a verdict. A noun standing anywhere near the predicate
  is not enough, or `L'idea del portiere che para tutto è forte` would be excused by `portiere`:
  a word introduced by a preposition belongs to the complement, everything from a relative pronoun
  on belongs to the relative clause, and a comma opens another clause, so the search reads the
  clauses from the right and takes the last one that carries a candidate. The subject is looked
  for inside the predicate as well, because `@PRED` swallows the noun group: in `non è la risorsa
  scarsa` it sits between the copula and the adjective. When a game sentence trips R3, add its
  subject to the exemption list rather than removing the adjective.
- Text inside code blocks (fenced with backticks or tildes, or indented by four spaces outside a
  list), inline code, blockquotes and quotation marks is skipped: quoting a verdict is not stating
  one. Block delimiters are matched line by line and inline spans may cross one line break (four
  for `«»` and `“”`), so a stray fence or an unmatched quote can no longer pair with a far away
  one and hide the sentences in between. A skipped span that carried a digit or a URL leaves a
  digit behind, so an anchor written as `ball.gd:42` still counts as one for R2.

Every rule is proved in both directions by `tools/style_guard/selftest.pl` — 34 cases, each
declaring the exit code the guard must return. Run it after any change to the lists or to the
script:

    perl tools/style_guard/selftest.pl

`tools/style_guard/check_file_hook.pl` runs as a `PostToolUse` hook on `Write|Edit|MultiEdit` and
checks a `.md` file right after a chat has written it, because the guard on messages never sees
what goes into a document. It **warns and does not block**: the write has already happened, and a
sentence to rewrite must not stop the chat in the middle of its work. Files under `addons/` are
skipped, being third party documentation.

The lists are plain text, one term per line, `#` to disable a line. Editing them needs no code
change. A line `@NAME = <regex>` in `tools/style_guard/macros.txt` defines a reusable fragment
shared by every list. `@PRED` is the predicative form (`è solido`, `sembrano molto belle`,
`è un'idea scarsa` — a determiner plus one noun may sit between the copula and the adjective),
which is what separates a verdict from a description: *"più solido di un'opinione"* and *"la
lezione del segnaposto brutto"* use the same adjectives without judging anything. `@PREDEN` is
the same form in English (`is solid`, `is the wrong idea`) and covers the commit
messages. An undefined `@NAME`, or any list that fails to load, stops the run with the refusing
exit code (2 as a hook, 1 by hand) instead of switching the guard off in silence. The guard is a
word filter: it catches the listed terms, not a verdict disguised as a description. Run it by
hand on any file with:

    perl tools/style_guard/check_output.pl --file <path>

Exit 0 = clean, exit 1 = violations listed on stderr.

## Working on the game

- **One task per session**, closed and pushed before the next; the user is Tancredi, he decides.
- **Measure before and after** every change that touches the game, and write the numbers in
  `docs/DETTAGLI.md` (the section of the system, and the log at its end):
  `node tools/web_checks.js` (all checks must stay `ok`), `node tools/ai_bench.js 12 4 1` (48 or 96
  matches for small differences: 12 matches swing by about one goal), `node tools/tension_bench.js`
  for the special bar, `node tools/skill_frames.js` before changing a skill's pose.
- **Try it in a browser** before publishing: headless Chromium with Playwright, a static server on
  `web/`, a fake pad by replacing `navigator.getGamepads` with `page.addInitScript`; in the page,
  `SL.debug` gives the match, the demo, the save, the mode and the session.
- **Ship only what works**: a change whose pictures or numbers do not show what it promises stays
  out, and the reply says so.
- **Publish** in two places once a task is done and its checks pass:
  - `main`: the work goes there (a pull request from the session's branch, merged), because
    GitHub Pages rebuilds the site from `main` (`.github/workflows/pages.yml`) and the Windows
    exe downloads the newest game from that site at every start (`tools/web_launcher/update.go`);
  - the working link, https://claude.ai/artifact/P8PppHnpvqoj76uJorB6rE: `Artifact` with
    `action: "read"` on it first in a new chat, then `publish` with `url`, `file_path`
    `web/index.html` and the map `files` of the changed `js/...` files.
- **Branches**: only `main` and the branch of the chat at work exist (Tancredi, 22/10/2026). A chat
  starts from `main`, merges its pull request, then deletes its branch on GitHub
  (`git push origin --delete <branch>`). Work that does not reach `main`, such as a move half done,
  stays in the history at a commit named in `DIARIO.md`, not on a branch of its own.
- **Ask before** deleting files, creating repositories or anything outside this repository; say at
  once when the network, an account or a licence blocks a step, with what is needed, and go on with
  the rest.
- **Animations** come from the sheets that exist (`POSE` in `web/js/skills.js`); Tancredi said no to
  new Blender renders on 20/10/2026.

## Working on the new game (docs/PIANO-3D-ONLINE.md)

- **Where**: `apps/web` (Next.js: pages, API, later the 3D scene), `apps/realtime` (matches over
  WebSocket), `packages/shared` (zod schemas shared by client and server), `packages/sim` from
  phase 1, `infra/` (Docker). `web/` is the old game and is never edited for the new one.
- **Checks before every push**, all from the repository root, all must pass (CI runs the same,
  `.github/workflows/ci.yml`): `pnpm install --frozen-lockfile`, `pnpm typecheck`, `pnpm lint`,
  `pnpm test`, `pnpm build`.
- **Running the stack**: `cd infra && docker compose up --build`, then
  `node infra/check-status.mjs` (exit 0 = the four services and the WebSocket answer) and
  http://localhost:3000/status. In a cloud chat Docker needs `dockerd` started first (allowed in
  `.claude/settings.json`), and the builds need the chat network's certificate:
  `BUILDX_BAKE_ENTITLEMENTS_FS=0 docker compose -f docker-compose.yml -f docker-compose.cloud.yml up --build`
  (why: `docs/DETTAGLI.md`, «Docker nelle chat cloud»). When the session does not allow `dockerd`,
  say so and run the services as child processes of one script (the container has Redis 7.0 and
  Postgres 16, which runs as the `postgres` user), then stop them.
- **Versions** are exact in every `package.json` and in the image tags. A new library comes with
  its reason in `docs/DETTAGLI.md`, section «Gioco nuovo». An image tag must list both `amd64` and
  `arm64` on Docker Hub before it is used: a tag published a few hours ago can have neither.
- **TypeScript**: relative imports carry the `.ts` extension and `erasableSyntaxOnly` is on, so
  plain `node` runs the sources (`node apps/realtime/src/main.ts`), the way `tools/*.js` run today.
- **Interface text** is Italian; code, identifiers and commit messages stay English.
- **Publish**: the pull request merged on `main` is the whole publication of the new game. The
  working link (artifact) is the old game: republish it only when a task changed `web/`.
- **Frames per second** are measured by Tancredi on his laptop: cloud chats render WebGL in
  software. Chats check the draw budget with `renderer.info` (plan, section 4.6).

## Closing a session

Append an entry to the end of `DIARIO.md` (date, what changed with its numbers, commits, what is
left), then commit and push only the files the session changed:

    git add <files> && git commit -m "<what changed>" -- <files> && git push

`-m` goes before `--`, which ends option parsing; a new file needs its `git add` first. Never
`git add -A`. If a push is rejected, stop and say so instead of forcing it.

**Session economy.** Every token stays in context and is re-sent at each step: read slices
(`sed -n '40,60p' file`), never a whole document or `cat` on a data file; counts and `grep` hits
instead of listings; say how large a big read is before doing it.
