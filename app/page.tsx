import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import SplashPage from "./splash-view";

export default async function Home() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    redirect("/chats");
  }

  return <SplashPage />;
}
