import { Link } from 'react-router-dom';

export default function PrivacyPage() {
  return (
    <main className="shell">
      <div className="card home" style={{ maxWidth: 640, textAlign: 'left' }}>
        <p className="brand">Agendate</p>
        <h1>Política de privacidad</h1>
        <p className="muted">Última actualización: 4 de agosto de 2026</p>

        <p>
          Agendate es un servicio de turnos online. Esta política describe qué
          datos tratamos cuando usás la web, el panel profesional o el bot de
          WhatsApp.
        </p>

        <h2>Datos que recopilamos</h2>
        <ul>
          <li>Nombre, email y teléfono al reservar un turno.</li>
          <li>Mensajes que enviás al bot de WhatsApp para agendar.</li>
          <li>Datos de cuenta del profesional (email, nombre, disponibilidad).</li>
        </ul>

        <h2>Para qué los usamos</h2>
        <ul>
          <li>Gestionar turnos, lista de espera y avisos.</li>
          <li>Responder por WhatsApp cuando pedís un turno.</li>
          <li>Operar y mejorar el servicio.</li>
        </ul>

        <h2>Con quién los compartimos</h2>
        <p>
          Usamos proveedores de infraestructura (hosting, base de datos) y la
          API de WhatsApp de Meta para enviar y recibir mensajes. No vendemos
          tus datos.
        </p>

        <h2>Contacto</h2>
        <p>
          Consultas sobre privacidad:{' '}
          <a href="mailto:marianosche@gmail.com">marianosche@gmail.com</a>.
        </p>

        <p style={{ marginTop: '1.5rem' }}>
          <Link className="ghost" to="/">
            Volver
          </Link>
        </p>
      </div>
    </main>
  );
}
