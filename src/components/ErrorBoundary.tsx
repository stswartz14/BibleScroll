import { Component, type ErrorInfo, type ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState = {
    hasError: false,
    message: '',
  };

  public static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      message: error.message || 'An unexpected error occurred.',
    };
  }

  public componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('BibleScroll ErrorBoundary caught:', error, info);
  }

  private handleReload = () => {
    this.setState({ hasError: false, message: '' });
    window.location.reload();
  };

  public render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="min-h-[100dvh] w-full bg-gradient-to-b from-[#07271E] to-[#121514] text-[#F5F2EA] flex items-center justify-center p-6">
          <div className="max-w-md w-full rounded-2xl bg-[#161B19] border border-[#D4AF37]/30 p-6 text-center space-y-4">
            <h1 className="font-scripture text-2xl font-medium text-[#F5F2EA]">
              Something interrupted your reading
            </h1>
            <p className="text-sm text-[#9CA8A2] leading-relaxed">
              We hit an unexpected issue while syncing or rendering scripture. Reload to continue reading safely.
            </p>
            <button
              type="button"
              onClick={this.handleReload}
              className="min-h-[44px] px-5 py-2.5 rounded-xl bg-[#D4AF37] text-[#121514] text-sm font-semibold hover:bg-[#E2BF4E] transition-colors"
            >
              Reload BibleScroll
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
