import { useEffect, useRef, useState } from 'react';
import { PlaneGlyph } from './ui.jsx';
import { AppIcon } from './Polo.jsx';
import { buzz } from '../lib/fx.js';
import './briefing.css';

// "Sicherheitseinweisung an Bord" – das Tutorial beim ersten Login.
const KEY = (userId) => `polochair:briefed:${userId}`;

export function needsBriefing(userId) {
  try {
    return !localStorage.getItem(KEY(userId));
  } catch {
    return false;
  }
}
function markBriefed(userId) {
  try {
    localStorage.setItem(KEY(userId), new Date().toISOString());
  } catch {
    /* egal */
  }
}

// ---------- kleine Illustrationen ----------

function MiniBoard() {
  const rows = [
    ['07:15', 'AP715', 'WRK', 'ON TIME', 'amber'],
    ['16:30', 'AP1630', 'HOM', 'BOARDING', 'green'],
  ];
  return (
    <div className="bf-board">
      {rows.map(([t, f, d, s, tone], i) => (
        <div key={i} className={`bf-board-row ${i === 0 ? 'bf-tap' : ''}`}>
          <Cells text={t} />
          <Cells text={f} />
          <Cells text={d} />
          <span className={`tone-${tone}`}>
            <Cells text={s} />
          </span>
        </div>
      ))}
      <span className="bf-finger" aria-hidden="true" />
    </div>
  );
}

function Cells({ text }) {
  return (
    <span className="flap">
      {text.split('').map((c, i) => (
        <span key={i} className="flap-cell">{c === ' ' ? ' ' : c}</span>
      ))}
    </span>
  );
}

function MiniSeats({ captain }) {
  return (
    <div className="bf-car">
      <div className="bf-seat bf-seat-pilot">1A<small>{captain}</small></div>
      <div />
      <div className="bf-seat bf-seat-pick">1B<small>Business</small></div>
      <div className="bf-seat">2A<small>frei</small></div>
      <div className="bf-seat bf-seat-eco">2B<small>Economy</small></div>
      <div className="bf-seat">2C<small>frei</small></div>
    </div>
  );
}

function MiniTicket() {
  return (
    <div className="bf-ticket">
      <div className="bf-ticket-main">
        <b>HOM</b>
        <PlaneGlyph size={16} className="bf-ticket-plane" />
        <b>WRK</b>
        <span className="bf-ticket-stamp">Boarded</span>
      </div>
      <div className="bf-ticket-stub">
        <span>AP 715 · 1B</span>
        <span className="bf-ticket-hint">⟶ abreißen</span>
      </div>
    </div>
  );
}

function MiniMath({ captain }) {
  return (
    <div className="bf-math">
      <div className="bf-math-row">
        <span>23 km × 6,2 l × 1,79 €</span>
        <b>2,55 €</b>
      </div>
      <div className="bf-math-row">
        <span>÷ 3 an Bord (inkl. Captain)</span>
        <b>0,85 €</b>
      </div>
      <div className="bf-math-total">
        <span>Du schuldest {captain}</span>
        <b>~3 €</b>
      </div>
    </div>
  );
}

function MiniCockpit() {
  return (
    <div className="bf-cockpit">
      <div className="bf-cockpit-btn">+ Neuen Flug ankündigen</div>
      <div className="bf-cockpit-row">
        <span className="bf-chip bf-chip-wa">WhatsApp teilen</span>
        <span className="bf-chip">+10 min</span>
      </div>
      <div className="bf-cockpit-row">
        <span className="bf-chip bf-chip-fuel">Grad getankt? 1,79 €/l</span>
      </div>
    </div>
  );
}

function MiniWelcome() {
  return (
    <div className="bf-welcome">
      <AppIcon size={96} className="bf-welcome-icon" />
      <div className="bf-welcome-name">
        Poloch <b>Air</b>
      </div>
    </div>
  );
}

function MiniMiles() {
  return (
    <div className="bf-miles">
      <span className="tier tier-bronze">Bronze · 10</span>
      <span className="tier tier-silver">Silber · 25</span>
      <span className="tier tier-gold">Gold · 50</span>
    </div>
  );
}

// ---------- Karten ----------

