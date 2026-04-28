import Image from 'next/image'
import Link from 'next/link'
import { JetBrains_Mono, Sora } from 'next/font/google'

import styles from '@/components/marketing/LandingPage.module.css'

const sora = Sora({
  subsets: ['latin'],
  variable: '--font-landing-sora',
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-landing-mono',
})

const valueCards = [
  {
    title: 'Practical before flashy',
    body: 'Uthaan is built to solve day-to-day school work first: attendance, fees, results, announcements, and cleaner parent communication.',
  },
  {
    title: 'Built around Pakistani school workflows',
    body: 'The product is shaped around how Pakistani private schools already operate, not around imported assumptions from other markets.',
  },
  {
    title: 'Clear for parents',
    body: 'Parents should understand what matters quickly: attendance, results, fees, announcements, and the next step to take.',
  },
  {
    title: 'Fast for teachers',
    body: 'Teachers need workflows that reduce admin burden, not one more system to wrestle with before class starts.',
  },
  {
    title: 'Controlled for admins',
    body: 'Admins need visibility, accountability, and role-appropriate controls so the school can run with confidence.',
  },
  {
    title: 'Responsible AI for staff only',
    body: 'AI in Uthaan is designed for school staff workflows and remains school-aware, role-aware, and carefully gated.',
  },
]

const trustPoints = [
  'Role-based access for the people who need it',
  'School-scoped data and guided onboarding',
  'Staff-only AI tools where available',
  'Honest product claims about what is live today',
  'Manual onboarding, payments, and rollout where needed',
  'A long-term product mindset instead of shortcuts',
]

