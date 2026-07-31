"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, ShieldCheck } from "lucide-react";

const sections = [
  {
    title: "1. Overview",
    body: `This Privacy Policy explains how Obsidian ("we", "us", "our") collects, uses, and protects your personal information when you use our secure messaging and collaboration platform. We are committed to protecting your privacy and handling your data transparently and responsibly.`,
  },
  {
    title: "2. Information We Collect",
    body: `We collect the following categories of information: (a) Account Information — your name, email address, and username when you register; (b) Profile Data — optional information you choose to provide such as a profile photo, bio, pronouns, and location; (c) Messages & Content — messages, files, voice/video session metadata, and any other content you create within the app; (d) Usage Data — technical information such as device type, browser, IP address, and pages visited, used solely for service operation and security.`,
  },
  {
    title: "3. How We Use Your Information",
    body: `We use your information to: (a) provide, maintain, and improve the Service; (b) authenticate your identity and secure your account; (c) send important notices such as password reset or security alerts; (d) respond to support requests; (e) detect and prevent fraud, abuse, or violations of our Terms. We do not use your messages or personal content for advertising or sell them to third parties.`,
  },
  {
    title: "4. Data Storage & Security",
    body: `Your data is stored securely using Supabase (PostgreSQL) with Row Level Security (RLS) enforced at the database level. This means only you and authorised participants can access your conversations and files. All data is transmitted over HTTPS/TLS. We apply industry-standard security practices including key rotation, access controls, and regular audits.`,
  },
  {
    title: "5. End-to-End Messaging",
    body: `Obsidian is designed with privacy-first principles. While messages are securely stored in our database with RLS protection, we strive toward end-to-end encryption on sensitive content. Messages are never read, analysed, or used by us for any purpose other than delivering them to the intended recipient.`,
  },
  {
    title: "6. Third-Party Services",
    body: `We use the following trusted third-party services to operate Obsidian: Supabase (database and authentication), LiveKit (real-time audio/video), Google Gemini (AI assistant), ElevenLabs (voice synthesis), and Klipy (media content). Each of these providers has their own privacy policy and may process data in accordance with it. We only share the minimum necessary data with each provider.`,
  },
  {
    title: "7. Cookies & Local Storage",
    body: `Obsidian uses session cookies issued by Supabase to maintain your authenticated session. We also use browser localStorage to store your notification history and preferences locally on your device. We do not use tracking or advertising cookies.`,
  },
  {
    title: "8. Data Retention",
    body: `We retain your account data for as long as your account is active. If you delete your account, your personal information and messages are permanently removed from our systems within 30 days, subject to any legal obligations to retain certain records.`,
  },
  {
    title: "9. Your Rights",
    body: `Depending on your jurisdiction, you may have the right to: (a) access the personal data we hold about you; (b) request correction of inaccurate data; (c) request deletion of your account and associated data; (d) withdraw consent where processing is based on consent. You can exercise these rights through Settings → Account → Delete Account, or by contacting us via the in-app Help section.`,
  },
  {
    title: "10. Children's Privacy",
    body: `Obsidian is not intended for users under the age of 13. We do not knowingly collect personal information from children under 13. If we become aware that a child under 13 has provided personal information, we will take steps to delete that information promptly.`,
  },
  {
    title: "11. Changes to This Policy",
    body: `We may update this Privacy Policy from time to time. We will notify you of material changes via email or an in-app notice. Continued use of the Service after changes are posted constitutes acceptance of the updated policy.`,
  },
  {
    title: "12. Contact Us",
    body: `If you have any questions, concerns, or requests related to this Privacy Policy, please contact us through the Settings → Help section inside the app.`,
  },
];

export default function PrivacyPage() {
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
          <div className="size-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-cyan-500 grid place-items-center shadow-glow-cyan flex-shrink-0">
            <ShieldCheck className="text-white size-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Privacy Policy</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Last updated: July 2026</p>
          </div>
        </div>

        {/* Intro */}
        <div className="glass rounded-2xl p-5 mb-6 text-sm text-muted-foreground leading-relaxed border border-emerald-400/20">
          Your privacy is fundamental to Obsidian. We are committed to transparency about how your data is collected, stored, and used. This policy applies to all users of the Obsidian platform.
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
          <Link href="/terms" className="text-primary hover:underline">Terms of Service</Link>
        </p>
      </motion.div>
    </div>
  );
}
