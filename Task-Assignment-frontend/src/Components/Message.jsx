import React from 'react'

function Message({ message }) {
  // Ensure message is an array to avoid crashes
  const messageList = Array.isArray(message) ? message : [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
      {messageList.length === 0 ? (
        <p className="empty-text" style={{ color: 'var(--text-faint)', textAlign: 'center', fontSize: '0.9rem', marginTop: '40px' }}>
          No recent updates yet.
        </p>
      ) : (
        <ul className="message-list">
          {messageList.map((m, index) => (
            <li key={index} className="message-item">
              {m.msg}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default Message;