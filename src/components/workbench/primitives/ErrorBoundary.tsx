import { Component, type ErrorInfo, type ReactNode } from "react";
import { ErrorState } from "./States";

function logError(error: Error, info: ErrorInfo): void {
  console.error(error, info.componentStack);
}

/**
 * Catches render errors below it and shows the ErrorState fallback.
 * Retry clears the error and remounts the children (nonce key); the
 * optional onRetry hook lets callers clear the trigger that crashed.
 */
export class ErrorBoundary extends Component<
  {
    children: ReactNode;
    title?: string;
    onError?: (error: Error, info: ErrorInfo) => void;
    onRetry?: () => void;
  },
  { error: Error | null; nonce: number }
> {
  state: { error: Error | null; nonce: number } = { error: null, nonce: 0 };

  static getDerivedStateFromError(error: Error): { error: Error } {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    (this.props.onError ?? logError)(error, info);
  }

  private handleRetry = (): void => {
    this.props.onRetry?.();
    this.setState((previous) => ({ error: null, nonce: previous.nonce + 1 }));
  };

  render(): ReactNode {
    if (this.state.error !== null) {
      return (
        <div className="flex min-h-0 flex-1 items-center justify-center bg-[var(--wb-background)]">
          <ErrorState
            title={this.props.title ?? "Something went wrong"}
            error={this.state.error}
            onRetry={this.handleRetry}
          />
        </div>
      );
    }
    return (
      <div key={this.state.nonce} className="contents">
        {this.props.children}
      </div>
    );
  }
}
