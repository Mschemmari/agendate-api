import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { bookSlot, getPublicProfile, getSlots } from '../api';

const WEEKDAYS = ['Do', 'Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá'];

function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function sameDay(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function addMonths(date, n) {
  return new Date(date.getFullYear(), date.getMonth() + n, 1);
}

function buildMonthCells(monthDate) {
  const first = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
  const start = new Date(first);
  start.setDate(first.getDate() - first.getDay());
  const cells = [];
  for (let i = 0; i < 42; i += 1) {
    const day = new Date(start);
    day.setDate(start.getDate() + i);
    cells.push(startOfDay(day));
  }
  // Trim trailing week if entirely next month
  const lastInMonth = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0);
  while (cells.length > 35) {
    const tail = cells.slice(-7);
    if (tail.every((d) => d > lastInMonth)) cells.splice(-7);
    else break;
  }
  return cells;
}

function formatMonthTitle(date) {
  const label = date.toLocaleDateString('es-AR', {
    month: 'long',
    year: 'numeric',
  });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function formatSelectedDay(date) {
  return date.toLocaleDateString('es-AR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
}

function formatTime(iso) {
  return new Date(iso).toLocaleTimeString('es-AR', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function dayKey(date) {
  return startOfDay(date).toDateString();
}

export default function BookingPage() {
  const { slug } = useParams();
  const today = useMemo(() => startOfDay(new Date()), []);
  const [profile, setProfile] = useState(null);
  const [monthAnchor, setMonthAnchor] = useState(
    () => new Date(today.getFullYear(), today.getMonth(), 1)
  );
  const [slots, setSlots] = useState([]);
  const [selectedDay, setSelectedDay] = useState(today);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState({ name: '', email: '', phone: '' });
  const [loading, setLoading] = useState(true);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(null);

  const monthCells = useMemo(() => buildMonthCells(monthAnchor), [monthAnchor]);

  const slotsByDay = useMemo(() => {
    const map = new Map();
    for (const slot of slots) {
      const key = dayKey(new Date(slot.startsAt));
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(slot);
    }
    return map;
  }, [slots]);

  const daySlots = useMemo(
    () => slotsByDay.get(dayKey(selectedDay)) || [],
    [slotsByDay, selectedDay]
  );

  useEffect(() => {
    let cancelled = false;
    getPublicProfile(slug)
      .then((p) => {
        if (!cancelled) setProfile(p);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  useEffect(() => {
    let cancelled = false;
    async function loadSlots() {
      setSlotsLoading(true);
      setError('');
      try {
        const from = new Date(monthAnchor.getFullYear(), monthAnchor.getMonth(), 1);
        if (from < today) from.setTime(today.getTime());
        const to = new Date(
          monthAnchor.getFullYear(),
          monthAnchor.getMonth() + 1,
          0,
          23,
          59,
          59,
          999
        );
        const data = await getSlots(slug, from.toISOString(), to.toISOString());
        if (cancelled) return;
        const nextSlots = data.slots || [];
        setSlots(nextSlots);

        const hasSelected =
          selectedDay.getMonth() === monthAnchor.getMonth() &&
          selectedDay.getFullYear() === monthAnchor.getFullYear() &&
          nextSlots.some((s) => sameDay(new Date(s.startsAt), selectedDay));

        if (!hasSelected) {
          const firstAvailable = nextSlots.find(
            (s) => startOfDay(new Date(s.startsAt)) >= today
          );
          if (firstAvailable) {
            setSelectedDay(startOfDay(new Date(firstAvailable.startsAt)));
          } else {
            const fallback = new Date(
              monthAnchor.getFullYear(),
              monthAnchor.getMonth(),
              Math.max(1, today.getMonth() === monthAnchor.getMonth() ? today.getDate() : 1)
            );
            setSelectedDay(startOfDay(fallback));
          }
          setSelected(null);
        }
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setSlotsLoading(false);
      }
    }
    loadSlots();
    return () => {
      cancelled = true;
    };
  }, [slug, monthAnchor, today]);

  function selectDay(day) {
    if (day < today) return;
    if (day.getMonth() !== monthAnchor.getMonth()) return;
    setSelectedDay(day);
    setSelected(null);
  }

  function shiftMonth(delta) {
    const next = addMonths(monthAnchor, delta);
    const currentMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    if (next < currentMonthStart) return;
    setMonthAnchor(next);
    setSelected(null);
  }

  async function onSubmit(e) {
    e.preventDefault();
    if (!selected) return;
    setSubmitting(true);
    setError('');
    try {
      const result = await bookSlot(slug, {
        startsAt: selected.startsAt,
        name: form.name,
        email: form.email,
        phone: form.phone,
      });
      setSuccess(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <main className="shell">
        <p className="muted">Cargando agenda…</p>
      </main>
    );
  }

  if (success) {
    return (
      <main className="shell">
        <div className="card success">
          <p className="brand">Agendate</p>
          <h1>¡Turno confirmado!</h1>
          <p>
            Con <strong>{success.professionalName}</strong>
          </p>
          <p className="when">
            {formatSelectedDay(new Date(success.startsAt))} ·{' '}
            {formatTime(success.startsAt)}
          </p>
          <p className="muted">
            Te enviamos un email con los detalles (o lo verás en la consola del
            servidor si no hay Resend configurado).
          </p>
          <a
            className="btn"
            href={success.googleCalendarUrl}
            target="_blank"
            rel="noreferrer"
          >
            Agregar a Google Calendar
          </a>
        </div>
      </main>
    );
  }

  const canGoPrev =
    addMonths(monthAnchor, -1) >=
    new Date(today.getFullYear(), today.getMonth(), 1);

  return (
    <main className="shell">
      <div className="card booking">
        <p className="brand">Agendate</p>
        <h1>{profile?.name || 'Profesional'}</h1>
        <p className="muted">
          {profile?.service?.name || 'Consulta'} ·{' '}
          {profile?.service?.durationMinutes || 45} min
        </p>

        {error && <p className="error">{error}</p>}

        <div className="picker-split">
          <section className="picker-cal">
            <h2>Día</h2>
            <div className="month-nav">
              <button
                type="button"
                className="nav-btn"
                onClick={() => shiftMonth(-1)}
                disabled={!canGoPrev}
                aria-label="Mes anterior"
              >
                ‹
              </button>
              <p className="month-title">{formatMonthTitle(monthAnchor)}</p>
              <button
                type="button"
                className="nav-btn"
                onClick={() => shiftMonth(1)}
                aria-label="Mes siguiente"
              >
                ›
              </button>
            </div>

            <div className="cal-weekdays">
              {WEEKDAYS.map((label) => (
                <span key={label}>{label}</span>
              ))}
            </div>

            <div className="cal-grid">
              {monthCells.map((day) => {
                const inMonth = day.getMonth() === monthAnchor.getMonth();
                const past = day < today;
                const available = (slotsByDay.get(dayKey(day)) || []).length > 0;
                const isSelected = sameDay(day, selectedDay);
                const isToday = sameDay(day, today);
                const disabled = !inMonth || past;

                return (
                  <button
                    key={day.toISOString()}
                    type="button"
                    disabled={disabled}
                    className={[
                      'cal-day',
                      !inMonth && 'muted-day',
                      past && 'past-day',
                      isSelected && 'selected-day',
                      isToday && !isSelected && 'today-day',
                      available && !past && inMonth && 'has-slots',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                    onClick={() => selectDay(day)}
                  >
                    <span>{day.getDate()}</span>
                    {available && !past && inMonth && <i className="dot" />}
                  </button>
                );
              })}
            </div>
          </section>

          <section className="picker-slots">
            <h2>Horarios</h2>
            <p className="day-label">{formatSelectedDay(selectedDay)}</p>
            {slotsLoading ? (
              <p className="muted">Cargando…</p>
            ) : daySlots.length === 0 ? (
              <p className="muted">Sin turnos este día.</p>
            ) : (
              <div className="slots">
                {daySlots.map((slot) => (
                  <button
                    key={slot.startsAt}
                    type="button"
                    className={
                      selected?.startsAt === slot.startsAt
                        ? 'slot active'
                        : 'slot'
                    }
                    onClick={() => setSelected(slot)}
                  >
                    {formatTime(slot.startsAt)}
                  </button>
                ))}
              </div>
            )}
          </section>
        </div>

        {selected && (
          <form className="form" onSubmit={onSubmit}>
            <h2>Tus datos</h2>
            <label>
              Nombre
              <input
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </label>
            <label>
              Email
              <input
                required
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </label>
            <label>
              Teléfono
              <input
                required
                type="tel"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </label>
            <button className="btn" type="submit" disabled={submitting}>
              {submitting
                ? 'Reservando…'
                : `Confirmar ${formatTime(selected.startsAt)}`}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
