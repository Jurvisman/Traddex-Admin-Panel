import { render, screen } from '@testing-library/react';
import App from './App';

test('shows login form', () => {
  render(<App />);
  const input = screen.getByLabelText(/mobile number/i);
  expect(input).toBeInTheDocument();
});
