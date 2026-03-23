import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '../tests/renderWith';
import NotFound from './NotFound';

describe('NotFound', () => {
  it('renders 404 text', () => {
    renderWithProviders(<NotFound />);
    expect(screen.getByText('404')).toBeInTheDocument();
    expect(screen.getByText('Page not found')).toBeInTheDocument();
  });

  it('has link to map', () => {
    renderWithProviders(<NotFound />);
    const link = screen.getByText('Go to Map');
    expect(link.closest('a')).toHaveAttribute('href', '/');
  });

  it('has link to dashboard', () => {
    renderWithProviders(<NotFound />);
    const link = screen.getByText('Dashboard');
    expect(link.closest('a')).toHaveAttribute('href', '/dashboard');
  });
});
