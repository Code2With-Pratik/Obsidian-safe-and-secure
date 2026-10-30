import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, MessageCircleMore, ShieldCheck, Sparkles } from "lucide-react";
import { useT } from "@/lib/i18n";

export const metadata: Metadata = {
  title: "About the secure communication platform",
  description:
    "Learn how Obsidian Safe & Secure Messaging brings private chat, calls, communities, whiteboards, stories, and secure files into one collaboration platform.",
  alternates: { canonical: "/about" }
};

export default function AboutPage() {
  const t = useT();
  return (
    <main className="h-dvh overflow-y-auto px-6 py-10">
      <article className="mx-auto max-w-4xl pb-12">
        <Link
          href="/"
          className="mb-10 inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          {t("Back to Obsidian")}
        </Link>

        <header className="max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary">{t("About")}</p>
          <h1 className="mt-4 text-4xl font-display font-semibold tracking-tight md:text-6xl">
            {t("One place for secure communication and creative collaboration.")}
          </h1>
          <p className="mt-6 text-lg leading-8 text-muted-foreground">
            {t("Obsidian Safe & Secure is a messaging platform that connects real-time")}{" "}
            {t("messaging, calls, stories, communities, ghost rooms, whiteboards, and protected")}{" "}
            {t("files. It is built for people who want expressive social tools and focused team")}{" "}
            {t("collaboration without moving every conversation into a different product.")}
          </p>
        </header>

        <div className="mt-12 grid gap-5 md:grid-cols-3">
          <section className="glass rounded-3xl p-6">
            <MessageCircleMore className="size-6 text-violet-400" />
            <h2 className="mt-4 text-lg font-semibold">{t("Connected by conversation")}</h2>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              {t("Direct messages, groups, channels, presence, typing signals, reactions,")}{" "}
              {t("scheduled messages, media, and calls share the same real-time foundation.")}
            </p>
          </section>
          <section className="glass rounded-3xl p-6">
            <Sparkles className="size-6 text-cyan-400" />
            <h2 className="mt-4 text-lg font-semibold">{t("Designed for expression")}</h2>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              {t("Stories, communities, ephemeral rooms, customizable themes, and visual")}{" "}
              {t("whiteboards make the platform useful for both personal and collaborative work.")}
            </p>
          </section>
          <section className="glass rounded-3xl p-6">
            <ShieldCheck className="size-6 text-emerald-400" />
            <h2 className="mt-4 text-lg font-semibold">{t("Built with trust boundaries")}</h2>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              {t("Supabase authentication, database row-level security, secure transport, and")}{" "}
              {t("explicit service integrations keep access rules visible and maintainable.")}
            </p>
          </section>
        </div>

        <section className="mt-10 glass rounded-3xl p-7 md:p-9">
          <h2 className="text-2xl font-semibold">{t("How the platform is built")}</h2>
          <p className="mt-4 leading-7 text-muted-foreground">
            {t("The web application uses Next.js, React, and TypeScript. Supabase provides")}{" "}
            {t("authentication, PostgreSQL data, storage, and real-time synchronization. LiveKit")}{" "}
            {t("powers voice and video sessions. Optional integrations provide media discovery,")}{" "}
            {t("AI assistance, and voice synthesis. The source repository and complete technical")}{" "}
            {t("wiki are public so developers and agents can inspect implementation evidence")}{" "}
            {t("instead of relying only on marketing claims.")}
          </p>
          <div className="mt-6 flex flex-wrap gap-4 text-sm">
            <a
              href="https://github.com/Code2With-Pratik/Obsidian-safe-and-secure"
              className="text-primary hover:underline"
            >
              {t("Source repository")}
            </a>
            <a
              href="https://deepwiki.com/Code2With-Pratik/Obsidian-safe-and-secure"
              className="text-primary hover:underline"
            >
              {t("Technical documentation")}
            </a>
            <Link href="/contact" className="text-primary hover:underline">{t("Contact & support")}</Link>
          </div>
        </section>
      </article>
    </main>
  );
}

