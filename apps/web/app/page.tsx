import Link from "next/link";

export default function Home() {
  return (
    <main>
      <h1>Fifa Tenkaichi 3</h1>
      <p>
        Il gioco nuovo è alla fase 0 del piano: ci sono i servizi, non ancora il gioco. Quello attuale resta su GitHub
        Pages, itch.io e nell&apos;exe.
      </p>
      <p>
        <Link href="/status">Stato dei servizi</Link>
      </p>
    </main>
  );
}
