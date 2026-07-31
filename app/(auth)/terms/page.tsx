"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, ScrollText } from "lucide-react";

const sections = [
  {
    title: "1. Acceptance of Terms",
    body: `By accessing or using Obsidian ("the App", "the Service"), you agree to be bound by these Terms of Service ("Terms"). If you do not agree to these Terms, please do not use the Service. These Terms apply to all users, including browsers, registered accounts, and contributors.`,
  },
  {
    title: "2. Description of Service",
    body: `Obsidian is a private, secure messaging and collaboration platform providing real-time chat, voice and video calls, file sharing, AI assistance, and related features. The Service is provided "as-is" and may be updated, modified, or discontinued at any time without prior notice.`,
  },
  {
    title: "3. User Accounts",
    body: `You must create an account to use most features of the Service. You are responsible for maintaining the confidentiality of your credentials and for all activity that occurs under your account. You agree to notify us immediately of any unauthorized access. You must be at least 13 years of age to create an account.`,
  },
  {
    title: "4. Acceptable Use",
    body: `You agree not to use the Service to: (a) transmit unlawful, harmful, or abusive content; (b) harass, threaten, or impersonate others; (c) distribute spam, malware, or phishing material; (d) attempt to gain unauthorized access to any part of the Service or other users' accounts; (e) violate any applicable local, national, or international law or regulation.`,
  },
  {
    title: "5. Content Ownership",
    body: `You retain ownership of content you create and share on Obsidian. By submitting content, you grant Obsidian a limited, non-exclusive, royalty-free license to store and deliver that content solely for the purpose of operating the Service. We do not sell your content to third parties.`,
  },
  {
    title: "6. Privacy",
    body: `Your use of the Service is also governed by our Privacy Policy, which is incorporated into these Terms by reference. Please review our Privacy Policy to understand our data practices.`,
  },
  {
    title: "7. Termination",
    body: `We reserve the right to suspend or terminate your account at any time if you violate these Terms or engage in conduct that we determine is harmful to other users, the platform, or third parties. You may also delete your account at any time via Settings.`,
  },
  {
    title: "8. Disclaimers",
    body: `The Service is provided "as is" without warranties of any kind, either express or implied. We do not warrant that the Service will be uninterrupted, error-free, or free of viruses or other harmful components. Your use of the Service is at your sole risk.`,
  },
  {
    title: "9. Limitation of Liability",
    body: `To the fullest extent permitted by law, Obsidian and its team shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of or inability to use the Service, even if advised of the possibility of such damages.`,
  },
  {
    title: "10. Changes to Terms",
    body: `We reserve the right to modify these Terms at any time. We will provide notice of significant changes via the app or email. Continued use of the Service after any changes constitutes your acceptance of the revised Terms. The date of last update is shown at the bottom of this page.`,
  },
  {
    title: "11. Contact",
    body: `If you have questions about these Terms, please reach out through the Settings → Help section inside the app.`,
  },
];

export default function TermsPage() {
  return (
    <div className="min-h-dvh px-6 py-10 max-w-3xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        {/* Back button */}
        <Link
          href="/register"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-8 transition-colors"
        >
          <ArrowLeft className="size-4" />
          Back
        </Link>

        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <div className="size-12 rounded-2xl bg-gradient-to-br from-violet-500 to-blue-500 grid place-items-center shadow-glow-cyan flex-shrink-0">
            <ScrollText className="text-white size-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Terms of Service</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Last updated: July 2026</p>
          </div>
        </div>

        {/* Intro */}
        <div className="glass rounded-2xl p-5 mb-6 text-sm text-muted-foreground leading-relaxed">
          Please read these Terms of Service carefully before using Obsidian. These terms govern your access to and use of all features and services provided by Obsidian.
        </div>

        {/* Sections */}
        <div className="space-y-4">
          {sections.map((section, i) => (
            <motion.div
              key={section.title}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className="glass rounded-2xl p-5"
            >
              <h2 className="text-sm font-semibold text-foreground mb-2">{section.title}</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">{section.body}</p>
            </motion.div>
          ))}
        </div>

        {/* Footer */}
        <p className="text-xs text-muted-foreground text-center mt-10 pb-6">
          © 2026 Obsidian · Safe &amp; Secure Messaging ·{" "}
          <Link href="/privacy" className="text-primary hover:underline">Privacy Policy</Link>
        </p>
      </motion.div>
    </div>
  );
}
