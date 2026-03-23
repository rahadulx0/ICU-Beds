import { render } from '@testing-library/react';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { configureStore } from '@reduxjs/toolkit';
import authReducer from '../store/authSlice';
import hospitalReducer from '../store/hospitalSlice';
import ambulanceReducer from '../store/ambulanceSlice';
import notificationReducer from '../store/notificationSlice';
import { DarkModeContext } from '../components/Layout';

export function createTestStore(preloadedState = {}) {
  return configureStore({
    reducer: {
      auth: authReducer,
      hospitals: hospitalReducer,
      ambulance: ambulanceReducer,
      notifications: notificationReducer,
    },
    preloadedState,
  });
}

export function renderWithProviders(
  ui,
  {
    preloadedState = {},
    store = createTestStore(preloadedState),
    route = '/',
    ...renderOptions
  } = {}
) {
  function Wrapper({ children }) {
    return (
      <Provider store={store}>
        <DarkModeContext.Provider value={{ dark: false, setDark: vi.fn() }}>
          <MemoryRouter initialEntries={[route]}>
            {children}
          </MemoryRouter>
        </DarkModeContext.Provider>
      </Provider>
    );
  }

  return { store, ...render(ui, { wrapper: Wrapper, ...renderOptions }) };
}
