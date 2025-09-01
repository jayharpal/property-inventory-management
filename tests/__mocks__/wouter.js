// Mock for wouter
module.exports = {
  useLocation: jest.fn().mockReturnValue(['/current/path', jest.fn()]),
  useParams: jest.fn().mockReturnValue({}),
  useRoute: jest.fn().mockReturnValue([false, {}]),
  Link: ({ children }) => children,
  Route: ({ children }) => children,
  Switch: ({ children }) => children,
  Redirect: jest.fn(),
  LocationProvider: ({ children }) => children,
  default: { useLocation: jest.fn() }
};