function cards(user, isCaptain, captain) {
  const list = [
    {
      n: 'Willkommen an Bord',
      art: <MiniWelcome />,
      title: `Moin ${user.name}!`,
      text: 'Poloch Air ist unsere Fahrgemeinschaft. Keiner muss mehr jedes Mal Spritgeld abzählen: Die App merkt sich, wer mitfährt, und rechnet fair ab. Diese Einweisung dauert eine Minute.',
    },
    {
      n: 'Abflugtafel',
      art: <MiniBoard />,
      title: 'Flüge findest du auf der Abflugtafel',
      text: 'Wer fährt, kündigt seine Fahrt als Flug an, z. B. AP 715 um 7:15. Tipp einen Flug an, um ihn dir anzusehen und zu buchen.',
    },
    {
      n: 'Check-in',
      art: <MiniSeats captain={captain} />,
      title: 'Sitz wählen, Ticket buchen',
      text: 'Wer zuerst bucht, wählt zuerst: 1B Business, hinten Premium Economy, und in der Mitte die Economy. Dein Boarding Pass wird dann gedruckt. Stornieren oder umsetzen geht bis zum Abflug.',
    },
    {
      n: 'Wichtigste Regel',
      art: <MiniTicket />,
      title: 'Beim Einsteigen: Ticket abreißen!',
      text: 'Wisch beim Einsteigen über die Perforation. Erst dann giltst du als mitgefahren, und nur dann zahlst du. Abreißen geht ab 30 Minuten vor Abflug bis Mitternacht.',
    },
    {
      n: 'Polochrechner',
      art: <MiniMath captain={captain} />,
      title: 'Bezahlt wird in ganzen Euro',
      text: 'Die Spritkosten einer Fahrt werden durch alle im Auto geteilt, inklusive Fahrer. Im Polochrechner siehst du, was du wem schuldest. Hast du gezahlt, meldest du es dort, und der Fahrer bestätigt. Mehr zahlen geht auch, dann hast du Guthaben.',
    },
  ];
  if (isCaptain) {
    list.push({
      n: 'Für Captains',
      art: <MiniCockpit />,
      title: 'Du fährst? So geht’s',
      text: 'Über „Neuen Flug ankündigen“ trägst du Hin- und Rückfahrt ein und teilst sie in der WhatsApp-Gruppe. Nach dem Tanken aktualisierst du im Profil kurz den Spritpreis. Hat jemand vergessen abzureißen, fragt dich die App danach.',
    });
  }
  list.push({
    n: 'Bitte anschnallen',
    art: <MiniMiles />,
    title: 'Sammle Poloch Miles',
    text: 'Jede Mitfahrt zählt für deinen Vielflieger-Status. Das Bordradio ist leider außer Betrieb. Für Unterhaltung sorgt die angeschnallte Musikbox auf der Rückbank, heute mit chilligen House-Tunes. Wir wünschen einen entspannten Flug.',
  });
  return list;
}

export default function Briefing({ user, isCaptain, captainName = 'Captain', onDone }) {
  const list = cards(user, isCaptain, captainName);
  const [i, setI] = useState(0);
  const drag = useRef(null);
  const last = i === list.length - 1;

  const go = (n) => {
    setI((cur) => Math.max(0, Math.min(list.length - 1, cur + n)));
    buzz(5);
  };
  const finish = () => {
    markBriefed(user.id);
    onDone();
  };

  useEffect(() => {
    const on = (e) => {
      if (e.key === 'ArrowRight') go(1);
      if (e.key === 'ArrowLeft') go(-1);
      if (e.key === 'Escape') finish();
    };
    window.addEventListener('keydown', on);
    return () => window.removeEventListener('keydown', on);
  }); // eslint-disable-line react-hooks/exhaustive-deps

  const onDown = (e) => (drag.current = e.clientX);
  const onUp = (e) => {
    if (drag.current == null) return;
    const dx = e.clientX - drag.current;
    drag.current = null;
    if (dx < -50) go(1);
    else if (dx > 50) go(-1);
  };

  const c = list[i];
  return (
    <div className="bf" role="dialog" aria-modal="true" aria-label="Sicherheitseinweisung">
      <div className="bf-top">
        <span className="bf-kicker">Sicherheitseinweisung</span>
        <button className="bf-skip" onClick={finish}>Überspringen</button>
      </div>

      <div className="bf-card" key={i} onPointerDown={onDown} onPointerUp={onUp} onPointerCancel={() => (drag.current = null)}>
        <div className="bf-num">
          {String(i + 1).padStart(2, '0')} / {String(list.length).padStart(2, '0')} · {c.n}
        </div>
        <div className="bf-art">{c.art}</div>
        <h2 className="bf-title">{c.title}</h2>
        <p className="bf-text">{c.text}</p>
      </div>

      <div className="bf-nav">
        <button className="btn btn-ghost" onClick={() => go(-1)} disabled={i === 0} aria-label="Zurück">‹</button>
        <div className="bf-dots" aria-hidden="true">
          {list.map((_, k) => (
            <span key={k} className={k === i ? 'on' : ''} />
          ))}
        </div>
        {last ? (
          <button className="btn btn-primary" onClick={finish}>Los geht’s</button>
        ) : (
          <button className="btn btn-primary" onClick={() => go(1)}>Weiter</button>
        )}
      </div>
    </div>
  );
}
