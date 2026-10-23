import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, BookOpen, Bug, LockKeyhole } from "lucide-react";

export const metadata: Metadata = {
  title: "Contact and support",
  description:
    "Find the correct support channel for Obsidian Safe & Secure product questions, technical issues, documentation, privacy, and responsible security reports.",
  alternates: { canonical: "/contact" }
};

export default function ContactPage() {
  return (
    <main className="h-dvh overflow-y-auto px-6 py-10">
      <article className="mx-auto max-w-4xl pb-12">
        <Link
          href="/"
          className="mb-10 inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Back to Obsidian
        </Link>

        <header className="max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary">
            Contact &amp; support
          </p>
          <h1 className="mt-4 text-4xl font-display font-semibold tracking-tight md:text-6xl">
            Get help through the right channel.
          </h1>
          <p className="mt-6 text-lg leading-8 text-muted-foreground">
            Obsidian uses public, evidence-based support channels for product questions,
            reproducible bugs, deployment help, and documentation feedback. Choose the route
            below that best matches your request and include enough context for another person
            to understand the problem without access to your account.
          </p>
        </header>

        <div className="mt-12 space-y-5">
          <section className="glass rounded-3xl p-7">
            <div className="flex items-start gap-4">
              <Bug className="mt-1 size-6 shrink-0 text-violet-400" />
              <div>
                <h2 className="text-xl font-semibold">Product issues and feature requests</h2>
                <p className="mt-3 leading-7 text-muted-foreground">
                  Open a GitHub issue for reproducible defects, accessibility problems,
                  deployment questions, or focused feature proposals. Include the affected
                  page, expected result, actual result, browser or runtime version, and a
                  minimal sequence of steps. Search existing issues first to avoid duplicates.
                </p>
                <a
                  href="https://github.com/Code2With-Pratik/Obsidian-safe-and-secure/issues"
                  className="mt-4 inline-block text-sm text-primary hover:underline"
                >
                  Open GitHub issues
                </a>
              </div>
            </div>
          </section>

          <section className="glass rounded-3xl p-7">
            <div className="flex items-start gap-4">
              <BookOpen className="mt-1 size-6 shrink-0 text-cyan-400" />
              <div>
                <h2 className="text-xl font-semibold">Architecture and setup questions</h2>
                <p className="mt-3 leading-7 text-muted-foreground">
                  Consult the complete DeepWiki documentation for codebase navigation,
                  architecture, application flows, environment configuration, and deployment
                  context. Agents should also read the site instruction file before describing
                  supported use cases or interaction boundaries.
                </p>
                <div className="mt-4 flex flex-wrap gap-4 text-sm">
                  <a
                    href="https://deepwiki.com/Code2With-Pratik/Obsidian-safe-and-secure"
                    className="text-primary hover:underline"
                  >
                    Browse DeepWiki
                  </a>
                  <a href="/llms.txt" className="text-primary hover:underline">Read llms.txt</a>
                </div>
              </div>
            </div>
          </section>

          <section className="glass rounded-3xl p-7">
            <div className="flex items-start gap-4">
              <LockKeyhole className="mt-1 size-6 shrink-0 text-emerald-400" />
              <div>
                <h2 className="text-xl font-semibold">Privacy and security</h2>
                <p className="mt-3 leading-7 text-muted-foreground">
                  Review the privacy policy before raising a data-handling question. Never put
                  passwords, access tokens, private keys, personal messages, user records, or
                  other sensitive information in a public issue. For a potential vulnerability,
                  provide only a non-destructive summary until a private reporting channel has
                  been agreed with the project maintainer.
                </p>
                <Link href="/privacy" className="mt-4 inline-block text-sm text-primary hover:underline">
                  Read the privacy policy
                </Link>
              </div>
            </div>
          </section>
        </div>
      </article>
    </main>
  );
}

