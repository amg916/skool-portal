import { useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useGetMe } from "@workspace/api-client-react";
import "./landing.css";

const REAL_BANGER = {
  loomUrl: "https://www.loom.com/share/4cee42f318cf4938ba2187690890f436",
  thumbUrl:
    "https://cdn.loom.com/sessions/thumbnails/4cee42f318cf4938ba2187690890f436-bece7043c5f628a4.gif",
  runtime: "5 min",
  title: "A short, follow-along AI walkthrough",
  byline: "From the Baingers welcome banger",
};

type ProvidersResponse = { providers: Array<"google" | "facebook" | "github"> };

async function fetchProviders(): Promise<ProvidersResponse> {
  const r = await fetch("/api/auth/providers", { credentials: "include" });
  if (!r.ok) return { providers: [] };
  return r.json();
}

const FONT_LINK_ID = "baingers-landing-fonts";

function ensureFonts() {
  if (typeof document === "undefined") return;
  if (document.getElementById(FONT_LINK_ID)) return;
  const link = document.createElement("link");
  link.id = FONT_LINK_ID;
  link.rel = "stylesheet";
  link.href =
    "https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@500;600&display=swap";
  document.head.appendChild(link);
}

export default function LandingPage() {
  const [, setLocation] = useLocation();
  const { data: user, isLoading } = useGetMe({ query: { retry: false } });
  const { data: providers } = useQuery({
    queryKey: ["oauth:providers"],
    queryFn: fetchProviders,
  });
  const rootRef = useRef<HTMLDivElement>(null);
  const navRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!isLoading && user) setLocation("/community");
  }, [user, isLoading, setLocation]);

  useEffect(() => {
    ensureFonts();
  }, []);

  useEffect(() => {
    const root = rootRef.current;
    const nav = navRef.current;
    if (!root || !nav) return;

    const onScroll = () => {
      if (window.scrollY > 12) nav.classList.add("scrolled");
      else nav.classList.remove("scrolled");
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("in");
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.14, rootMargin: "0px 0px -8% 0px" },
    );
    root.querySelectorAll(".reveal").forEach((el) => io.observe(el));

    return () => {
      window.removeEventListener("scroll", onScroll);
      io.disconnect();
    };
  }, []);

  const googleEnabled = providers?.providers.includes("google") ?? false;
  const signupHref = googleEnabled
    ? "/api/auth/google/start?returnTo=/community"
    : "/login";

  const onJoin = (e: React.MouseEvent) => {
    e.preventDefault();
    window.location.href = signupHref;
  };

  return (
    <div ref={rootRef} className="baingers-landing js">
      <span id="top" />

      <div className="announce">
        <span className="tag">EARLY ACCESS</span>
        Now in early access — invite-only via Google sign-in ·{" "}
        <a href={signupHref} onClick={onJoin}>
          Join with Google&nbsp;→
        </a>
      </div>

      <nav ref={navRef} className="nav" id="nav">
        <div className="nav-inner">
          <a className="brand" href="#top" aria-label="Baingers home">
            <span className="brand-mark" />
            <span className="brand-name">
              B<span className="ai">ai</span>ngers
            </span>
          </a>
          <div className="nav-links">
            <a href="#about-banger">What's a banger</a>
            <a href="#how">How it works</a>
            <a href="#inside">What's inside</a>
            <a href="#faq">FAQ</a>
          </div>
          <div className="nav-right">
            <button className="nav-signin" onClick={onJoin}>
              Log in
            </button>
            <button className="btn btn-primary" onClick={onJoin}>
              <span className="g-glyph" />
              Join with Google
            </button>
          </div>
        </div>
      </nav>

      <header className="hero">
        <div className="wrap hero-grid">
          <div className="hero-copy">
            <span className="hero-pill reveal-up">
              <span className="dot" />
              Members-only AI community
              <span className="chip">EARLY ACCESS</span>
            </span>
            <h1 className="hero-title reveal-up">
              AI bangers,
              <br />
              <span className="grad">under 10 minutes.</span>
            </h1>
            <p className="hero-sub reveal-up">
              A members-only community for the people actually making things with AI.
            </p>
            <div className="hero-flow reveal-up">
              <span className="step-chip">Short video</span>
              <span className="arrow">→</span>
              <span className="step-chip">Try it the same day</span>
              <span className="arrow">→</span>
              <span className="step-chip">Post what you made</span>
            </div>
            <div className="hero-cta reveal-up">
              <button className="btn btn-primary btn-lg" onClick={onJoin}>
                <span className="g-glyph" />
                Join with Google
              </button>
              <a className="btn btn-ghost btn-lg" href="#inside">
                See what's inside
              </a>
            </div>
          </div>

          <div className="hero-visual reveal-up">
            <div className="mockup">
              <div className="mockup-bar">
                <i /> <i /> <i />
                <span className="mockup-url">baingers.com/feed</span>
              </div>
              <a
                className="real-thumb"
                href={REAL_BANGER.loomUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Watch the welcome banger on Loom"
              >
                <img
                  src={REAL_BANGER.thumbUrl}
                  alt="Baingers welcome banger preview"
                  loading="lazy"
                />
                <span className="source-tag">
                  <span className="live-dot" />
                  Loom · welcome banger
                </span>
                <div className="clip-play">
                  <span />
                </div>
                <div className="runtime-chip">{REAL_BANGER.runtime}</div>
              </a>
              <div className="mockup-meta">
                <span
                  className="mk-avatar"
                  style={{ background: "var(--grad-brand)" }}
                >
                  B
                </span>
                <div>
                  <div className="mk-title">{REAL_BANGER.title}</div>
                  <div className="mk-by">
                    Under 10 min · watch it, then try it
                  </div>
                </div>
              </div>
            </div>
            <div className="badge-made">I made this ✓</div>
            <div className="float-react">🔥 ❤️ 👏</div>
          </div>
        </div>
      </header>

      <section className="section soft" id="about-banger">
        <div className="wrap">
          <div className="wb-grid">
            <div>
              <hr className="grad-divider reveal" style={{ marginLeft: 0 }} />
              <div className="eyebrow reveal">What's a banger?</div>
              <p className="wb-def reveal d1">
                A banger is a <span className="grad">short AI walkthrough</span> —
                under 10 minutes — you can follow start-to-finish in one sitting.
              </p>
              <p className="wb-note reveal d2">
                No fluff intros. No 90-minute lectures. Press play, follow along,
                and you've made something real by the end.
              </p>
            </div>
            <div className="reveal d1">
              <div className="wb-illustration">
                <img
                  src="/banger-stack.png"
                  alt="A stack of short video bangers"
                  className="wb-illo-img"
                  loading="lazy"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="section" id="how">
        <div className="wrap">
          <div className="section-head">
            <hr className="grad-divider reveal" />
            <div className="eyebrow reveal">How it works</div>
            <h2 className="section-title reveal d1">
              Watch. Try. Post what you made.
            </h2>
            <p className="section-note reveal d2">
              Three steps, one sitting. That's the whole loop.
            </p>
          </div>
          <div className="hiw-grid">
            <div className="hiw-card reveal">
              <div className="hiw-ico">
                <svg viewBox="0 0 24 24">
                  <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z" />
                  <circle cx="12" cy="12" r="3.2" />
                </svg>
              </div>
              <div className="hiw-step">Step 1</div>
              <h3 className="hiw-title">Watch</h3>
              <p className="hiw-desc">
                Pick a banger from the feed or the classroom. Every video runs
                under 10 minutes.
              </p>
              <span className="hiw-arrow">→</span>
            </div>
            <div className="hiw-card reveal d1">
              <div className="hiw-ico">
                <svg viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="9.2" />
                  <path d="M10 8.4l6 3.6-6 3.6Z" fill="#fff" stroke="none" />
                </svg>
              </div>
              <div className="hiw-step">Step 2</div>
              <h3 className="hiw-title">Try it</h3>
              <p className="hiw-desc">
                Follow along on your own machine. Most bangers are walkthroughs
                you can replicate the same day.
              </p>
              <span className="hiw-arrow">→</span>
            </div>
            <div className="hiw-card reveal d2">
              <div className="hiw-ico">
                <svg viewBox="0 0 24 24">
                  <path d="M3 8.5a2 2 0 0 1 2-2h2l1.4-2h7.2L19 6.5a2 2 0 0 1 2 2V18a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z" />
                  <circle cx="12" cy="13" r="3.6" />
                </svg>
              </div>
              <div className="hiw-step">Step 3</div>
              <h3 className="hiw-title">Post what you made</h3>
              <p className="hiw-desc">
                Comment on the banger and mark it "I made this." Your comment
                gets a green badge and counts double on the leaderboard.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="section soft" id="inside">
        <div className="wrap">
          <div className="section-head">
            <hr className="grad-divider reveal" />
            <div className="eyebrow reveal">What's inside</div>
            <h2 className="section-title reveal d1">
              Everything the community runs on
            </h2>
            <p className="section-note reveal d2">
              Real features, live in the app today.
            </p>
          </div>
          <div className="feat-grid">
            <div className="feat-card reveal">
              <div className="mini">
                <div className="mf-post">
                  <div className="mf-head">
                    <span className="mf-av" />
                    <div>
                      <div className="mf-name">Sample post</div>
                      <div className="mf-sub">Member · #agents</div>
                    </div>
                  </div>
                  <div className="mf-thumb" />
                  <div className="mf-react">
                    <span>🔥 12</span>
                    <span>💬 4</span>
                    <span className="bm">🔖</span>
                  </div>
                </div>
              </div>
              <div className="feat-body">
                <h3 className="feat-title">Community feed</h3>
                <p className="feat-desc">
                  Post Loom, YouTube, or Vimeo videos with tags, emoji reactions,
                  and bookmarks.
                </p>
              </div>
            </div>

            <div className="feat-card reveal d1">
              <div className="mini">
                <div className="mt">
                  <div className="mt-node lvl0">
                    <span className="mt-dot" />
                    Segment 1
                  </div>
                  <div className="mt-node lvl1">
                    <span className="mt-dot" />
                    Subsection A
                  </div>
                  <div className="mt-node lvl2 active">
                    <span className="mt-dot" />
                    Lesson 1
                    <span className="mt-play" />
                  </div>
                </div>
              </div>
              <div className="feat-body">
                <h3 className="feat-title">Classroom</h3>
                <p className="feat-desc">
                  Structured video lessons grouped into segments and subsections
                  you can work through.
                </p>
              </div>
            </div>

            <div className="feat-card reveal d2">
              <div className="mini">
                <div className="ms">
                  <div className="ms-row up">
                    <div className="ms-vote">
                      <span className="ms-chev">▲</span>
                      <span className="ms-count">1</span>
                    </div>
                    <span className="ms-title">
                      Real-time transcript search
                    </span>
                    <span className="ms-pill open">OPEN</span>
                  </div>
                  <div className="ms-row">
                    <div className="ms-vote">
                      <span className="ms-chev">▲</span>
                      <span className="ms-count">0</span>
                    </div>
                    <span className="ms-title">Dark mode for the feed</span>
                    <span className="ms-pill planned">PLANNED</span>
                  </div>
                </div>
              </div>
              <div className="feat-body">
                <h3 className="feat-title">Suggestion board</h3>
                <p className="feat-desc">
                  Members vote on what should get built or featured next. The
                  community sets the agenda.
                </p>
              </div>
            </div>

            <div className="feat-card reveal d3">
              <div className="mini">
                <div className="mp">
                  <div className="mp-col">
                    <span className="mp-av silver">2</span>
                    <span className="mp-pts">+8</span>
                    <span className="mp-bar b2" />
                  </div>
                  <div className="mp-col">
                    <span className="mp-av gold">1</span>
                    <span className="mp-pts">+12</span>
                    <span className="mp-bar b1" />
                  </div>
                  <div className="mp-col">
                    <span className="mp-av bronze">3</span>
                    <span className="mp-pts">+5</span>
                    <span className="mp-bar b3" />
                  </div>
                </div>
              </div>
              <div className="feat-body">
                <h3 className="feat-title">Leaderboards</h3>
                <p className="feat-desc">
                  7-day, 30-day, all-time. Earn points for posts, comments, and "I
                  made this" replies.
                </p>
              </div>
            </div>

            <div className="feat-card reveal">
              <div className="mini">
                <div className="mbm">
                  <div className="mbm-stack">
                    <div className="mbm-card c2" />
                    <div className="mbm-card c1">
                      <span className="mbm-thumb" />
                      <span className="mbm-lines">
                        <i className="a" />
                        <i className="b" />
                      </span>
                    </div>
                    <span className="mbm-flag">
                      <svg viewBox="0 0 24 24">
                        <path d="M6 3h12v18l-6-4-6 4Z" />
                      </svg>
                    </span>
                  </div>
                  <span className="mbm-cap">2 saved</span>
                </div>
              </div>
              <div className="feat-body">
                <h3 className="feat-title">Bookmarks</h3>
                <p className="feat-desc">
                  Pin any post to your Saved page and come back to it whenever
                  you're ready.
                </p>
              </div>
            </div>

            <div className="feat-card reveal d1">
              <div className="mini">
                <div className="mc">
                  <div className="mc-row in">
                    <span className="mc-av gray" />
                    <span className="mc-bub gray">How'd you build that?</span>
                  </div>
                  <div className="mc-row out">
                    <span className="mc-av brand" />
                    <span className="mc-bub blue">Used this prompt →</span>
                  </div>
                </div>
              </div>
              <div className="feat-body">
                <h3 className="feat-title">Direct messaging</h3>
                <p className="feat-desc">
                  Message any member 1-on-1 to ask how they made something or
                  trade techniques.
                </p>
              </div>
            </div>

            <div className="feat-card reveal d2">
              <div className="mini">
                <div className="mcal">
                  <div className="mcal-week">
                    <span>M</span>
                    <span>T</span>
                    <span className="on">W</span>
                    <span>T</span>
                    <span>F</span>
                  </div>
                  <div className="mcal-grid">
                    <i /><i /><i /><i /><i />
                    <i /><i /><i className="on" /><i /><i />
                    <i /><i /><i /><i /><i />
                  </div>
                  <span className="mcal-tag">📞 Q&amp;A · Wed 5pm</span>
                </div>
              </div>
              <div className="feat-body">
                <h3 className="feat-title">Calendar</h3>
                <p className="feat-desc">
                  A weekly Q&amp;A call plus community events, all on a shared
                  schedule.
                </p>
              </div>
            </div>

            <div className="feat-card reveal d3">
              <div className="mini">
                <div className="mpf">
                  <span className="mpf-av">M</span>
                  <span className="mpf-name">Member</span>
                  <span className="mpf-chip">🔥 active</span>
                </div>
              </div>
              <div className="feat-body">
                <h3 className="feat-title">Member profiles</h3>
                <p className="feat-desc">
                  Profiles with avatars so you can see who's who and what they've
                  made.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="wrap">
          <div className="claims">
            <div className="claim reveal">
              <div className="claim-ico">
                <svg viewBox="0 0 24 24">
                  <path d="M13 2 4 14h7l-1 8 9-12h-7l1-8Z" />
                </svg>
              </div>
              <div>
                <p className="claim-text">
                  Your feed updates as members post —{" "}
                  <b>real-time, ad-free, no algorithm.</b>
                </p>
                <span className="claim-live">
                  <span className="dot" />
                  Live feed
                </span>
              </div>
            </div>
            <div className="claim reveal d1">
              <div className="claim-ico">
                <svg viewBox="0 0 24 24">
                  <path d="M7 4h10v4a5 5 0 0 1-10 0V4Z" />
                  <path d="M7 6H4.5a1.5 1.5 0 0 0 0 5H8" />
                  <path d="M17 6h2.5a1.5 1.5 0 0 1 0 5H16" />
                  <path d="M9.5 20h5" />
                  <path d="M12 12v5" />
                </svg>
              </div>
              <div>
                <p className="claim-text">
                  Built for makers, not lurkers —{" "}
                  <b>the leaderboard rewards people who actually try the bangers.</b>
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="section soft" id="faq">
        <div className="wrap">
          <div className="section-head">
            <hr className="grad-divider reveal" />
            <div className="eyebrow reveal">FAQ</div>
            <h2 className="section-title reveal d1">
              Questions, answered straight
            </h2>
          </div>
          <div className="faq">
            <details className="faq-item reveal" open>
              <summary>What's a banger?</summary>
              <div className="faq-a">
                A banger is a short — under 10 minutes — AI walkthrough you can
                follow start-to-finish in one sitting. No fluff intros, no
                90-minute lectures.
              </div>
            </details>
            <details className="faq-item reveal">
              <summary>Do I need to know how to code?</summary>
              <div className="faq-a">
                Not necessarily. Some bangers are no-code — prompt engineering,
                agent setups, automations — while others touch light coding.
                Skill levels range from beginner to advanced.
              </div>
            </details>
            <details className="faq-item reveal">
              <summary>How do I post a banger?</summary>
              <div className="faq-a">
                Drop a Loom, YouTube, or Vimeo link in any channel and add tags.
                That's it.
              </div>
            </details>
            <details className="faq-item reveal">
              <summary>What if I get stuck?</summary>
              <div className="faq-a">
                Comment on the banger, DM the maker, or post in the channel —
                you'll get a response from the community.
              </div>
            </details>
            <details className="faq-item reveal">
              <summary>How do I join?</summary>
              <div className="faq-a">
                Single-tap Google sign-in. We use Google-only signup to keep
                duplicates and bots out.
              </div>
            </details>
          </div>
        </div>
      </section>

      <section className="final">
        <div className="wrap">
          <div className="final-panel reveal">
            <div className="final-eyebrow">The whole loop</div>
            <h2 className="final-title">
              Watch one. Try it.
              <br />
              Post what you made.
            </h2>
            <p className="final-sub">
              A members-only community for people making things with AI.
            </p>
            <div className="final-cta">
              <button className="btn btn-light btn-lg" onClick={onJoin}>
                <span className="g-glyph" />
                Join with Google
              </button>
            </div>
            <p className="final-note">
              Currently invite-only via Google. Pricing announced soon.
            </p>
          </div>
        </div>
      </section>

      <footer className="footer">
        <div className="wrap">
          <div className="footer-cols">
            <div className="footer-brandcol">
              <a className="brand" href="#top">
                <span className="brand-mark" />
                <span className="brand-name">
                  B<span className="ai">ai</span>ngers
                </span>
              </a>
              <p className="tagline">
                AI bangers, under 10 minutes. A members-only community for people
                actually making things with AI.
              </p>
            </div>
            <div className="footer-col">
              <h4>Product</h4>
              <a href="/community">Community</a>
              <a href="/school">Classroom</a>
              <a href="/suggestions">Suggestions</a>
              <a href="/about">About</a>
            </div>
            <div className="footer-col">
              <h4>Legal</h4>
              <a href="/terms">Terms</a>
              <a href="/privacy">Privacy</a>
              <a href="/about">Contact</a>
            </div>
          </div>
          <div className="footer-bottom">
            <span className="brand-name">
              B<span className="ai">ai</span>ngers
            </span>
            <span>· baingers.com</span>
            <span style={{ marginLeft: "auto" }}>
              © 2026 Baingers. Invite-only via Google.
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
