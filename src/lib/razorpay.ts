type RazorpayInstance = { open: () => void };
type RazorpayConstructor = new (options: object) => RazorpayInstance;

function readRazorpay(): RazorpayConstructor | undefined {
  return (window as unknown as { Razorpay?: RazorpayConstructor }).Razorpay;
}

export async function getRazorpay(timeoutMs = 12_000): Promise<RazorpayConstructor> {
  const existing = readRazorpay();
  if (existing) return existing;

  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    await new Promise((resolve) => window.setTimeout(resolve, 50));
    const next = readRazorpay();
    if (next) return next;
  }

  throw new Error("Razorpay checkout failed to load. Check your network and retry.");
}
