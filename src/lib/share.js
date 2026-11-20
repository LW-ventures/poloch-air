import { flightNumber, fmtDate } from './domain.js';
import { appUrl } from './router.js';

export function whatsappText(flights, pilotName) {
  const lines = ['✈️ *Poloch Air* – Durchsage vom Captain:', ''];
  for (const f of flights) {
    lines.push(`*${flightNumber(f)}* · ${fmtDate(f.date)} · ${f.time}${f.delayMin ? ` (+${f.delayMin} min)` : ''}`);
    lines.push(`${f.fromCode} ${f.fromName} → ${f.toCode} ${f.toName}`);
    if (f.status === 'cancelled') lines.push('❌ GESTRICHEN');
    lines.push('');
  }
  if (flights[0]?.note) lines.push(`Gate: ${flights[0].note}`, '');
  lines.push(`Captain ${pilotName}. Jetzt einchecken:`);
  lines.push(appUrl(`/flight/${flights[0].id}`));
  return lines.join('\n');
}

export function openWhatsApp(text) {
  window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener');
}
