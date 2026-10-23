import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Create a story",
  alternates: { canonical: "/stories/create" }
};

export default function CreateStoryLayout({ children }: { children: React.ReactNode }) {
  return children;
}
