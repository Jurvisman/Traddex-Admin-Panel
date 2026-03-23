import { useEffect, useState } from 'react';

function Banner({ message }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (message?.text) {
      setVisible(true);
      const duration = message?.type === 'error' ? 12000 : 8000;
      const timer = setTimeout(() => {
        setVisible(false);
      }, duration);
      return () => clearTimeout(timer);
    }
    setVisible(false);
    return undefined;
  }, [message?.text, message?.type]);

  if (!message?.text || !visible) return null;

  return (
    <div className={`banner banner-toast ${message.type || 'info'}`}>
      <span className="banner-text">{message.text}</span>
      <button
        type="button"
        className="banner-dismiss"
        onClick={() => setVisible(false)}
        aria-label="Dismiss"
      >
        &#x2715;
      </button>
    </div>
  );
}

export default Banner;
