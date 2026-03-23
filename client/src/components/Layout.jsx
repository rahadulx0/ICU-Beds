import { createContext } from 'react';
import Navbar from './Navbar';
import useDarkMode from '../hooks/useDarkMode';

export const DarkModeContext = createContext();

export default function Layout({ children }) {
  const [dark, setDark] = useDarkMode();

  return (
    <DarkModeContext.Provider value={{ dark, setDark }}>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:z-[100] focus:rounded-lg focus:bg-white focus:p-4 focus:text-primary-600 focus:shadow-lg dark:focus:bg-gray-800 dark:focus:text-primary-400"
        >
          Skip to main content
        </a>
        <Navbar />
        <main id="main-content" className="pb-14 md:pb-0">
          {children}
        </main>
      </div>
    </DarkModeContext.Provider>
  );
}
