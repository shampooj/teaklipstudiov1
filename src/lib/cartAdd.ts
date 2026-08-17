// Cart adds only work when the quiz is framed inside the Shopify storefront:
// the theme listens for "cart-add" messages, writes to the real cart, and
// answers with "cart-add-response". Standalone, there is no cart to talk to,
// so callers should hide cart UI unless isEmbedded().

export function isEmbedded(): boolean {
  try {
    return window.self !== window.top;
  } catch {
    // Cross-origin access throws — which itself means we're framed.
    return true;
  }
}

export function requestCartAdd(variantId: string, quizSessionId: string): Promise<boolean> {
  return new Promise((resolve) => {
    const timeout = window.setTimeout(() => {
      window.removeEventListener("message", handler);
      resolve(false);
    }, 5000);
    const handler = (event: MessageEvent) => {
      if (event.data?.type === "cart-add-response") {
        window.clearTimeout(timeout);
        window.removeEventListener("message", handler);
        resolve(!!event.data.success);
      }
    };
    window.addEventListener("message", handler);
    window.top?.postMessage(
      { type: "cart-add", variantId: parseInt(variantId), quantity: 1, quizSessionId },
      "*",
    );
  });
}
