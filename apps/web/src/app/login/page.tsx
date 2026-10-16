import Link from "next/link";
import { LogInForm } from "@/components/forms";

export default function LogInPage() {
  return (
    <div className="mx-auto max-w-md space-y-6">
      <h1 className="text-2xl font-semibold">Sign in</h1>
      <div className="rounded-xl border border-line bg-surface p-6"><LogInForm /></div>
      <p className="text-sm text-muted">New here? <Link className="underline" href="/signup">Create a merchant account</Link></p>
    </div>
  );
}
