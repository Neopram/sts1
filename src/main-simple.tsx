import React from 'react'
import ReactDOM from 'react-dom/client'

const SimpleApp = () => {
  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1>🚢 STS Clearance Hub</h1>
      <p>✅ Frontend funcionando correctamente</p>
      <p>🎯 Missing & Expiring Documents Cockpit</p>
      <div style={{ marginTop: '20px', padding: '10px', backgroundColor: '#f0f0f0', borderRadius: '5px' }}>
        <h3>Estado del Sistema:</h3>
        <ul>
          <li>✅ React funcionando</li>
          <li>✅ Vite funcionando</li>
          <li>✅ TypeScript funcionando</li>
          <li>✅ Docker funcionando</li>
        </ul>
      </div>
    </div>
  )
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <SimpleApp />
  </React.StrictMode>,
)
