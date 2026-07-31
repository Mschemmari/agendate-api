import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getMe, getToken, login, setToken } from '../api';

export default function ProLoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      setChecking(false);
      return undefined;
    }
    getMe()
      .then(() => navigate('/pro', { replace: true }))
      .catch(() => {
        setToken(null);
        setChecking(false);
      });
    return undefined;
  }, [navigate]);

  async function onSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const data = await login(email.trim(), password);
      setToken(data.token);
      navigate('/pro', { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (checking) {
    return (
      <main className="shell">
        <p className="muted">Cargando…</p>
      </main>
    );
  }

  return (
    <main className="shell">
      <div className="card pro-card">
        <p className="brand">Agendate</p>
        <h1>Panel profesional</h1>
        <p className="muted">
          Entrá para ver tu lista de espera y el link de reservas.
        </p>

        <form className="form" onSubmit={onSubmit}>
          <label>
            Email
            <input
              required
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
          <label>
            Contraseña
            <input
              required
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
          {error && <p className="error">{error}</p>}
          <button className="btn" type="submit" disabled={loading}>
            {loading ? 'Entrando…' : 'Entrar'}
          </button>
        </form>

        <p className="muted pro-foot">
          ¿Sos paciente? Pedile el link <code>/u/…</code> a tu profesional.{' '}
          <Link className="ghost" to="/">
            Volver
          </Link>
        </p>
      </div>
    </main>
  );
}
