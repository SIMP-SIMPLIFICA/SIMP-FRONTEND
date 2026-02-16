import React, { Component, ErrorInfo, ReactNode } from "react";

interface Props {
    children?: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
    errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null,
        errorInfo: null,
    };

    public static getDerivedStateFromError(error: Error): State {
        // Update state so the next render will show the fallback UI.
        return { hasError: true, error, errorInfo: null };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error("Uncaught error:", error, errorInfo);
        this.setState({ error, errorInfo });
    }

    public render() {
        if (this.state.hasError) {
            return (
                <div className="flex h-screen w-screen flex-col items-center justify-center bg-red-50 p-4 text-red-900">
                    <div className="max-w-2xl rounded-xl border border-red-200 bg-white p-8 shadow-xl">
                        <h1 className="mb-4 text-2xl font-bold text-red-600">
                            Something went wrong.
                        </h1>
                        <p className="mb-4 text-gray-700">
                            The application encountered an unexpected error.
                        </p>
                        {this.state.error && (
                            <div className="mb-4 rounded bg-red-100 p-4 font-mono text-sm text-red-800 whitespace-pre-wrap overflow-auto max-h-96">
                                <strong>{this.state.error.toString()}</strong>
                                <br />
                                {this.state.errorInfo?.componentStack}
                            </div>
                        )}
                        <button
                            className="rounded bg-red-600 px-4 py-2 font-bold text-white hover:bg-red-700"
                            onClick={() => window.location.reload()}
                        >
                            Reload Page
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
