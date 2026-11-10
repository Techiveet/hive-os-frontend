"use client";

import React from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";

interface Props {
  children: React.ReactNode;
  /** Shown in the message, e.g. "conversation". */
  label?: string;
  /** When this value changes the boundary clears itself (e.g. the active conversation id). */
  resetKey?: unknown;
}

interface State {
  hasError: boolean;
}

export class ChatErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("Chat component crashed:", error, info.componentStack);
  }

  componentDidUpdate(previous: Props) {
    if (this.state.hasError && previous.resetKey !== this.props.resetKey) {
      this.setState({ hasError: false });
    }
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div role="alert" className="flex h-full min-h-64 flex-col items-center justify-center gap-4 p-8 text-center">
        <span className="grid h-14 w-14 place-items-center rounded-2xl bg-destructive/10 text-destructive">
          <AlertTriangle className="h-6 w-6" aria-hidden="true" />
        </span>
        <div>
          <h2 className="font-semibold">Something went wrong</h2>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            The {this.props.label ?? "chat"} couldn’t be displayed. Your messages are safe.
          </p>
        </div>
        <Button type="button" variant="outline" className="gap-2" onClick={() => this.setState({ hasError: false })}>
          <RotateCcw className="h-4 w-4" aria-hidden="true" />
          Try again
        </Button>
      </div>
    );
  }
}
