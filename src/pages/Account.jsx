import { useState } from 'react';
import { api } from '../data/store.js';
import { myBalances, ledgerEntries, fmtEuro, flightNumber, fmtDate, roundEuro, driverTasks } from '../lib/domain.js';
import { Section, Sheet, attempt, nameOf, Empty } from '../components/ui.jsx';
import { BalanceLine } from './Home.jsx';

export default function Account({ state, user, now }) {
  const balances = myBalances(state, user.id);
  const tasks = driverTasks(state, user.id, now);
  const myPending = state.payments.filter((p) => p.fromId === user.id && p.status === 'pending');
  const [sheet, setSheet] = useState(null); // { mode: 'report'|'record', otherId, suggest }
  const [showAll, setShowAll] = useState(false);

  const history = ledgerEntries(state).filter((e) => e.from === user.id || e.to === user.id);
  const shown = showAll ? history : history.slice(0, 12);

  const drivers = state.users.filter((u) => u.id !== user.id);

  return (
    <div className="page">
      <h1 className="page-title">Polochrechner</h1>
      <p className="page-lead">Intern wird centgenau gezählt, angezeigt und gezahlt wird in ganzen Euro. Was beim Runden übrig bleibt, bleibt einfach im Konto stehen.</p>

      {tasks.payments.length > 0 && (
        <Section title="Zu bestätigen">
          <ul className="pay-list">
            {tasks.payments.map((p) => (
              <li key={p.id} className="pay pay-pending">
                <span>
                  <span><b>{nameOf(state, p.fromId)}</b> sagt: {fmtEuro(p.cents)} gezahlt</span>
                  {p.note && <small>„{p.note}“</small>}
                </span>
                <span className="pay-actions">
                  <button className="chip chip-yes" onClick={() => attempt(() => api.resolvePayment(p.id, true), 'Zahlung verbucht.')}>Erhalten</button>
                  <button className="chip chip-no" onClick={() => attempt(() => api.resolvePayment(p.id, false), 'Abgelehnt.')}>Nein</button>
                </span>
              </li>
            ))}
          </ul>
        </Section>
      )}

      <Section title="Kontostände">
        {balances.length === 0 && <Empty>Noch keine Flüge abgerechnet.</Empty>}
        <ul className="balance-list">
          {balances.map(({ otherId, cents }) => {
            const euro = roundEuro(Math.abs(cents));
            return (
              <BalanceLine key={otherId} name={nameOf(state, otherId)} cents={cents}>
                <span className="balance-cta">
                  {cents > 0 ? (
                    <button className="btn btn-small btn-primary" onClick={() => setSheet({ mode: 'report', otherId, suggest: euro })}>
                      Zahlung melden
                    </button>
                  ) : (
                    <button className="btn btn-small" onClick={() => setSheet({ mode: 'record', otherId, suggest: euro })}>
                      Zahlung erhalten
                    </button>
                  )}
                </span>
              </BalanceLine>
            );
          })}
        </ul>
        <div className="row-actions">
          <button className="btn btn-ghost" onClick={() => setSheet({ mode: 'report', otherId: drivers[0]?.id, suggest: 5 })}>
            Vorauszahlung melden
          </button>
          <button className="btn btn-ghost" onClick={() => setSheet({ mode: 'record', otherId: drivers[0]?.id, suggest: 5 })}>
            Bargeld bekommen
          </button>
        </div>
      </Section>

      {myPending.length > 0 && (
        <Section title="Wartet auf Bestätigung">
          <ul className="pay-list">
            {myPending.map((p) => (
              <li key={p.id} className="pay">
                <span>
                  <span>{fmtEuro(p.cents)} an <b>{nameOf(state, p.toId)}</b></span>
                  <small>{new Date(p.createdAt).toLocaleDateString('de-DE')}</small>
                </span>
                <span className="pay-state">offen</span>
              </li>
            ))}
          </ul>
        </Section>
      )}

      <Section title="Verlauf">
        {history.length === 0 && <Empty>Noch nichts passiert.</Empty>}
        <ul className="ledger">
          {shown.map((e) => {
            const mine = e.from === user.id;
            const other = nameOf(state, mine ? e.to : e.from);
            // Aus meiner Sicht: + = ich schulde mehr / bekomme weniger
            const signed = mine ? e.cents : -e.cents;
            return (
              <li key={e.kind + e.id}>
                <span className="ledger-what">
                  {e.kind === 'flight' ? (
                    <>
                      {flightNumber(e.flight)} {e.flight.fromCode}→{e.flight.toCode}
                      <small>{fmtDate(e.flight.date)} · {mine ? `Captain ${other}` : `Passagier ${other}`}</small>
                    </>
                  ) : (
                    <>
                      Zahlung {mine ? `an ${other}` : `von ${other}`}
                      <small>
                        {new Date(e.at).toLocaleDateString('de-DE')}
                        {e.payment.note ? ` · ${e.payment.note}` : ''}
                      </small>
                    </>
                  )}
                </span>
                <span className={`ledger-amt ${signed > 0 ? 'neg' : 'pos'}`}>
                  {signed > 0 ? '−' : '+'}
                  {fmtEuro(Math.abs(e.cents))}
                </span>
              </li>
            );
          })}
        </ul>
        {history.length > shown.length && (
          <button className="link-btn" onClick={() => setShowAll(true)}>Alles anzeigen ({history.length})</button>
        )}
      </Section>

      <PaymentSheet state={state} user={user} sheet={sheet} onClose={() => setSheet(null)} />
    </div>
  );
}

