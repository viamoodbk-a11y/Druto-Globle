import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null,
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error("ErrorBoundary caught an error:", error, errorInfo);
    }

    private handleReset = () => {
        this.setState({ hasError: false, error: null });
    };

    private handleReload = () => {
        window.location.reload();
    };

    public render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }

            return (
                <div className="min-h-screen bg-background flex items-center justify-center px-6">
                    <div className="text-center max-w-sm">
                        <div className="mx-auto mb-6 h-16 w-16 rounded-2xl bg-destructive/10 flex items-center justify-center">
                            <AlertTriangle className="h-8 w-8 text-destructive" />
                        </div>
                        <h2 className="text-xl font-bold text-foreground mb-2">
                            Something went wrong
                        </h2>
                        <p className="text-muted-foreground text-sm mb-6">
                            An unexpected error occurred. This has been noted. Please try refreshing the page.
                        </p>
                        {process.env.NODE_ENV === "development" && this.state.error && (
                            <pre className="text-left text-xs bg-muted rounded-xl p-4 mb-4 overflow-auto text-red-500 max-h-32">
                                {this.state.error.message}
                            </pre>
                        )}
                        <div className="flex gap-3 justify-center">
                            <Button variant="outline" onClick={this.handleReset}>
                                Try Again
                            </Button>
                            <Button onClick={this.handleReload}>
                                <RefreshCw className="h-4 w-4 mr-2" />
                                Reload Page
                            </Button>
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
