import React from 'react';

function ToggleSwitch({ id, checked, onChange, label, disabled }) {
  return (
    <label
      htmlFor={id}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        cursor: disabled ? 'not-allowed' : 'pointer',
        userSelect: 'none',
        marginTop: 4
      }}
    >
      <span style={{
        position: 'relative',
        display: 'inline-block',
        width: 36,
        height: 20,
        flexShrink: 0,
      }}>
        <input
          id={id}
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          disabled={disabled}
          style={{ opacity: 0, width: 0, height: 0, position: 'absolute' }}
        />
        <span style={{
          position: 'absolute',
          inset: 0,
          borderRadius: 20,
          background: checked ? '#6e46ff' : '#d1d5db',
          transition: 'background 0.2s',
        }} />
        <span style={{
          position: 'absolute',
          top: 3,
          left: checked ? 19 : 3,
          width: 14,
          height: 14,
          borderRadius: '50%',
          background: '#fff',
          boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
          transition: 'left 0.2s',
        }} />
      </span>
      {label && <span style={{ fontSize: 13, color: '#374151', fontWeight: 500 }}>{label}</span>}
    </label>
  );
}

export default ToggleSwitch;
