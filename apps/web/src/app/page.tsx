import { redirect } from "next/navigation";
import { currentMerchant } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function Home() {
  redirect((await currentMerchant()) ? "/dashboard" : "/login");
}
