import { Component } from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';

export class ErrorBoundary extends Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error('[ErrorBoundary] Caught error:', error, errorInfo);
    }

    handleReset = () => {
        this.setState({ hasError: false, error: null });
    };

    render() {
        if (this.state.hasError) {
            return (
                <div className="flex h-screen w-full items-center justify-center bg-background px-4">
                    <div className="text-center space-y-4 max-w-md">
                        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10">
                            <AlertTriangle className="h-7 w-7 text-destructive" />
                        </div>
                        <h2 className="text-xl font-bold text-foreground">
                            Something went wrong
                        </h2>
                        <p className="text-sm text-muted-foreground">
                            An unexpected error occurred. Please try again or refresh the page.
                        </p>
                        {import.meta.env.DEV && this.state.error && (
                            <pre className="mt-4 rounded-lg bg-muted p-4 text-left text-xs text-muted-foreground overflow-auto max-h-40">
                                {this.state.error.message}
                            </pre>
                        )}
                        <div className="flex gap-3 justify-center pt-2">
                            <Button variant="outline" onClick={this.handleReset}>
                                Try Again
                            </Button>
                            <Button onClick={() => window.location.reload()}>
                                Refresh Page
                            </Button>
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
