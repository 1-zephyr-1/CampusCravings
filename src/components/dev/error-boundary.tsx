"use client";
import { Component, ReactNode } from "react";
import { audit } from "@/lib/audit";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

/**
 * Global React error boundary. Catches any uncaught render-time errors in
 * the subtree and reports them via `audit()` so production incidents are
 * visible. Use the `fallback` prop to swap in a richer per-section UI;
 * the default fallback is a generic message.
 */
export class ErrorBoundary extends Component<Props, State> {
  state = { hasError: false, error: undefined };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: unknown) {
    // Report to analytics/audit pipeline. `audit()` is a no-op in dev and a
    // forwarding sink in prod — it never throws.
    audit({
      name: "react.error",
      message: error.message,
      payload: {
        stack: error.stack,
        componentStack:
          typeof info === "object" && info !== null && "componentStack" in info
            ? String((info as { componentStack?: string }).componentStack)
            : undefined,
      },
    });
    if (process.env.NODE_ENV === "production") {
      // Send to analytics
      console.error("[ErrorBoundary]", error, info);
    }
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? <div>Something went wrong.</div>;
    }
    return this.props.children;
  }
}
