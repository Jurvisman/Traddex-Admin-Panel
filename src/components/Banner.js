import { useEffect, useState } from 'react';

function Banner({ message }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (message?.text) {
      setVisible(true);
      const timer = setTimeout(() => {
        setVisible(false);
      }, 8000); // auto-hide after 8s
      return () => clearTimeout(timer);
    }
    setVisible(false);
    return undefined;
  }, [message?.text, message?.type]);

  if (!message?.text || !visible) return null;

  return <div className={`banner banner-toast ${message.type || 'info'}`}>{message.text}</div>;
}

export default Banner;
