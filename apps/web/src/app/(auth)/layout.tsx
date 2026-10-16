import { FlowDemo } from "@/components/flow-demo";
import { Logo, Sparkle } from "@/components/sparkle";

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="grid min-h-screen lg:grid-cols-[minmax(0,480px)_1fr]">
      <div className="flex flex-col px-8 py-8 sm:px-12">
        <div className="flex items-center gap-2 text-xl font-semibold tracking-tight">
          <Logo className="size-7" /> FluPay
        </div>
        <div className="flex flex-1 items-center py-12">
          <div className="w-full">{children}</div>
        </div>
        <p className="text-xs text-muted">Built on Open Payments · Interledger test network</p>
      </div>
      <div className="relative hidden overflow-hidden border-l border-line lg:block">
        <div className="bg-cells fade-edges absolute inset-0" aria-hidden />
        <div className="bg-cell-dots fade-edges absolute inset-0" aria-hidden />
        <Sparkle className="absolute left-[12%] top-[14%]" />
        <Sparkle className="absolute bottom-[12%] right-[12%]" />
        <div className="relative flex h-full flex-col justify-center px-12">
          <h2 className="text-4xl font-semibold leading-tight tracking-tight">
            Agents are trying to buy.
            <br />
            <span className="text-brand">Let them pay you.</span>
          </h2>
          <p className="mt-4 max-w-md text-ink/70">
            Charges over HTTP 402 and Open Payments. The agent pays from its own capped wallet, straight to yours.
          </p>
          <div className="mt-10 max-w-2xl">
            <FlowDemo />
          </div>
        </div>
      </div>
    </div>
  );
}
