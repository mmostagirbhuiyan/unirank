import { render, screen } from '@testing-library/react';
import App from './App';

test('renders loading state with brand name', () => {
  render(<App />);
  const brand = screen.getByText(/Rank/i);
  expect(brand).toBeInTheDocument();
});
