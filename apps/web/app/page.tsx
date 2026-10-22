import Link from "next/link";

export default function Home() {
  return (
    <main>
      <h1>Fifa Tenkaichi 3</h1>
      <p>
        Il gioco nuovo è alla fase 2 del piano: la simulazione e il motore 3D, con una partita fra due squadre
        dell&apos;IA. Quello attuale resta su GitHub Pages, itch.io e nell&apos;exe.
      </p>
      <ul>
        <li><Link href="/partita">Partita in 3D</Link></li>
        <li><Link href="/bench">Banco del motore 3D</Link>: fotogrammi al secondo e numeri del disegno</li>
        <li><Link href="/status">Stato dei servizi</Link></li>
      </ul>
    </main>
  );
}
