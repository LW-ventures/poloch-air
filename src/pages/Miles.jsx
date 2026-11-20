import { milesFor, monthlyFlights, nextTier, TIERS } from '../lib/domain.js';
import { Section, TierBadge } from '../components/ui.jsx';

export default function Miles({ state, user, now }) {
  const rows = state.users
    .map((u) => ({ user: u, m: milesFor(state, u.id) }))
    .sort((a, b) => b.m.total - a.m.total);
  const { keys, table } = monthlyFlights(state, 4, now);
  const max = Math.max(1, ...state.users.flatMap((u) => keys.map((k) => table.get(u.id)?.[k] || 0)));
  const mine = milesFor(state, user.id);
  const nt = nextTier(mine.total);

  return (
    <div className="page">
      <h1 className="page-title">Poloch Miles</h1>

      <div className={`miles-card tier-bg-${mine.tier?.id || 'none'}`}>
        <div className="miles-top">
          <span className="miles-brand">Poloch Miles</span>
          <TierBadge count={mine.total} />
        </div>
        <div className="miles-name">{user.name}</div>
        <div className="miles-stats">
          <div><b>{mine.flown}</b><span>Flüge als Passagier</span></div>
          <div><b>{mine.piloted}</b><span>als Captain</span></div>
          <div><b>{mine.km.toLocaleString('de-DE')}</b><span>km mitgeflogen</span></div>
        </div>
        {nt ? (
          <div className="miles-progress">
            <div className="miles-bar"><i style={{ width: `${Math.min(100, (mine.total / nt.min) * 100)}%` }} /></div>
            <small>Noch {nt.min - mine.total} Flüge bis {nt.name}</small>
          </div>
        ) : (
          <div className="miles-progress"><small>Höchster Status. Der Poloch kennt deinen Namen.</small></div>
        )}
      </div>

      <Section title="Rangliste">
        <ol className="ranking">
          {rows.map(({ user: u, m }, i) => (
            <li key={u.id} className={u.id === user.id ? 'is-me' : ''}>
              <span className="rank">{i + 1}</span>
              <span className="rank-name">
                {u.name} <TierBadge count={m.total} small />
                <small>{m.flown} als Passagier · {m.piloted} als Captain · {m.km} km</small>
              </span>
              <b className="rank-total">{m.total}</b>
            </li>
          ))}
        </ol>
        <p className="hint">
          Status: {TIERS.slice().reverse().map((t) => `${t.name} ab ${t.min}`).join(' · ')} Flügen. Captain-Flüge zählen mit.
        </p>
      </Section>

      <Section title="Mitflüge pro Monat">
        <div className="months">
          {keys.map((k) => (
            <div key={k} className="month">
              <div className="month-bars">
                {state.users.map((u) => {
                  const v = table.get(u.id)?.[k] || 0;
                  return (
                    <div key={u.id} className="mbar-wrap" title={`${u.name}: ${v}`}>
                      <span className="mbar-val">{v || ''}</span>
                      <div className={`mbar ${u.id === user.id ? 'mbar-me' : ''}`} style={{ height: `${(v / max) * 100}%` }} />
                      <span className="mbar-name">{u.name.slice(0, 2)}</span>
                    </div>
                  );
                })}
              </div>
              <span className="month-label">
                {new Date(`${k}-15`).toLocaleDateString('de-DE', { month: 'short' })}
              </span>
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
}
