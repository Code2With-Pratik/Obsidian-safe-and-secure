import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact and support",
  description:
    "Find the correct support channel for Obsidian Safe & Secure Messaging product questions, technical issues, documentation, privacy, and responsible security reports.",
  alternates: { canonical: "/contact" }
};

export default function ContactLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return children;
}
