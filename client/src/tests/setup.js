import '@testing-library/jest-dom';

// Mock socket.io-client
vi.mock('../socket', () => ({
  default: {
    connect: vi.fn(),
    disconnect: vi.fn(),
    on: vi.fn(),
    off: vi.fn(),
    emit: vi.fn(),
  },
}));

// Mock leaflet
vi.mock('leaflet', () => ({
  default: {
    Icon: {
      Default: {
        prototype: { _getIconUrl: '' },
        mergeOptions: vi.fn(),
      },
    },
    divIcon: vi.fn(() => ({})),
    latLngBounds: vi.fn(() => ({ extend: vi.fn() })),
  },
  Icon: {
    Default: {
      prototype: { _getIconUrl: '' },
      mergeOptions: vi.fn(),
    },
  },
  divIcon: vi.fn(() => ({})),
  latLngBounds: vi.fn(() => ({ extend: vi.fn() })),
}));

// Mock react-leaflet
vi.mock('react-leaflet', () => ({
  MapContainer: ({ children }) => children,
  TileLayer: () => null,
  Marker: ({ children }) => children,
  Popup: ({ children }) => children,
  Circle: () => null,
  useMap: () => ({
    flyTo: vi.fn(),
    fitBounds: vi.fn(),
    getContainer: () => ({ style: {} }),
  }),
  useMapEvents: () => null,
}));
