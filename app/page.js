import Link from "next/link";
import WorldIntro from "@/components/WorldIntro";
import { LandingEriccStage, LandingNaoStage } from "@/components/three/DynamicStages";

const TEAM = [
  { nom: "HOUARI", prenom: "Yassir" },
  { nom: "AABA", prenom: "Soufian" },
  { nom: "BELGHITI ALAOUI", prenom: "Reda" },
  { nom: "CHOUCHAOUI", prenom: "Naëla" },
  { nom: "ALIK", prenom: "Zakaria" },
];

export default function HomePage() {
  return (
    <>
      <WorldIntro />
      <main className="maison maison-reveal">
        <section className="opener opener-hero">
          <div className="opener-stage-full">
            <LandingEriccStage />
          </div>
          <div className="hero-veil" aria-hidden />
          <div className="opener-copy hero-copy">
            <p className="place">Maison d’étude · Marseille · Temps réel</p>
            <h1 className="brand-hero">
              Polytech
              <span>Robotique</span>
            </h1>
            <p className="hero-line">
              Deux mondes. Une présence. Le laboratoire qui doit rester le meilleur projet de
              l’année.
            </p>
            <div className="opener-actions">
              <a className="primary" href="#ericc">
                Choisir un monde
              </a>
              <Link className="quiet" href="/lab/ericc">
                Atelier ERICC →
              </Link>
            </div>
          </div>
          <div className="hero-ticker" aria-hidden>
            <div className="ticker-track">
              <span>MGD · MGI · CINÉMATIQUE · ERICC · NAO · POLYTECH · OLIVE · ÉQUIPE 7 · </span>
              <span>MGD · MGI · CINÉMATIQUE · ERICC · NAO · POLYTECH · OLIVE · ÉQUIPE 7 · </span>
            </div>
          </div>
          <div className="scroll-hint">Défiler</div>
        </section>

        {/* Crédits — dès le début, juste après le hero */}
        <section className="credits-band credits-top" id="credits" aria-label="Crédits du projet">
          <div className="credits-ornament" aria-hidden />
          <div className="credits-inner">
            <header className="credits-head">
              <p className="credits-kicker">Équipe 7 · Projet EP Robotique</p>
              <h2>Identité du laboratoire</h2>
              <p className="credits-lead">
                Polytech Marseille — filière GII. Année 2026 · Promo 2028 · Version V:2026.
              </p>
            </header>

            <div className="credits-meta">
              <div>
                <span className="credits-label">Année</span>
                <strong>2026</strong>
              </div>
              <div>
                <span className="credits-label">Promo</span>
                <strong>2028</strong>
              </div>
              <div>
                <span className="credits-label">Filière</span>
                <strong>GII-4A</strong>
              </div>
              <div>
                <span className="credits-label">Version</span>
                <strong>V:2026</strong>
              </div>
              <div>
                <span className="credits-label">Équipe</span>
                <strong>N° 7</strong>
              </div>
            </div>

            <div className="credits-grid">
              <article className="credits-block credits-team">
                <p className="credits-label">Réalisé par</p>
                <ul>
                  {TEAM.map((m) => (
                    <li key={m.nom + m.prenom}>
                      <span className="credits-nom">{m.nom}</span>
                      <span className="credits-prenom">{m.prenom}</span>
                    </li>
                  ))}
                </ul>
              </article>
              <article className="credits-block">
                <p className="credits-label">Encadré par</p>
                <ul>
                  <li>
                    <span className="credits-nom">OLIVE</span>
                    <span className="credits-prenom">Jean-Michel</span>
                  </li>
                </ul>
                <p className="credits-note">Enseignant · Polytech Marseille</p>
              </article>
              <article className="credits-block">
                <p className="credits-label">Établissement</p>
                <ul className="credits-plain">
                  <li>Polytech Marseille</li>
                  <li>Aix-Marseille Université</li>
                </ul>
                <p className="credits-note">EP Robotique · ERICC &amp; NAO</p>
              </article>
            </div>
          </div>
        </section>

        <section className="strip-proof" aria-label="Repères">
          <div>
            <strong>02</strong>
            <span>Mondes</span>
          </div>
          <div>
            <strong>5</strong>
            <span>Axes ERICC</span>
          </div>
          <div>
            <strong>25</strong>
            <span>DoF NAO</span>
          </div>
          <div>
            <strong>Live</strong>
            <span>Cinématique</span>
          </div>
        </section>

        <section className="chapter chapter-3d shock" id="ericc">
          <div className="chapter-visual">
            <p className="world-mark" aria-hidden>
              01
            </p>
            <LandingEriccStage />
          </div>
          <div className="chapter-body">
            <p className="index">MONDE 01</p>
            <h2>ERICC</h2>
            <p className="role">Manipulateur · atelier interactif</p>
            <p>
              Cinq axes, mors, MGD / MGI, prise-dépose, apprentissage. Entre dans l’atelier — tout
              réagit.
            </p>
            <ul>
              <li>Chaîne live liée aux curseurs</li>
              <li>10 modules EP</li>
              <li>Prise-dépose & transfert</li>
            </ul>
            <Link href="/lab/ericc" className="chapter-cta">
              Entrer <span>Atelier ERICC</span>
            </Link>
          </div>
        </section>

        <section className="chapter chapter-3d nao shock" id="nao">
          <div className="chapter-visual">
            <p className="world-mark" aria-hidden>
              02
            </p>
            <LandingNaoStage />
          </div>
          <div className="chapter-body">
            <p className="index">MONDE 02</p>
            <h2>NAO</h2>
            <p className="role">Humanoïde · Partie 2</p>
            <p>
              Bras droit piloté, sonar, postures, MGD. Le second monde — aussi clair, aussi vivant.
            </p>
            <ul>
              <li>Articulations liées aux curseurs</li>
              <li>Modules Partie 2</li>
              <li>Présence humanoïde</li>
            </ul>
            <Link href="/lab/nao" className="chapter-cta">
              Entrer <span>Atelier NAO</span>
            </Link>
          </div>
        </section>

        <section className="closing-band">
          <p className="closing-kicker">Équipe 7 · GII-4A · Promo 2028</p>
          <h2>Prêt à entrer dans l’atelier.</h2>
          <div className="closing-actions">
            <Link href="/lab/ericc" className="chapter-cta">
              ERICC <span>Ouvrir</span>
            </Link>
            <Link href="/lab/nao" className="chapter-cta nao-cta">
              NAO <span>Ouvrir</span>
            </Link>
          </div>
        </section>

        <footer className="maison-foot">
          <span>
            HOUARI Yassir · AABA Soufian · BELGHITI ALAOUI Reda · CHOUCHAOUI Naëla · ALIK Zakaria
          </span>
          <span>Encadré par OLIVE Jean-Michel · V:2026 · Promo 2028</span>
        </footer>
      </main>
    </>
  );
}
