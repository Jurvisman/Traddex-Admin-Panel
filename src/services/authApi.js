const API_BASE = process.env.REACT_APP_API_BASE || 'http://localhost:8080';

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
      'x-api-key': 'TradeX-API-Key-2024',
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
      'x-api-key': 'TradeX-API-Key-2024',
    },
    body: JSON.stringify({ mobileNumber: digits, otpCode }),
  });

  if (!response.ok) {
    throw new Error(await parseErrorMessage(response, `Failed to verify OTP. Status ${response.status}`));
  }

  return response.json();
};
