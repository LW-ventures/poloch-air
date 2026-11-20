import { useStore, api, MODE } from './data/store.js';
import { useRoute, go } from './lib/router.js';
import { driverTasks, milesFor } from './lib/domain.js';
import { Toasts, TierBadge } from './components/ui.jsx';
import Login from './pages/Login.jsx';
import Home from './pages/Home.jsx';
import FlightPage from './pages/FlightPage.jsx';
import NewFlight from './pages/NewFlight.jsx';
import Account from './pages/Account.jsx';
import Tasks from './pages/Tasks.jsx';
import Miles from './pages/Miles.jsx';
import Profile from './pages/Profile.jsx';
import Admin from './pages/Admin.jsx';
import Briefing, { needsBriefing } from './components/Briefing.jsx';
import Splash from './components/Splash.jsx';
import { AppIcon } from './components/Polo.jsx';
import { useEffect, useState } from 'react';

export default function App() {
  const { state, user, now, ready, notMember } = useStore();
  const route = useRoute();
  const [briefing, setBriefing] = useState(false);
  // Startanimation einmal pro App-Start; Admin-Vorschau per Event
  const [splash, setSplash] = useState(() => ({ mode: state.settings?.splash || 'scheibe', n: 0 }));
  useEffect(() => {
    const on = (e) => setSplash((s) => ({ mode: e.detail, n: (s?.n || 0) + 1 }));
    window.addEventListener('polochair:splash', on);
    return () => window.removeEventListener('polochair:splash', on);
  }, []);
  const splashEl = splash && splash.mode !== 'none' && (
    <Splash key={splash.n} mode={splash.mode} onDone={() => setSplash(null)} />
  );

  useEffect(() => {
    if (user && needsBriefing(user.id)) setBriefing(true);
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const on = () => setBriefing(true);
    window.addEventListener('polochair:briefing', on);
    return () => window.removeEventListener('polochair:briefing', on);
  }, []);

  if (!ready) return (
    <>
      <div className="boot" aria-busy="true">
        <AppIcon size={72} />
      </div>
      {splashEl}
    </>
  );

  if (!user) return (
    <>
      <Login state={state} notMember={notMember} />
      {splashEl}
      <Toasts />
    </>
  );

  const ctx = { state, user, now };
  const [p0, p1] = route.parts;
  let page;
  switch (p0) {
    case 'flight':
      page = <FlightPage {...ctx} flightId={p1} />;
      break;
    case 'neu':
      page = <NewFlight {...ctx} />;
      break;
    case 'konto':
      page = <Account {...ctx} />;
      break;
    case 'aufgaben':
      page = <Tasks {...ctx} />;
      break;
    case 'miles':
      page = <Miles {...ctx} />;
      break;
    case 'profil':
      page = <Profile {...ctx} />;
      break;
    case 'admin':
      page = user.isAdmin ? <Admin {...ctx} /> : <Home {...ctx} />;
      break;
    default:
      page = <Home {...ctx} />;
  }

  const tasks = driverTasks(state, user.id, now);
  const miles = milesFor(state, user.id);

  return (
    <div className="app">
      <header className="topbar">
        <button className="brand" onClick={() => go('/')} aria-label="Zur Startseite">
          <AppIcon size={36} className="brand-icon" />
          <span className="brand-name">
            Poloch <b>Air</b>
          </span>
        </button>
        <div className="topbar-right">
          {MODE === 'test' && (
            <button className="test-chip" onClick={() => api.logout()} title="Testmodus: Person wechseln">
              Test ⇄
            </button>
          )}
          <button className="me-chip" onClick={() => go('/profil')}>
            {user.name}
            <TierBadge count={miles.total} small />
          </button>
        </div>
      </header>

      <main className="main" key={route.path}>
        {page}
      </main>

      <nav className="tabbar" aria-label="Hauptnavigation">
        <Tab to="/" active={!p0 || p0 === 'flight' || p0 === 'neu' || p0 === 'aufgaben'} icon="board" label="Abflüge" badge={tasks.unclear.length} />
        <Tab to="/konto" active={p0 === 'konto'} icon="wallet" label="Konto" badge={tasks.payments.length} />
        <Tab to="/miles" active={p0 === 'miles'} icon="star" label="Miles" />
        <Tab to="/profil" active={p0 === 'profil' || p0 === 'admin'} icon="user" label="Profil" />
      </nav>
      {splashEl}
      {briefing && !splashEl && (
        <Briefing
          user={user}
          isCaptain={state.cars.some((c) => c.ownerId === user.id)}
          captainName={state.users.find((u) => state.cars.some((c) => c.ownerId === u.id))?.name || 'Captain'}
          onDone={() => setBriefing(false)}
        />
      )}
      <Toasts />
    </div>
  );
}

const ICONS = {
  board: <path d="M3 5h18v14H3zM3 10h18M8 5v14" />,
  wallet: <path d="M3 7h16a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM3 7l12-3v3M16 13.5h2" />,
  star: <path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z" />,
  user: <path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0" />,
};

function Tab({ to, active, icon, label, badge }) {
  return (
    <button className={`tab ${active ? 'tab-active' : ''}`} onClick={() => go(to)} aria-current={active ? 'page' : undefined}>
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round" aria-hidden="true">
        {ICONS[icon]}
      </svg>
      <span>{label}</span>
      {badge > 0 && <i className="tab-badge">{badge}</i>}
    </button>
  );
}
