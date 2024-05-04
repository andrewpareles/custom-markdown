import React from "react"

class ErrorBoundary extends React.Component<{ children: React.ReactNode, fallback: React.ReactNode }, { error: any }> {
    state = { error: undefined }

    static getDerivedStateFromError(error) {
        return { error }
    }

    componentDidCatch(error) {
        this.setState({ error })
    }
    componentDidUpdate(previousProps, previousState) {
        if (previousProps.children !== this.props.children)
            this.setState({ error: undefined });
    }
    render() {
        return this.state.error ? this.props.fallback : this.props.children
    }
}
export default ErrorBoundary