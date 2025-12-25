function Banner({ message }) {
  if (!message?.text) return null;
  return <div className={`banner ${message.type || 'info'}`}>{message.text}</div>;
}

export default Banner;
