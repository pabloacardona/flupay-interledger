import Link from "next/link";
import { LogInForm } from "@/components/forms";

export default function LogInPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Sign in</h1>
        <p className="mt-1 text-sm text-muted">Use your merchant secret API key.</p>
      </div>
      <LogInForm />
      <p className="text-sm text-muted">
        New store? <Link className="font-medium text-brand" href="/signup">Create a merchant account</Link>
      </p>
    </div>
  );
}
