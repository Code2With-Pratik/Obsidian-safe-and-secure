import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import SplashPage from "./splash-view";

export const metadata: Metadata = {
  alternates: { canonical: "/" }
};

export default async function Home() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    redirect("/chats");
  }

  return <SplashPage />;
}
