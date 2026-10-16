import Link from "next/link";
import { SignUpForm } from "@/components/forms";

export default function SignUpPage() {
  return (
    <div className="mx-auto max-w-md space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Create your merchant account</h1>
        <p className="mt-1 text-sm text-muted">
          You need an Open Payments wallet. On the test network, create one at{" "}
          <a className="underline" href="https://wallet.interledger-test.dev" target="_blank" rel="noreferrer">wallet.interledger-test.dev</a>.
        </p>
      </div>
      <div className="rounded-xl border border-line bg-surface p-6"><SignUpForm /></div>
      <p className="text-sm text-muted">Already have an account? <Link className="underline" href="/login">Sign in</Link></p>
    </div>
  );
}
