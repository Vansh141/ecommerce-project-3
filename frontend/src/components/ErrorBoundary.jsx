import { Component } from 'react';
import { AlertTriangle } from 'lucide-react';

/**
 * Catches render errors so one broken component cannot blank the whole site.
 * Without this, a single undefined property in a product card takes down the
 * entire storefront with a white screen and no explanation.
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    // In production this is where an error reporter (e.g. Sentry) would go.
     
    console.error('Render error:', error, info?.componentStack);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="flex min-h-[60vh] items-center justify-center px-5">
        <div className="max-w-md text-center">
          <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-full bg-danger-faint">
            <AlertTriangle size={22} className="text-danger" aria-hidden="true" />
          </div>
          <h1 className="text-2xl">Something went wrong</h1>
          <p className="mt-3 text-sm leading-relaxed text-ink-muted">
            Sorry — that page failed to load. Reloading usually fixes it.
          </p>
          <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="btn-primary btn-md"
            >
              Reload page
            </button>
            <a href="/" className="btn-secondary btn-md">Go home</a>
          </div>
        </div>
      </div>
    );
  }
}
