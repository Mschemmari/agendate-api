import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  cancelWaitlistEntry,
  getBookingLink,
  getMe,
  getToken,
  getWaitlist,
  setToken,
} from '../api';

function formatPreferred(date) {
  if (!date) return 'Cualquier día';
  return new Date(date).toLocaleDateString('es-AR', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}

function whatsappUrl(phone, text) {
  const digits = String(phone || '').replace(/\D/g, '');
  if (!digits) return null;
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}

export default function ProDashboardPage() {
  const navigate = useNavigate();
  const [me, setMe] = useState(null);
  const [link, setLink] = useState('');
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    setError('');
    try {
      const profile = await getMe();
      setMe(profile);
      try {
        const [waitlist, booking] = await Promise.all([
          getWaitlist(),
          getBookingLink(),
        ]);
        setEntries(waitlist);
        setLink(booking.url || '');
      } catch (inner) {
        // Waitlist/link pueden fallar si la API aún no tiene el endpoint deployado.
        setEntries([]);
        try {
          const booking = await getBookingLink();
          setLink(booking.url || '');
        } catch {
          setLink('');
        }
        if (!/404|not found/i.test(inner.message)) {
          setError(inner.message);
        }
      }
    } catch (err) {
      if (/token|credencial|autoriz|401/i.test(err.message) || !getToken()) {
        setToken(null);
        navigate('/pro/login', { replace: true });
        return;
      }
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    if (!getToken()) {
      navigate('/pro/login', { replace: true });
      return undefined;
    }
    load();
    return undefined;
  }, [load, navigate]);

  async function copyLink() {
    if (!link) return;
    await navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function remove(entry) {
    if (!window.confirm(`¿Sacar a ${entry.name} de la lista?`)) return;
    try {
      await cancelWaitlistEntry(entry.id);
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  function logout() {
    setToken(null);
    navigate('/pro/login', { replace: true });
  }

  if (loading) {
    return (
      <main className="shell">
        <p className="muted">Cargando panel…</p>
      </main>
    );
  }

  return (
    <main className="shell">
      <div className="card pro-card wide">
        <div className="pro-top">
          <div>
            <p className="brand">Agendate</p>
            <h1>{me?.name || 'Profesional'}</h1>
            <p className="muted">
              Código WhatsApp: <code>{me?.slug}</code>
            </p>
          </div>
          <button type="button" className="ghost-btn" onClick={logout}>
            Salir
          </button>
        </div>

        {error && <p className="error">{error}</p>}

        <section className="pro-section">
          <h2>Tu link de reservas</h2>
          <p className="link-line">{link || '—'}</p>
          <div className="pro-actions">
            <button type="button" className="btn" onClick={copyLink} disabled={!link}>
              {copied ? 'Copiado' : 'Copiar link'}
            </button>
            {link && (
              <a className="ghost" href={link} target="_blank" rel="noreferrer">
                Abrir página pública
              </a>
            )}
          </div>
        </section>

        <section className="pro-section">
          <h2 className="section-quiet">Lista de espera</h2>
          <p className="muted small">
            Si alguien cancela, avisamos automáticamente al primero.
          </p>

          {entries.length === 0 ? (
            <p className="empty-state">Nadie en espera por ahora.</p>
          ) : (
            <ul className="waitlist-list">
              {entries.map((entry) => {
                const wa = whatsappUrl(
                  entry.phone,
                  entry.status === 'offered'
                    ? `Hola ${entry.name}! Se liberó un lugar. ¿Seguís interesado/a?`
                    : `Hola ${entry.name}! Te escribo por tu lugar en la lista de espera.`
                );
                return (
                  <li key={entry.id} className="waitlist-item">
                    <div>
                      <p className="waitlist-name">
                        #{entry.position} {entry.name}
                        {entry.status === 'offered' && (
                          <span className="pill">Avisar</span>
                        )}
                      </p>
                      <p className="muted small">
                        {entry.email} · {entry.phone || 'Sin teléfono'}
                      </p>
                      <p className="muted small">
                        Prefiere: {formatPreferred(entry.preferredDate)}
                      </p>
                    </div>
                    <div className="waitlist-actions">
                      {wa && (
                        <a
                          className="ghost"
                          href={wa}
                          target="_blank"
                          rel="noreferrer"
                        >
                          WhatsApp
                        </a>
                      )}
                      <button
                        type="button"
                        className="danger-link"
                        onClick={() => remove(entry)}
                      >
                        Quitar
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <p className="muted pro-foot">
          <Link className="ghost" to="/">
            Inicio
          </Link>
        </p>
      </div>
    </main>
  );
}
