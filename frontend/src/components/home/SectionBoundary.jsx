import { Component } from 'react';

/**
 * Contains a failure to one homepage section.
 *
 * Sections come from admin-managed content, so a malformed one must never
 * take the whole homepage down: it renders nothing, and the rest of the page
 * carries on.
 */
export default class SectionBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { failed: false };
  }

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error) {
    if (import.meta.env.DEV) {
      console.error(`Homepage section "${this.props.name}" failed to render`, error);
    }
  }

  render() {
    // `fallback` keeps anything the page still needs, such as the hero's h1.
    return this.state.failed ? (this.props.fallback ?? null) : this.props.children;
  }
}