export default function FoundersPage() {
  return (
    <div className={`${styles.page} ${styles.sora} ${sora.variable} ${jetbrainsMono.variable}`}>
      <nav className={styles.nav}>
        <Link href="/" className={styles.navLogo}>
          Uth<span>aan</span>
        </Link>
        <ul className={styles.navLinks}>
          <li>
            <Link href="/#features">Features</Link>
          </li>
          <li>
            <Link href="/#ai">AI</Link>
          </li>
          <li>
            <Link href="/#pricing">Pricing</Link>
          </li>
          <li>
            <Link href="/#compare">Compare</Link>
          </li>
          <li>
            <Link href="/founders" className={styles.navLinkActive}>
              Founders
            </Link>
          </li>
        </ul>
        <div className={styles.navActions}>
          <Link href="/login" className={styles.navLogin}>
            Login
          </Link>
          <Link href="/demo" className={styles.navCta}>
            Request demo
          </Link>
        </div>
      </nav>

      <section className={styles.hero}>
        <div className={styles.heroGlow} aria-hidden="true" />
        <div className={styles.heroGrid} aria-hidden="true" />
        <div className={`${styles.heroBadge} ${styles.mono}`}>Founder story</div>
        <h1>Built for the schools we know best.</h1>
        <p>
          Uthaan is a founder-led school platform built for Pakistani private schools, designed to
          bring students, attendance, fees, results, announcements, and parent communication into
          one clear system.
        </p>
        <div className={styles.heroButtons}>
          <Link href="/demo" className={styles.btnPrimary}>
            Request demo
          </Link>
          <Link href="/#pricing" className={styles.btnSecondary}>
            See plans
          </Link>
        </div>
      </section>

      <section className={styles.section}>
        <div
          className={`${styles.founderIntroGrid} grid items-start gap-8 lg:grid-cols-[minmax(320px,420px)_minmax(0,1fr)]`}
        >
          <div
            className={`${styles.founderPhotoCard} overflow-hidden rounded-[28px] border border-[rgba(34,168,98,0.22)] bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.02))] shadow-[0_28px_56px_rgba(0,0,0,0.22)]`}
          >
            <div className="relative aspect-[4/5] w-full overflow-hidden">
              <Image
                src="/founder-asad-pasha-chaudhry.jpeg"
                alt="Asad Pasha Chaudhry, founder of Uthaan"
                fill
                priority
                sizes="(max-width: 1024px) 100vw, 420px"
                className="object-cover object-center"
              />
              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-[rgba(13,17,23,0.92)] via-[rgba(13,17,23,0.35)] to-transparent" />
            </div>
            <div className="space-y-1 px-5 py-5 sm:px-6">
              <div className="text-lg font-semibold text-white">Asad Pasha Chaudhry</div>
              <div className="text-sm text-[#22a862]">Founder, Uthaan</div>
              <div className="text-sm text-[#8b949e]">Pakistani CS student at UCSD</div>
            </div>
          </div>

          <div className="space-y-8">
            <div>
              <div className={`${styles.sectionTag} ${styles.mono}`}>Meet the founder</div>
              <h2 className={styles.sectionTitle}>A founder-led product shaped by real school operations.</h2>
              <p className={styles.sectionSub}>
                Uthaan was started by Asad Pasha Chaudhry, a Pakistani Computer Science student at
                UCSD, with a personal connection to school operations in Pakistan. The idea came
                from a simple belief: schools should not have to depend on scattered registers,
                spreadsheets, and disconnected messages to run their daily operations.
              </p>
            </div>

            <div className={`${styles.founderQuoteCard} space-y-4 rounded-[24px] border border-[rgba(255,255,255,0.08)] bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.02))] p-6 shadow-[0_22px_40px_rgba(0,0,0,0.16)]`}>
              <p className="text-base leading-7 text-[#c8d1d9]">
                Uthaan is my attempt to build the school platform Pakistani schools actually
                deserve, practical enough for daily use, modern enough for the future, and careful
                enough for the trust schools place in it.
              </p>
              <p className="border-l-2 border-[rgba(34,168,98,0.45)] pl-4 text-sm leading-7 text-[#8b949e]">
                My goal with Uthaan is simple: build something Pakistani schools can actually use,
                trust, and grow with. This is not just a software project to me. It is a long-term
                mission.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <div className={`${styles.sectionTag} ${styles.mono}`}>Why Uthaan exists</div>
        <h2 className={styles.sectionTitle}>Software should adapt to schools, not the other way around.</h2>
        <p className={styles.sectionSub}>
          Pakistani schools do not need another complicated dashboard. They need a practical
          operating system that respects how schools already work while helping them become faster,
          clearer, and more organized. The goal is not to make schools adapt to software. The goal
          is to build software around how schools already work.
        </p>
      </section>

      <section className={`${styles.section} ${styles.brandMeaningSection}`}>
        <div className={styles.brandMeaningGrid}>
          <div className={styles.brandMeaningVisual}>
            <Image
              src="/brand/uthaan-logo-primary.svg"
              alt="Uthaan primary logo"
              width={640}
              height={210}
              sizes="(max-width: 1024px) 100vw, 420px"
              className={styles.brandMeaningLogo}
            />
          </div>

          <div className={styles.brandMeaningCopy}>
            <div className={`${styles.sectionTag} ${styles.mono}`}>Brand meaning</div>
            <h2 className={styles.sectionTitle}>The Meaning Behind Uthaan</h2>
            <p>
              Uthaan means rising, uplift, and progress, and that is exactly what we want to help
              schools achieve.
            </p>
            <p>
              The Uthaan symbol combines a rising school roof, an open book, upward movement, and a
              small flag.
            </p>
            <ul>
              <li>The roof represents the school as a trusted institution.</li>
              <li>The open book represents learning, records, and academic growth.</li>
              <li>
                The upward form represents Uthaan itself: lifting schools toward a more organized,
                modern future.
              </li>
              <li>
                The small flag at the top represents achievement, direction, and a school reaching a
                higher standard.
              </li>
            </ul>
            <p>
              Uthaan exists to help Pakistani schools move upward from registers, spreadsheets, and
              scattered systems into one organized future.
            </p>
            <p className={styles.brandMeaningClose}>
              This is why we chose the name Uthaan, because we are not just building software, we are
              helping schools move upward.
            </p>
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <div className={`${styles.sectionTag} ${styles.mono}`}>Values</div>
        <h2 className={styles.sectionTitle}>What the product is trying to stand for.</h2>
        <div className={`${styles.founderValuesGrid} mt-12 grid gap-px overflow-hidden rounded-[24px] border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.08)] md:grid-cols-2 xl:grid-cols-3`}>
          {valueCards.map((card) => (
            <div
              key={card.title}
              className="bg-[#161b22] p-6 transition-colors duration-200 hover:bg-[rgba(34,168,98,0.06)]"
            >
              <h3 className="mb-3 text-lg font-semibold text-white">{card.title}</h3>
              <p className="text-sm leading-7 text-[#8b949e]">{card.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className={styles.section}>
        <div className={`${styles.founderTrustGrid} grid gap-8 lg:grid-cols-[minmax(0,1.05fr)_minmax(300px,0.95fr)]`}>
          <div>
            <div className={`${styles.sectionTag} ${styles.mono}`}>Built carefully, not carelessly</div>
            <h2 className={styles.sectionTitle}>Trust has to be earned in school software.</h2>
            <p className={styles.sectionSub}>
              Uthaan is being built with role-aware access, school-scoped data, guided onboarding,
              and staff-only AI where appropriate. It also means staying honest: payments and
              WhatsApp are not presented as live unless they are actually live.
            </p>
          </div>
          <div className={`${styles.founderTrustPanel} rounded-[24px] border border-[rgba(255,255,255,0.08)] bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.02))] p-6 shadow-[0_24px_44px_rgba(0,0,0,0.18)]`}>
            <ul className="grid gap-3">
              {trustPoints.map((point) => (
                <li
                  key={point}
                  className="flex items-start gap-3 rounded-2xl border border-[rgba(255,255,255,0.05)] bg-[rgba(255,255,255,0.02)] px-4 py-3 text-sm text-[#c8d1d9]"
                >
                  <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-[#22a862]" />
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <div className={styles.ctaSection}>
        <div className={styles.ctaBox}>
          <div className={`${styles.sectionTag} ${styles.mono}`}>Want to see if Uthaan fits your school?</div>
          <h2>Start with a guided demo.</h2>
          <p>
            See how Uthaan can support your school’s daily operations with a founder-led,
            consultative rollout instead of a rushed setup.
          </p>
          <div className={styles.heroButtons}>
            <Link href="/demo" className={styles.btnPrimary}>
              Request demo
            </Link>
            <Link href="/" className={styles.btnSecondary}>
              Back to website
            </Link>
          </div>
        </div>
      </div>

      <footer className={styles.footer}>Founder-led from Pakistan, built carefully for Pakistani private schools.</footer>
    </div>
  )
}
