"use client"

import React, { Component, type ReactNode } from "react"

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error?: Error
}

/**
 * React error boundary that catches render errors and shows a fallback UI
 * instead of crashing the entire app. Wrap around sections of the component
 * tree that might fail (e.g., tool cards, dashboard widgets).
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("[ErrorBoundary]", error, errorInfo.componentStack)
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback ?? (
          <div
            role="alert"
            className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm"
          >
            <p className="font-medium text-destructive">
              Something went wrong
            </p>
            <p className="mt-1 text-muted-foreground">
              {this.state.error?.message ?? "An unexpected error occurred."}
            </p>
            <button
              onClick={() => this.setState({ hasError: false })}
              className="mt-2 text-xs text-primary underline hover:no-underline"
            >
              Try again
            </button>
          </div>
        )
      )
    }

    return this.props.children
  }
}
