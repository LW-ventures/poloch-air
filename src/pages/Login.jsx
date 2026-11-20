import { useState } from 'react';
import { api, MODE } from '../data/store.js';
import FlapText from '../components/FlapText.jsx';
import { AppIcon } from '../components/Polo.jsx';
import { toastError } from '../components/ui.jsx';

const LAST_NAME = 'polochair:lastName';

function Hero() {
  return (
    <div className="login-hero">
      <AppIcon size={96} className="login-icon" />
      <h1>
        Poloch <b>Air</b>
      </h1>
      <p className="login-claim">Die Low-Cortisol-Fahrgemeinschaft.</p>
    </div>
  );
}

// Testmodus: Person antippen, kein Passwort
function TestLogin({ state }) {
  const len = Math.min(10, Math.max(...state.users.map((x) => x.name.length)));
  return (
    <>
      <p className="login-q">Testmodus: Wer bist du?</p>
      <div className="login-grid">
        {state.users.map((u, i) => (
          <button key={u.id} className="login-user" onClick={() => api.login(u.id)}>
            <FlapText text={u.name} len={len} delay={i * 120} />
            <small>{u.isAdmin ? 'Admin' : state.cars.some((c) => c.ownerId === u.id) ? 'Captain' : 'Passagier'}</small>
          </button>
        ))}
      </div>
    </>
  );
}

// Live: Name + Passwort
function LiveLogin({ notMember }) {
  const [name, setName] = useState(() => {
    try {
      return localStorage.getItem(LAST_NAME) || '';
    } catch {
      return '';
    }
  });
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api.login(name, password);
      try {
        localStorage.setItem(LAST_NAME, name.trim());
      } catch {
        /* egal */
      }
    } catch (err) {
      toastError(err);
      setBusy(false);
    }
  };

  if (notMember) {
    return (
      <div className="login-form">
        <p className="login-q">Dein Konto ist noch nicht freigeschaltet. Sag dem Admin Bescheid.</p>
        <button className="btn btn-block" onClick={() => api.logout()}>Abmelden</button>
      </div>
    );
  }

  return (
    <form className="login-form" onSubmit={submit}>
      <p className="login-q">Bitte zum Check-in.</p>
      <label className="field">
        <span>Name</span>
        <input value={name} onChange={(e) => setName(e.target.value)} autoComplete="username" autoCapitalize="words" placeholder="Vorname" required />
      </label>
      <label className="field">
        <span>Passwort</span>
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required />
      </label>
      <button className="btn btn-primary btn-block btn-big" type="submit" disabled={busy}>
        {busy ? 'Boarding …' : 'Einchecken'}
      </button>
    </form>
  );
}

export default function Login({ state, notMember }) {
  return (
    <div className="login">
      <Hero />
      <div className="board login-board">
        <div className="board-head">
          <span className="board-title">Check-in</span>
          <span className="board-clock">Gate P1</span>
        </div>
        {MODE === 'test' ? <TestLogin state={state} /> : <LiveLogin notMember={notMember} />}
      </div>
      {MODE === 'test' && (
        <p className="login-note">
          Im Testmodus liegen alle Daten nur in diesem Browser. Oben rechts kannst du jederzeit die Person wechseln.
        </p>
      )}
    </div>
  );
}
