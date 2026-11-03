import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About the secure communication platform",
  description:
    "Learn how Obsidian Safe & Secure Messaging brings private chat, calls, communities, whiteboards, stories, and secure files into one collaboration platform.",
  alternates: { canonical: "/about" }
};

export default function AboutLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return children;
}
