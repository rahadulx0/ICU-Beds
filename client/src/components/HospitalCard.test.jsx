import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import HospitalCard from './HospitalCard';

// Mock the Map component's BedBadge export
vi.mock('./Map', () => ({
  BedBadge: ({ available, total }) => {
    if (available === 0) return <span>No beds</span>;
    if (total > 0 && available / total <= 0.2) return <span>Low</span>;
    return <span>Available</span>;
  },
}));

const baseHospital = {
  _id: '1',
  name: 'Dhaka Medical Hospital',
  address: '123 Hospital Road, Dhaka',
  available_icu_beds: 5,
  total_icu_beds: 20,
  contact: { phone: '+880-1700000000' },
  location: { coordinates: [90.4125, 23.8103] },
};

describe('HospitalCard', () => {
  it('renders hospital name and address', () => {
    render(<HospitalCard hospital={baseHospital} />);

    expect(screen.getByText('Dhaka Medical Hospital')).toBeInTheDocument();
    expect(screen.getByText('123 Hospital Road, Dhaka')).toBeInTheDocument();
  });

  it('renders bed count', () => {
    render(<HospitalCard hospital={baseHospital} />);

    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('Available of 20')).toBeInTheDocument();
  });

  it('renders phone number when available', () => {
    render(<HospitalCard hospital={baseHospital} />);

    expect(screen.getByText('+880-1700000000')).toBeInTheDocument();
  });

  it('does not render phone when not provided', () => {
    const noPhone = { ...baseHospital, contact: {} };
    render(<HospitalCard hospital={noPhone} />);

    expect(screen.queryByText('+880-1700000000')).not.toBeInTheDocument();
  });

  it('shows "Available" badge when beds are plentiful', () => {
    render(<HospitalCard hospital={baseHospital} />);

    expect(screen.getByText('Available')).toBeInTheDocument();
  });

  it('shows "Low" badge when beds are scarce', () => {
    const low = { ...baseHospital, available_icu_beds: 2, total_icu_beds: 20 };
    render(<HospitalCard hospital={low} />);

    expect(screen.getByText('Low')).toBeInTheDocument();
  });

  it('shows "No beds" badge when none available', () => {
    const none = { ...baseHospital, available_icu_beds: 0, total_icu_beds: 20 };
    render(<HospitalCard hospital={none} />);

    expect(screen.getByText('No beds')).toBeInTheDocument();
  });

  it('calls onSelect when "View on Map" is clicked', () => {
    const onSelect = vi.fn();
    render(<HospitalCard hospital={baseHospital} onSelect={onSelect} />);

    fireEvent.click(screen.getByText('View on Map'));
    expect(onSelect).toHaveBeenCalledWith(baseHospital);
  });

  it('renders Request Ambulance button when handler provided', () => {
    const onRequest = vi.fn();
    render(<HospitalCard hospital={baseHospital} onRequestAmbulance={onRequest} />);

    const btn = screen.getByText('Request Ambulance');
    expect(btn).toBeInTheDocument();
    fireEvent.click(btn);
    expect(onRequest).toHaveBeenCalledWith(baseHospital);
  });

  it('does not render Request Ambulance button when handler not provided', () => {
    render(<HospitalCard hospital={baseHospital} />);

    expect(screen.queryByText('Request Ambulance')).not.toBeInTheDocument();
  });

  it('renders compact variant with bed ratio text', () => {
    const onSelect = vi.fn();
    render(<HospitalCard hospital={baseHospital} compact onSelect={onSelect} />);

    expect(screen.getByText('Dhaka Medical Hospital')).toBeInTheDocument();
    expect(screen.getByText('5 / 20 beds')).toBeInTheDocument();
    // No address shown in compact mode
    expect(screen.queryByText('123 Hospital Road, Dhaka')).not.toBeInTheDocument();
  });
});
