import Image from "next/image";
import Link from "next/link";
import styles from "./page.module.css";

const steps = [
  {
    title: "Configure a banca",
    text: "Cadastre a banca, os avaliadores e os grupos com a descrição de cada projeto em poucos minutos.",
  },
  {
    title: "Sorteie a ordem",
    text: "Faça o sorteio ao vivo, projetado na tela, e os horários de cada apresentação são calculados na hora.",
  },
  {
    title: "Avalie pelo celular",
    text: "Cada avaliador recebe um link único com todos os grupos e preenche notas e feedbacks de onde estiver.",
  },
  {
    title: "Publique a devolutiva",
    text: "Revise os comentários, publique os resultados e entregue a cada grupo um link ou QR code com a devolutiva.",
  },
];

const features = [
  {
    icon: "⚖️",
    title: "Notas ponderadas",
    text: "Critérios com pesos definidos garantem comparações justas e transparentes entre todos os projetos.",
  },
  {
    icon: "🔗",
    title: "Links individuais",
    text: "Sem cadastro para o avaliador: um link seguro por pessoa, que pode ser revogado a qualquer momento.",
  },
  {
    icon: "🎲",
    title: "Sorteio ao vivo",
    text: "Uma experiência de palco para definir a ordem das apresentações com total imparcialidade.",
  },
  {
    icon: "📊",
    title: "Dashboard em tempo real",
    text: "Acompanhe fichas recebidas, nota final por grupo, médias por critério e dispersão entre avaliadores.",
  },
  {
    icon: "💬",
    title: "Devolutiva profissional",
    text: "Feedbacks anônimos, pontos fortes e melhorias organizados em uma página pronta para compartilhar.",
  },
  {
    icon: "📁",
    title: "Exportação completa",
    text: "Relatórios em CSV, XLSX e PDF para arquivar, compartilhar com a coordenação ou compor notas.",
  },
];

const audiences = ["Universidades", "Incubadoras", "Aceleradoras", "Hackathons", "Programas de inovação", "Feiras de startups"];

const previewRows = [
  { name: "Viva Verde", score: "8,72", width: "87%" },
  { name: "NexoNube", score: "8,41", width: "84%" },
  { name: "Fluxo IQ", score: "7,95", width: "79%" },
  { name: "Mural Móvel", score: "7,60", width: "76%" },
];

const previewCriteria = [
  { name: "Cliente", value: 86 },
  { name: "Valor", value: 80 },
  { name: "Modelo", value: 72 },
  { name: "MVP", value: 90 },
  { name: "Testes", value: 68 },
  { name: "Pitch", value: 84 },
];

