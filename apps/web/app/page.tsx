import Link from "next/link";

export default function Home() {
  return (
    <main>
      <h1>Fifa Tenkaichi 3</h1>
      <p>
        Il gioco è alla fase 3 del piano: simulazione, motore 3D e personaggi, con una partita fra due squadre
        dell&apos;IA.
      </p>
      <ul>
        <li><Link href="/partita">Partita in 3D</Link></li>
        <li><Link href="/prova">Prova</Link>: un calciatore con la palla, da tastiera o joypad</li>
        <li><Link href="/personaggi">Personaggi</Link></li>
        <li><Link href="/bench">Banco del motore 3D</Link>: fotogrammi al secondo e numeri del disegno</li>
        <li><Link href="/status">Stato dei servizi</Link></li>
      </ul>
    </main>
  );
}
