const features = [
  { title: "Team delivery", body: "See workload, progress, blockers and capability evidence around the people doing the work.", image: "/landing/team-board.webp" },
  { title: "Living risk", body: "Turn task updates and check-ins into reviewed risks, controls and treatment actions.", image: "/landing/risk-heatmap.webp" },
  { title: "Decision intelligence", body: "Collect scores, apply transparent rules and preserve the evidence behind every decision.", image: "/landing/decision-room.webp" },
];

export default function LandingPage({ onSignIn, onStart }) {
  return <div className="landing-shell">
    <header className="landing-nav">
      <a className="brand" href="#top"><span>W</span>WorkForce IQ</a>
      <nav><a href="#product">Product</a><a href="#research">Research</a><a href="#security">Security</a></nav>
      <div><button className="text-button" onClick={onSignIn}>Sign in</button><button className="primary-button" onClick={onStart}>Start a pilot</button></div>
    </header>

    <main id="top">
      <section className="landing-hero">
        <div className="hero-copy">
          <span className="eyebrow">TEAM · RISK · DECISIONS</span>
          <h1>Turn delivery signals into decisions your team can trust.</h1>
          <p>WorkForce IQ connects team progress, emerging risk and structured scoring in one explainable workspace.</p>
          <div className="hero-actions"><button className="primary-button" onClick={onStart}>Create workspace</button><a href="#product">Explore how it works</a></div>
          <div className="trust-row"><span>Human approval</span><span>Explainable calculations</span><span>Evidence history</span></div>
        </div>
        <div className="hero-mosaic" aria-label="WorkForce IQ team, risk and decision illustrations">
          <figure className="mosaic-team"><img src="/landing/team-board.webp" alt="Abstract team delivery workflow" /></figure>
          <figure className="mosaic-risk"><img src="/landing/risk-heatmap.webp" alt="Abstract risk controls and heatmap" /></figure>
          <figure className="mosaic-check"><img src="/landing/check-ins.webp" alt="Abstract daily check-in signals" /></figure>
          <figure className="mosaic-decision"><img src="/landing/decision-room.webp" alt="Abstract transparent decision paths" /></figure>
          <figure className="mosaic-dashboard"><img src="/landing/dashboard.webp" alt="Abstract living analytics landscape" /></figure>
        </div>
      </section>

      <section className="landing-section" id="product">
        <span className="eyebrow">ONE CONNECTED WORKFLOW</span><h2>Understand the team. Detect risk. Make the decision.</h2>
        <div className="feature-grid">{features.map(({ title, body, image }, index)=><article key={title}><img src={image} alt="" /><div><span>0{index+1}</span><h3>{title}</h3><p>{body}</p></div></article>)}</div>
      </section>

      <section className="research-band" id="research"><img src="/landing/research.webp" alt="Abstract research evidence network" /><div><span className="eyebrow">RESEARCH-LED PRODUCT</span><h2>Built to test how structured team evidence can improve delivery decisions.</h2><p>Recommendations remain reviewable, calculations remain visible, and consequential decisions remain with authorised people.</p></div></section>
      <section className="landing-section security-copy" id="security"><div><span className="eyebrow">RESPONSIBLE BY DESIGN</span><h2>Clear access, evidence and accountability.</h2></div><ul><li>Role and project-level access</li><li>Aggregated team signals by default</li><li>Versioned scores, risks and overrides</li><li>Supabase row-level security ready</li></ul><img className="overview-art" src="/landing/workforce-overview.webp" alt="Connected team delivery, risk and decision workflow" /></section>
    </main>

    <footer className="landing-footer"><div><a className="brand" href="#top"><span>W</span>WorkForce IQ</a><p>Research-led delivery, risk and decision intelligence.</p></div><div><strong>Product</strong><a href="#product">How it works</a><a href="#security">Security</a><button onClick={onSignIn}>Sign in</button></div><div><strong>Research notice</strong><p>WorkForce IQ is a research-led decision-support prototype developed as part of a Master’s dissertation. It supports human judgement and does not replace professional project, risk or people-management decisions.</p></div></footer>
  </div>;
}
