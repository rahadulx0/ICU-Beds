import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import StatsCard from './StatsCard';
import { Hospital } from 'lucide-react';

describe('StatsCard', () => {
  it('renders title and value', () => {
    render(<StatsCard title="Total Hospitals" value={42} />);

    expect(screen.getByText('Total Hospitals')).toBeInTheDocument();
    expect(screen.getByText('42')).toBeInTheDocument();
  });

  it('renders subtitle when provided', () => {
    render(<StatsCard title="Beds" value={10} subtitle="of 50 total" />);

    expect(screen.getByText('of 50 total')).toBeInTheDocument();
  });

  it('does not render subtitle when not provided', () => {
    render(<StatsCard title="Beds" value={10} />);

    expect(screen.queryByText('of')).not.toBeInTheDocument();
  });

  it('renders icon when provided', () => {
    const { container } = render(
      <StatsCard title="Test" value={1} icon={Hospital} />
    );

    // The icon component should render an SVG
    expect(container.querySelector('svg')).toBeInTheDocument();
  });
});
