import Link from "next/link";
import { Camera, Globe, Mail, AtSign } from "lucide-react";

/**
 * Marketing footer — server-rendered, used on the public landing page.
 *
 * Layout: 3 columns on desktop (brand, product, company), stacked on mobile.
 * Bottom row carries copyright + the "Built with love at BRACU" line.
 *
 * No client interactivity is required, so this stays as a server component.
 */
export function Footer() {
  return (
    <footer
      role="contentinfo"
      className="border-t border-[var(--border)] bg-[var(--surface)] text-[var(--text)]"
    >
      <div className="max-w-6xl mx-auto px-4 md:px-6 py-12 md:py-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-12">
          {/* Brand column */}
          <div className="space-y-4">
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-xl font-bold tracking-tight text-[var(--text)]"
            >
              <span
                aria-hidden="true"
                className="inline-flex items-center justify-center h-8 w-8 rounded-lg bg-[var(--primary)] text-white font-extrabold"
              >
                CC
              </span>
              CampusCravings
            </Link>
            <p className="text-sm text-[var(--text-muted)] leading-relaxed max-w-xs">
              The campus-only food marketplace for BRAC University students.
              Skip the queue, support fellow student cooks, and pre-order your
              next meal.
            </p>
            <ul className="flex items-center gap-3 pt-1">
              <li>
                <a
                  href="#"
                  aria-label="Instagram"
                  className="inline-flex items-center justify-center h-9 w-9 rounded-full border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--primary)] hover:border-[var(--primary)] transition-colors"
                >
                  <Camera className="h-4 w-4" aria-hidden="true" />
                </a>
              </li>
              <li>
                <a
                  href="#"
                  aria-label="Twitter"
                  className="inline-flex items-center justify-center h-9 w-9 rounded-full border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--primary)] hover:border-[var(--primary)] transition-colors"
                >
                  <AtSign className="h-4 w-4" aria-hidden="true" />
                </a>
              </li>
              <li>
                <a
                  href="#"
                  aria-label="Facebook"
                  className="inline-flex items-center justify-center h-9 w-9 rounded-full border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--primary)] hover:border-[var(--primary)] transition-colors"
                >
                  <Globe className="h-4 w-4" aria-hidden="true" />
                </a>
              </li>
              <li>
                <a
                  href="#"
                  aria-label="LinkedIn"
                  className="inline-flex items-center justify-center h-9 w-9 rounded-full border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--primary)] hover:border-[var(--primary)] transition-colors"
                >
                  <Mail className="h-4 w-4" aria-hidden="true" />
                </a>
              </li>
            </ul>
          </div>

          {/* Product column */}
          <nav aria-label="Product">
            <h3 className="text-sm font-semibold text-[var(--text)] uppercase tracking-wider">
              Product
            </h3>
            <ul className="mt-4 space-y-3 text-sm">
              <li>
                <Link
                  href="/feed"
                  className="text-[var(--text-muted)] hover:text-[var(--primary)] transition-colors"
                >
                  Browse feed
                </Link>
              </li>
              <li>
                <Link
                  href="/onboarding"
                  className="text-[var(--text-muted)] hover:text-[var(--primary)] transition-colors"
                >
                  Onboarding
                </Link>
              </li>
              <li>
                <Link
                  href="/seller/pending"
                  className="text-[var(--text-muted)] hover:text-[var(--primary)] transition-colors"
                >
                  Apply to sell
                </Link>
              </li>
            </ul>
          </nav>

          {/* Company column */}
          <nav aria-label="Company">
            <h3 className="text-sm font-semibold text-[var(--text)] uppercase tracking-wider">
              Company
            </h3>
            <ul className="mt-4 space-y-3 text-sm">
              <li>
                <a
                  href="#"
                  className="text-[var(--text-muted)] hover:text-[var(--primary)] transition-colors"
                >
                  About
                </a>
              </li>
              <li>
                <a
                  href="mailto:hello@campuscravings.bracu"
                  className="text-[var(--text-muted)] hover:text-[var(--primary)] transition-colors"
                >
                  Contact
                </a>
              </li>
              <li>
                <a
                  href="#"
                  className="text-[var(--text-muted)] hover:text-[var(--primary)] transition-colors"
                >
                  Privacy
                </a>
              </li>
              <li>
                <a
                  href="#"
                  className="text-[var(--text-muted)] hover:text-[var(--primary)] transition-colors"
                >
                  Terms
                </a>
              </li>
            </ul>
          </nav>
        </div>

        {/* Bottom row */}
        <div className="mt-10 pt-6 border-t border-[var(--border)] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[var(--text-subtle)]">
          <p>&copy; 2026 CampusCravings</p>
          <p>Built with &hearts; at BRACU</p>
        </div>
      </div>
    </footer>
  );
}
