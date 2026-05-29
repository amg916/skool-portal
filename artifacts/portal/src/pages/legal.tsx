import { Link } from "wouter";

function LegalShell({
  title,
  eyebrow,
  children,
}: {
  title: string;
  eyebrow: string;
  children: React.ReactNode;
}) {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
      <div className="b-hero-panel px-7 py-7 sm:px-9 sm:py-9 mb-8">
        <span className="b-badge">
          <span className="dot" />
          {eyebrow}
        </span>
        <h1 className="text-white text-[2rem] sm:text-[2.4rem] font-extrabold tracking-tight mt-3 leading-[1.08]">
          {title}
        </h1>
        <p className="text-white/75 text-sm mt-2">
          Last updated: 2026-05-28 · Subject to change before public sign-up
          opens.
        </p>
      </div>

      <div className="prose prose-slate dark:prose-invert max-w-none bg-card border border-border rounded-2xl p-7 shadow-sm">
        {children}
      </div>

      <p className="text-xs text-muted-foreground mt-6 text-center">
        Questions?{" "}
        <a
          className="text-[var(--b-blue)] hover:underline"
          href="mailto:hello@baingers.com"
        >
          hello@baingers.com
        </a>
        {" · "}
        <Link href="/about" className="hover:underline">
          About Baingers
        </Link>
      </p>
    </div>
  );
}

export function TermsPage() {
  return (
    <LegalShell title="Terms of Service" eyebrow="LEGAL">
      <p>
        <strong>This is a placeholder draft.</strong> The full Terms of Service
        will be published before Baingers opens to public sign-up. Until then,
        the short version is below.
      </p>

      <h3>1. Who can use Baingers</h3>
      <p>
        Baingers is a members-only community. Access is by Google sign-in only.
        You agree not to share your account, scrape members, or use the
        community for spam.
      </p>

      <h3>2. Content you post</h3>
      <p>
        You retain ownership of anything you post. By posting, you grant
        Baingers a non-exclusive license to display it inside the community. Do
        not post content that infringes someone else's copyright or violates
        applicable law.
      </p>

      <h3>3. Conduct</h3>
      <p>
        Be useful, be honest, build things. No harassment, no hate, no doxxing,
        no get-rich-quick pitches, no AI-generated low-effort filler. Admins
        may remove content or accounts at our discretion.
      </p>

      <h3>4. Service availability</h3>
      <p>
        Baingers is in early access. We may change, pause, or break features
        as we ship. Treat anything you post as recoverable but not guaranteed.
      </p>

      <h3>5. Liability</h3>
      <p>
        Baingers is provided "as is." We are not liable for any decisions you
        make based on community content. Always verify before you ship.
      </p>

      <h3>6. Contact</h3>
      <p>
        Questions, takedowns, or feedback:{" "}
        <a href="mailto:hello@baingers.com">hello@baingers.com</a>.
      </p>
    </LegalShell>
  );
}

export function PrivacyPage() {
  return (
    <LegalShell title="Privacy Policy" eyebrow="LEGAL">
      <p>
        <strong>This is a placeholder draft.</strong> The full Privacy Policy
        will be published before Baingers opens to public sign-up. The short
        version:
      </p>

      <h3>1. What we collect</h3>
      <ul>
        <li>
          <strong>Account basics from Google:</strong> your name, email
          address, profile picture URL, and Google account ID. We never see or
          store your Google password.
        </li>
        <li>
          <strong>Content you create:</strong> posts, comments, reactions,
          bookmarks, suggestions, lessons completed, and direct messages.
        </li>
        <li>
          <strong>Logs:</strong> standard request logs (IP address, user agent,
          referrer) for security and debugging.
        </li>
      </ul>

      <h3>2. How we use it</h3>
      <ul>
        <li>To show you the feed, leaderboards, classroom, and DMs.</li>
        <li>To keep bots and duplicate accounts out.</li>
        <li>To improve the product and respond to support requests.</li>
      </ul>

      <h3>3. What we do not do</h3>
      <ul>
        <li>We do not sell your data.</li>
        <li>We do not show third-party ads.</li>
        <li>We do not share your data with advertisers or data brokers.</li>
      </ul>

      <h3>4. Who can see what</h3>
      <p>
        Anything you post in a channel is visible to other members. Direct
        messages are visible only to you and the recipient. Admins can see
        public posts and aggregate stats.
      </p>

      <h3>5. Your controls</h3>
      <p>
        You can delete any post, comment, or message you authored at any time.
        To delete your entire account or request a data export, email{" "}
        <a href="mailto:hello@baingers.com">hello@baingers.com</a>.
      </p>

      <h3>6. Storage</h3>
      <p>
        Data is stored on managed PostgreSQL (Neon) in the US. Backups are
        encrypted in transit and at rest.
      </p>
    </LegalShell>
  );
}