function PaymentSheet({ state, user, sheet, onClose }) {
  const [amount, setAmount] = useState('');
  const [otherId, setOtherId] = useState('');
  const [note, setNote] = useState('');
  const [lastKey, setLastKey] = useState(null);

  // Bei neuem Sheet Felder vorbelegen
  const key = sheet ? `${sheet.mode}-${sheet.otherId}-${sheet.suggest}` : null;
  if (key !== lastKey) {
    setLastKey(key);
    if (sheet) {
      setAmount(String(sheet.suggest || ''));
      setOtherId(sheet.otherId || '');
      setNote('');
    }
  }
  if (!sheet) return null;
  const report = sheet.mode === 'report';
  const others = state.users.filter((u) => u.id !== user.id);

  const submit = async (e) => {
    e.preventDefault();
    const cents = Math.round(Number(String(amount).replace(',', '.')) * 100);
    const ok = await attempt(
      () => api.addPayment(report ? { fromId: user.id, toId: otherId, cents, note } : { fromId: otherId, toId: user.id, cents, note }),
      report ? `Gemeldet. ${nameOf(state, otherId)} muss noch bestätigen.` : 'Zahlung verbucht.',
    );
    if (ok) onClose();
  };

  return (
    <Sheet open onClose={onClose} title={report ? 'Zahlung melden' : 'Zahlung erhalten'}>
      <form className="form" onSubmit={submit}>
        <label className="field">
          <span>{report ? 'An wen?' : 'Von wem?'}</span>
          <select value={otherId} onChange={(e) => setOtherId(e.target.value)}>
            {others.map((u) => (
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Betrag in € (bis 200)</span>
          <div className="amount-row">
            <input className="amount" type="text" inputMode="decimal" maxLength={6} value={amount} onChange={(e) => setAmount(e.target.value)} required />
            {[2, 5, 10, 20].map((v) => (
              <button type="button" key={v} className={`chip ${String(v) === amount ? 'chip-on' : ''}`} onClick={() => setAmount(String(v))}>
                {v} €
              </button>
            ))}
          </div>
        </label>
        <label className="field">
          <span>Notiz (optional)</span>
          <input placeholder={report ? 'PayPal, bar, Kaffee ausgegeben …' : 'bar, Döner …'} value={note} onChange={(e) => setNote(e.target.value)} maxLength={60} />
        </label>
        <p className="hint">
          {report
            ? 'Zählt erst, wenn der Empfänger bestätigt. Mehr als geschuldet? Dann hast du Guthaben für die nächsten Flüge.'
            : 'Wird sofort verbucht.'}
        </p>
        <button className="btn btn-primary btn-block btn-big" type="submit">
          {report ? 'Melden' : 'Verbuchen'}
        </button>
      </form>
    </Sheet>
  );
}
