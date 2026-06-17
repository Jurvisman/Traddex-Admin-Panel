import { API_ORIGIN } from '../config/runtime';

const API_BASE = API_ORIGIN;

const parseErrorMessage = async (response, fallback) => {
  try {
    const text = await response.text();
    if (!text) return fallback;
    try {
      const data = JSON.parse(text);
      if (data?.message) return data.message;
    } catch (error) {
      // Ignore JSON parse errors and return raw text.
    }
    return text;
  } catch (error) {
    return fallback;
  }
};

export const sendOtp = async (digits) => {
  const response = await fetch(`${API_BASE}/api/users/send-otp`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'ngrok-skip-browser-warning': 'true',
    },
    body: JSON.stringify({ mobileNumber: digits }),
  });

  if (!response.ok) {
    throw new Error(await parseErrorMessage(response, `Failed to send OTP. Status ${response.status}`));
  }

  return true;
};

export const verifyOtp = async (digits, otpCode) => {
  const response = await fetch(`${API_BASE}/api/users/verify-otp`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'ngrok-skip-browser-warning': 'true',
    },
    body: JSON.stringify({ mobileNumber: digits, otpCode }),
  });

  if (!response.ok) {
    throw new Error(await parseErrorMessage(response, `Failed to verify OTP. Status ${response.status}`));
  }

  return response.json();
};
