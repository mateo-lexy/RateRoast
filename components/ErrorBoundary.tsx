'use client';

import React from 'react';

interface ErrorBoundaryState {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      message: error.message || 'An unexpected error occurred.',
    };
  }

  render() {
    if (this.state.hasError) {
      return (
        <main className="mx-auto px-4 py-16" style={{ maxWidth: 960 }}>
          <div className="glass p-6 md:p-8">
            <h1 className="hd text-2xl">Something hit a snag</h1>
            <p className="mute mt-2 text-sm">{this.state.message}</p>
            <button
              type="button"
              className="btn btn-dark mt-5"
              onClick={() => window.location.reload()}
            >
              Reload RateRoast
            </button>
          </div>
        </main>
      );
    }
    return this.props.children;
  }
}
