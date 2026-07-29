import { Routes, Route, Link } from 'react-router-dom';
import BookingPage from './pages/BookingPage.jsx';

export default function App() {
  return (
    <Routes>
      <Route path="/u/:slug" element={<BookingPage />} />
      <Route
        path="*"
        element={
          <main className="shell">
            <div className="card home">
              <p className="brand">Agendate</p>
              <h1>Reservá tu turno online</h1>
              <p className="muted">
                Pedile a tu profesional el link de reservas, o abrí una URL como{' '}
                <code>/u/tu-profesional</code>.
              </p>
              <Link className="ghost" to="/u/demo">
                Probar /u/demo
              </Link>
            </div>
          </main>
        }
      />
    </Routes>
  );
}
