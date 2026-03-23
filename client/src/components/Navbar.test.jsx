import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '../tests/renderWith';
import Navbar from './Navbar';

// Mock react-i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key) => {
      const translations = {
        'nav.map': 'Map',
        'nav.dashboard': 'Dashboard',
        'nav.history': 'History',
        'nav.login': 'Login',
        'nav.signup': 'Sign Up',
        'nav.logout': 'Logout',
        'nav.profile': 'Profile',
        'nav.theme': 'Theme',
      };
      return translations[key] || key;
    },
    i18n: {
      language: 'en',
      changeLanguage: vi.fn(),
    },
  }),
}));

// Mock NotificationBell to isolate Navbar tests
vi.mock('./NotificationBell', () => ({
  default: () => <div data-testid="notification-bell">NotificationBell</div>,
}));

describe('Navbar', () => {
  it('shows login and signup links when unauthenticated', () => {
    renderWithProviders(<Navbar />, {
      preloadedState: {
        auth: { user: null, loading: false, error: null },
      },
    });

    // Both desktop and mobile nav render, so use getAllByText
    expect(screen.getAllByText('Login').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Sign Up').length).toBeGreaterThanOrEqual(1);
    expect(screen.queryByText('Dashboard')).not.toBeInTheDocument();
  });

  it('shows dashboard, history, and profile when authenticated', () => {
    renderWithProviders(<Navbar />, {
      preloadedState: {
        auth: {
          user: { _id: '1', name: 'Test User', email: 'test@test.com', role: 'user' },
          loading: false,
          error: null,
        },
      },
    });

    // Both desktop and mobile nav render
    expect(screen.getAllByText('Dashboard').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('History').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Test User')).toBeInTheDocument();
    expect(screen.getByText('Logout')).toBeInTheDocument();
    expect(screen.queryByText('Login')).not.toBeInTheDocument();
  });

  it('shows notification bell when authenticated', () => {
    renderWithProviders(<Navbar />, {
      preloadedState: {
        auth: {
          user: { _id: '1', name: 'Test User', email: 'test@test.com', role: 'user' },
          loading: false,
          error: null,
        },
      },
    });

    expect(screen.getByTestId('notification-bell')).toBeInTheDocument();
  });

  it('renders the ICUBeds logo', () => {
    renderWithProviders(<Navbar />, {
      preloadedState: {
        auth: { user: null, loading: false, error: null },
      },
    });

    expect(screen.getByText('ICU')).toBeInTheDocument();
    expect(screen.getByText('Beds')).toBeInTheDocument();
  });

  it('shows Map link for all users', () => {
    renderWithProviders(<Navbar />, {
      preloadedState: {
        auth: { user: null, loading: false, error: null },
      },
    });

    // Map link should appear in both desktop and mobile nav
    const mapLinks = screen.getAllByText('Map');
    expect(mapLinks.length).toBeGreaterThanOrEqual(1);
  });
});
