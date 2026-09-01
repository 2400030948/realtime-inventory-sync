import { Component } from 'react';

// Catches any render-time error and shows it on screen so we never get a blank page.
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    // eslint-disable-next-line no-console
    console.error('ErrorBoundary caught:', error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div
          style={{
            padding: 24,
            fontFamily: 'monospace',
            color: '#ff5d73',
            background: '#0f172a',
            minHeight: '100vh',
          }}
        >
          <h2 style={{ marginTop: 0 }}>Something went wrong rendering the app:</h2>
          <pre style={{ whiteSpace: 'pre-wrap', background: '#1a2238', padding: 12, borderRadius: 8 }}>
            {String(this.state.error?.stack || this.state.error)}
          </pre>
        </div>
      );
    }
    return this.props.children;
  }
}