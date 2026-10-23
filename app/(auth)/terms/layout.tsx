import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of service",
  alternates: { canonical: "/terms" }
};

export default function TermsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
