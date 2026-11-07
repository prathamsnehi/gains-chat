// RNFirebase 26.4's modular initializer returns before native configuration finishes.
// A token is the readiness barrier; only the brief provider setup race is retried.
export async function waitForAppCheckToken(
  fetchToken: () => Promise<{ token: string }>,
  pause: (milliseconds: number) => Promise<void> = (milliseconds) =>
    new Promise((resolve) => setTimeout(resolve, milliseconds)),
): Promise<void> {
  for (let attempt = 0; ; attempt += 1) {
    try {
      const result = await fetchToken();
      if (!result.token) throw new Error("App Check returned an empty token.");
      return;
    } catch (error) {
      const code = (error as { code?: string }).code;
      if (code !== "appCheck/provider-not-ready" && code !== "app-check/provider-not-ready") throw error;
      if (attempt >= 19) throw error;
      await pause(100);
    }
  }
}
