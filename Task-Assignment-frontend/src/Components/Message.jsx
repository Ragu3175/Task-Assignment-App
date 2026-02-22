import React from 'react'

function Message({ message }) {
  // Ensure message is an array to avoid crashes
  const messageList = Array.isArray(message) ? message : [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
      {messageList.length === 0 ? (
        <p style={{ color: 'rgba(255,255,255,0.3)', textAlign: 'center', fontSize: '0.9rem' }}>
          No recent updates.
        </p>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {messageList.map((m, index) => (
            <li
              key={index}
              style={{
                padding: '12px',
                borderRadius: '10px',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                marginBottom: '10px',
                fontSize: '0.9rem',
                lineHeight: '1.4'
              }}
            >
              {m.msg}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default Message;