import React, { useState } from 'react';
import { useApp } from '../../contexts/AppContext';
import { useNavigate } from 'react-router-dom';

interface DemoUser {
  email: string;
  role: string;
  emoji: string;
  gradient: string;
}

const DEMO_USERS: DemoUser[] = [
  { email: 'admin@sts.com', role: 'Admin', emoji: '👨‍💼', gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' },
  { email: 'broker@sts.com', role: 'Broker', emoji: '💼', gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' },
  { email: 'owner@sts.com', role: 'Owner', emoji: '👑', gradient: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)' },
  { email: 'seller@sts.com', role: 'Seller', emoji: '📦', gradient: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)' },
  { email: 'buyer@sts.com', role: 'Buyer', emoji: '🛒', gradient: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)' },
  { email: 'charterer@sts.com', role: 'Charterer', emoji: '⛵', gradient: 'linear-gradient(135deg, #30cfd0 0%, #330867 100%)' },
  { email: 'viewer@sts.com', role: 'Viewer', emoji: '👁️', gradient: 'linear-gradient(135deg, #ffa502 0%, #ff6348 100%)' },
];

const LoginPage: React.FC = () => {
  const { login } = useApp();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingEmail, setLoadingEmail] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const handleDemoLogin = async (demoEmail: string) => {
    setLoadingEmail(demoEmail);
    setError('');
    
    try {
      const userData = await login(demoEmail, 'password123');
      // Redirect to dashboard - role-based routing handled by DashboardContainer
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError('Login failed. Please try again.');
      setLoadingEmail(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const userData = await login(email, password);
      // Redirect to dashboard - role-based routing handled by DashboardContainer
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError('Invalid email or password');
      setLoading(false);
    }
  };

  // Inline styles - exactas como el HTML
  const inlineStyles = `
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      padding: 20px;
    }
    
    .login-page-container {
      max-width: 1200px;
      margin: 0 auto;
      background: rgba(255, 255, 255, 0.95);
      border-radius: 20px;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
      overflow: hidden;
    }
    
    .login-header {
      background: linear-gradient(135deg, #2c3e50 0%, #3498db 100%);
      color: white;
      padding: 40px 30px;
      text-align: center;
      border-radius: 15px 15px 0 0;
      margin-bottom: 0;
    }
    
    .logo {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 12px;
      font-size: 32px;
      font-weight: bold;
      margin-bottom: 12px;
      letter-spacing: 0.5px;
    }
    
    .subtitle {
      opacity: 0.92;
      font-size: 15px;
      letter-spacing: 0.3px;
      font-weight: 500;
    }
    

    
    .card {
      background: white;
      border-radius: 0 0 15px 15px;
      padding: 40px 35px;
      box-shadow: 0 8px 20px rgba(0, 0, 0, 0.15);
      margin: 0;
      width: 100%;
    }
    
    .card-title {
      font-size: 24px;
      font-weight: 700;
      margin-bottom: 30px;
      color: #2c3e50;
      text-align: center;
      letter-spacing: 0.5px;
    }
    
    .error-box {
      background: #fee;
      border: 2px solid #e74c3c;
      border-radius: 8px;
      padding: 15px;
      margin-bottom: 20px;
      color: #c0392b;
      display: none;
    }
    
    .error-box.show {
      display: block;
    }
    
    .users-grid {
      display: grid;
      grid-template-columns: repeat(7, minmax(100px, 140px));
      gap: 16px;
      margin-bottom: 35px;
      justify-content: center;
      width: 100%;
    }

    @media (max-width: 1024px) {
      .users-grid {
        grid-template-columns: repeat(5, minmax(100px, 140px));
      }
    }

    @media (max-width: 768px) {
      .users-grid {
        grid-template-columns: repeat(4, minmax(100px, 130px));
      }
    }

    @media (max-width: 480px) {
      .users-grid {
        grid-template-columns: repeat(3, minmax(90px, 120px));
      }
    }
    
    .user-button {
      padding: 14px;
      border: none;
      border-radius: 14px;
      background: transparent;
      cursor: pointer;
      transition: all 0.3s ease;
      text-align: center;
      font-family: inherit;
      width: 100%;
      min-width: 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
    }
    
    .user-button:hover:not(:disabled) {
      transform: translateY(-3px);
      box-shadow: 0 4px 12px rgba(52, 152, 219, 0.2);
    }
    
    .user-button:disabled {
      opacity: 0.65;
      cursor: wait;
    }
    
    .user-avatar {
      width: 60px;
      height: 60px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 28px;
      font-weight: bold;
      margin-bottom: 12px;
      color: white;
      box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
    }
    
    .user-info {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 2px;
    }
    
    .user-role {
      font-weight: 700;
      color: #2c3e50;
      font-size: 13px;
    }
    
    .user-email {
      font-size: 11px;
      color: #7f8c8d;
    }
    
    .loading-text {
      margin-top: 8px;
      font-size: 12px;
      color: #3498db;
      display: none;
    }
    
    .loading-text.show {
      display: block;
    }
    
    .divider {
      display: flex;
      align-items: center;
      margin: 38px auto;
      gap: 18px;
      max-width: 900px;
    }
    
    .divider-line {
      flex: 1;
      height: 1.5px;
      background: linear-gradient(90deg, transparent, #ddd, transparent);
    }
    
    .divider-text {
      color: #95a5a6;
      font-size: 13px;
      font-weight: 600;
      letter-spacing: 0.5px;
      white-space: nowrap;
    }
    
    form {
      max-width: 900px;
      margin-left: auto;
      margin-right: auto;
    }

    .form-group {
      margin-bottom: 24px;
    }
    
    .form-label {
      display: block;
      margin-bottom: 10px;
      color: #2c3e50;
      font-weight: 600;
      font-size: 14px;
      letter-spacing: 0.3px;
    }
    
    .input-wrapper {
      position: relative;
    }
    
    .input-icon {
      position: absolute;
      left: 16px;
      top: 50%;
      transform: translateY(-50%);
      color: #7f8c8d;
      pointer-events: none;
      font-size: 18px;
    }
    
    .form-input {
      width: 100%;
      padding: 13px 16px 13px 48px;
      border: 2px solid #e8e8e8;
      border-radius: 10px;
      font-size: 15px;
      transition: all 0.3s;
      background: #f8f9fa;
      font-family: inherit;
    }
    
    .form-input:focus {
      border-color: #3498db;
      background: white;
      outline: none;
      box-shadow: 0 0 0 3px rgba(52, 152, 219, 0.1);
    }
    
    .form-input:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
    
    .password-toggle {
      position: absolute;
      right: 16px;
      top: 50%;
      transform: translateY(-50%);
      background: none;
      border: none;
      cursor: pointer;
      color: #7f8c8d;
      padding: 6px;
      font-size: 18px;
      transition: color 0.2s;
    }

    .password-toggle:hover {
      color: #3498db;
    }
    
    .submit-button {
      width: 100%;
      padding: 15px 20px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border: none;
      border-radius: 10px;
      font-size: 15px;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.3s ease;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      font-family: inherit;
      letter-spacing: 0.3px;
    }
    
    .submit-button:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: 0 8px 20px rgba(102, 126, 234, 0.35);
    }
    
    .submit-button:disabled {
      opacity: 0.7;
      cursor: wait;
    }
    
    .footer-info {
      margin-top: 30px;
      padding-top: 25px;
      border-top: 1.5px solid #f0f0f0;
      text-align: center;
      max-width: 900px;
      margin-left: auto;
      margin-right: auto;
    }
    
    .footer-text {
      color: #7f8c8d;
      font-size: 13px;
      font-weight: 500;
      margin: 0;
    }
    
    .footer-text-secondary {
      color: #95a5a6;
      font-size: 12px;
      margin-top: 6px;
      margin-bottom: 0;
    }
    
    .footer-copyright {
      background: linear-gradient(135deg, #2c3e50 0%, #3498db 100%);
      padding: 18px 20px;
      text-align: center;
      color: white;
      font-size: 12px;
      margin-top: 20px;
      border-radius: 0 0 15px 15px;
      letter-spacing: 0.3px;
    }
    
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
    
    .spinner {
      display: inline-block;
      width: 16px;
      height: 16px;
      border: 2px solid rgba(255,255,255,0.3);
      border-top-color: white;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }
  `;

  return (
    <>
      <style>{inlineStyles}</style>
      <div style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', minHeight: '100vh', padding: '20px' }}>
        <div className="login-page-container">
          <header className="login-header">
            <div className="logo">🚢 STS Clearance Hub</div>
            <p className="subtitle">Maritime Document Management System</p>
          </header>

          <div className="card">
            <div className="card-title">Select Your Role</div>

            <div className={`error-box ${error ? 'show' : ''}`}>
              <strong>⚠️ Error:</strong> <span>{error}</span>
            </div>

            <div className="users-grid">
              {DEMO_USERS.map((user) => (
                <button
                  key={user.email}
                  className="user-button"
                  onClick={() => handleDemoLogin(user.email)}
                  disabled={loading || loadingEmail === user.email}
                  style={{
                    opacity: loadingEmail === user.email ? 0.6 : 1,
                  }}
                >
                  <div className="user-avatar" style={{ background: user.gradient }}>
                    {user.emoji}
                  </div>
                  <div className="user-info">
                    <div className="user-role">{user.role}</div>
                    <div className="user-email">{user.email}</div>
                  </div>
                  <div className={`loading-text ${loadingEmail === user.email ? 'show' : ''}`}>
                    Loading...
                  </div>
                </button>
              ))}
            </div>

            <div className="divider">
              <div className="divider-line"></div>
              <span className="divider-text">OR MANUAL LOGIN</span>
              <div className="divider-line"></div>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">Email Address</label>
                <div className="input-wrapper">
                  <span className="input-icon">📧</span>
                  <input
                    type="email"
                    className="form-input"
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={loading}
                    required
                  />
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: '25px' }}>
                <label className="form-label">Password</label>
                <div className="input-wrapper">
                  <span className="input-icon">🔒</span>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    className="form-input"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                    required
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={loading}
                  >
                    {showPassword ? '🙈' : '👁️'}
                  </button>
                </div>
              </div>

              <button type="submit" className="submit-button" disabled={loading}>
                <span>🔓</span> {loading ? 'Signing in...' : 'LOGIN TO DASHBOARD'}
              </button>
            </form>

            <div className="footer-info">
              <p className="footer-text">
                Demo Password: <span style={{ fontWeight: 'bold', color: '#2c3e50' }}>password123</span>
              </p>
              <p className="footer-text-secondary">
                Select any role above for instant access
              </p>
            </div>
          </div>

          <div className="footer-copyright">
            © 2025 STS Clearance Hub - Powered by Maritime Solutions
          </div>
        </div>
      </div>
    </>
  );
};

export default LoginPage;