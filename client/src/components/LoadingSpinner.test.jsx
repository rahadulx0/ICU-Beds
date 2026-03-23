import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import LoadingSpinner from './LoadingSpinner';

describe('LoadingSpinner', () => {
  it('renders inline spinner by default', () => {
    const { container } = render(<LoadingSpinner />);
    expect(container.querySelector('svg')).toBeInTheDocument();
  });

  it('renders fullscreen with loading text', () => {
    render(<LoadingSpinner fullScreen />);
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });
});
