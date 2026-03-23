import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ConfirmDialog from './ConfirmDialog';

describe('ConfirmDialog', () => {
  it('renders nothing when not open', () => {
    const { container } = render(
      <ConfirmDialog
        isOpen={false}
        title="Delete?"
        message="Are you sure?"
        onConfirm={() => {}}
        onCancel={() => {}}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders title and message when open', () => {
    render(
      <ConfirmDialog
        isOpen={true}
        title="Delete Hospital?"
        message="This cannot be undone."
        onConfirm={() => {}}
        onCancel={() => {}}
      />
    );

    expect(screen.getByText('Delete Hospital?')).toBeInTheDocument();
    expect(screen.getByText('This cannot be undone.')).toBeInTheDocument();
  });

  it('calls onConfirm when confirm button clicked', () => {
    const onConfirm = vi.fn();
    render(
      <ConfirmDialog
        isOpen={true}
        title="Delete?"
        message="Sure?"
        onConfirm={onConfirm}
        onCancel={() => {}}
      />
    );

    fireEvent.click(screen.getByText('Confirm'));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('calls onCancel when cancel button clicked', () => {
    const onCancel = vi.fn();
    render(
      <ConfirmDialog
        isOpen={true}
        title="Delete?"
        message="Sure?"
        onConfirm={() => {}}
        onCancel={onCancel}
      />
    );

    fireEvent.click(screen.getByText('Cancel'));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('shows custom button text', () => {
    render(
      <ConfirmDialog
        isOpen={true}
        title="Remove?"
        message="msg"
        confirmText="Yes, Remove"
        cancelText="No, Keep"
        onConfirm={() => {}}
        onCancel={() => {}}
      />
    );

    expect(screen.getByText('Yes, Remove')).toBeInTheDocument();
    expect(screen.getByText('No, Keep')).toBeInTheDocument();
  });

  it('shows loading state', () => {
    render(
      <ConfirmDialog
        isOpen={true}
        title="Deleting"
        message="..."
        loading={true}
        onConfirm={() => {}}
        onCancel={() => {}}
      />
    );

    expect(screen.getByText('Processing...')).toBeInTheDocument();
  });
});
