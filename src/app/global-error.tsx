'use client';

// Catches errors in the root layout itself. Must render its own <html>/<body>.
export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <html lang="en">
      <body
        style={{
          background: '#100e0c',
          color: '#f1ece1',
          minHeight: '100dvh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'Georgia, serif',
          textAlign: 'center',
          padding: '0 1.5rem',
        }}
      >
        <h1 style={{ fontSize: '1.5rem', fontWeight: 300 }}>The museum is briefly closed</h1>
        <p style={{ color: '#aaa093', fontSize: '0.9rem', marginTop: '0.5rem' }}>
          An unexpected error occurred.
        </p>
        <button
          onClick={reset}
          style={{
            marginTop: '1.75rem',
            borderRadius: '999px',
            padding: '0.6rem 1.25rem',
            fontSize: '0.875rem',
            color: '#f1ece1',
            background: 'transparent',
            border: '1px solid rgba(241,236,225,0.2)',
            cursor: 'pointer',
          }}
        >
          Reload
        </button>
      </body>
    </html>
  );
}
