import { redirect } from "next/navigation";
import { currentSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function Home() {
  const session = await currentSession();
  redirect(!session ? "/login" : session.kind === "o" ? "/agents" : "/dashboard");
}
