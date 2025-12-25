import { render, screen } from '@testing-library/react';
import App from './App';

test('shows OTP verification heading', () => {
  render(<App />);
  const heading = screen.getByRole('heading', { name: /verify with otp/i });
  expect(heading).toBeInTheDocument();
});