export default function HomePage() {
  return (
    <div className={styles.page}>
      <header className={styles.nav}>
        <div className={styles.container}>
          <Link href="/" className={styles.navBrand} aria-label="Pitchômetro, página inicial">
            <Image src="/logo.png" alt="Pitchômetro" width={186} height={49} priority />
          </Link>
          <nav className={styles.navLinks} aria-label="Seções">
            <a href="#como-funciona">Como funciona</a>
            <a href="#recursos">Recursos</a>
            <a href="#para-quem">Para quem</a>
          </nav>
          <div className={styles.navActions}>
            <Link href="/login" className={styles.navLogin}>Entrar</Link>
            <Link href="/admin" className={styles.btnPrimarySm}>Acessar plataforma</Link>
          </div>
        </div>
      </header>

      <main>
        <section className={styles.hero}>
          <div className={`${styles.container} ${styles.heroGrid}`}>
            <div className={styles.heroCopy}>
              <span className={styles.kicker}>Plataforma de avaliação de pitches</span>
              <h1>
                Bancas de avaliação <span className={styles.accent}>justas, ágeis</span> e com devolutiva que gera impacto.
              </h1>
              <p className={styles.lead}>
                O Pitchômetro organiza todo o ciclo da banca — do sorteio da ordem às notas ponderadas e à devolutiva para cada
                grupo — em uma experiência simples para coordenadores, avaliadores e participantes.
              </p>
              <div className={styles.heroActions}>
                <Link href="/admin" className={styles.btnPrimary}>Começar agora</Link>
                <a href="#como-funciona" className={styles.btnGhost}>Ver como funciona</a>
              </div>
              <ul className={styles.heroChecks}>
                <li>Sem instalação</li>
                <li>Avaliação pelo celular</li>
                <li>Resultados em tempo real</li>
              </ul>
            </div>

            <div className={styles.heroVisual} aria-hidden="true">
              <div className={styles.previewCard}>
                <div className={styles.previewHeader}>
                  <div>
                    <small>Banca Final</small>
                    <strong>Ranking ao vivo</strong>
                  </div>
                  <span className={styles.liveBadge}>● Ao vivo</span>
                </div>
                <ol className={styles.previewRanking}>
                  {previewRows.map((row, index) => (
                    <li key={row.name}>
                      <span className={index === 0 ? styles.rankFirst : styles.rank}>{index + 1}º</span>
                      <div className={styles.rankBody}>
                        <div className={styles.rankLabel}>
                          <span>{row.name}</span>
                          <b>{row.score}</b>
                        </div>
                        <div className={styles.rankTrack}>
                          <span style={{ width: row.width }} className={index === 0 ? styles.rankBarFirst : styles.rankBar} />
                        </div>
                      </div>
                    </li>
                  ))}
                </ol>
              </div>

              <div className={styles.previewMini}>
                <small>Média por critério</small>
                <div className={styles.miniChart}>
                  {previewCriteria.map((criterion) => (
                    <div key={criterion.name} className={styles.miniCol}>
                      <span style={{ height: `${criterion.value}%` }} />
                      <small>{criterion.name}</small>
                    </div>
                  ))}
                </div>
              </div>

              <div className={styles.previewToast}>
                <span>✓</span>
                <div>
                  <strong>Ficha enviada</strong>
                  <small>3 de 4 avaliadores concluíram</small>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className={styles.strip}>
          <div className={`${styles.container} ${styles.stripGrid}`}>
            <div>
              <strong>100%</strong>
              <span>online, do sorteio à devolutiva</span>
            </div>
            <div>
              <strong>1 link</strong>
              <span>por avaliador, com todos os grupos</span>
            </div>
            <div>
              <strong>Pesos</strong>
              <span>por critério para notas comparáveis</span>
            </div>
            <div>
              <strong>QR code</strong>
              <span>para cada grupo acessar seu resultado</span>
            </div>
          </div>
        </section>

        <section id="como-funciona" className={styles.section}>
          <div className={styles.container}>
            <div className={styles.sectionHead}>
              <span className={styles.kicker}>Como funciona</span>
              <h2>Da preparação ao resultado em quatro passos</h2>
              <p>Um fluxo guiado que elimina planilhas, fichas de papel e retrabalho na consolidação das notas.</p>
            </div>
            <ol className={styles.steps}>
              {steps.map((step, index) => (
                <li key={step.title} className={styles.step}>
                  <span className={styles.stepNumber}>{String(index + 1).padStart(2, "0")}</span>
                  <h3>{step.title}</h3>
                  <p>{step.text}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section id="recursos" className={`${styles.section} ${styles.sectionAlt}`}>
          <div className={styles.container}>
            <div className={styles.sectionHead}>
              <span className={styles.kicker}>Recursos</span>
              <h2>Tudo o que uma banca profissional precisa</h2>
              <p>Ferramentas pensadas para dar agilidade à coordenação e credibilidade ao processo de avaliação.</p>
            </div>
            <div className={styles.features}>
              {features.map((feature) => (
                <article key={feature.title} className={styles.feature}>
                  <span className={styles.featureIcon} aria-hidden="true">{feature.icon}</span>
                  <h3>{feature.title}</h3>
                  <p>{feature.text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="para-quem" className={styles.section}>
          <div className={`${styles.container} ${styles.audienceGrid}`}>
            <div className={styles.sectionHeadLeft}>
              <span className={styles.kicker}>Para quem é</span>
              <h2>Feito para quem avalia ideias com seriedade</h2>
              <p>
                De bancas acadêmicas a programas de aceleração, o Pitchômetro padroniza critérios, reduz ruído nas decisões e
                transforma cada apresentação em aprendizado para os participantes.
              </p>
            </div>
            <ul className={styles.audienceList}>
              {audiences.map((audience) => (
                <li key={audience}>{audience}</li>
              ))}
            </ul>
          </div>
        </section>

        <section className={styles.ctaSection}>
          <div className={`${styles.container} ${styles.cta}`}>
            <div>
              <h2>Pronto para sua próxima banca?</h2>
              <p>Configure em minutos e ofereça uma experiência de avaliação à altura dos seus projetos.</p>
            </div>
            <Link href="/admin" className={styles.btnLight}>Acessar a plataforma</Link>
          </div>
        </section>
      </main>

      <footer className={styles.footer}>
        <div className={`${styles.container} ${styles.footerInner}`}>
          <Image src="/ico.png" alt="" width={32} height={29} />
          <span>© Pitchômetro · Avaliação de bancas</span>
          <Link href="/login">Área do administrador</Link>
        </div>
      </footer>
    </div>
  );
}
