// CONFIGURATION TEST — projet Firebase TEST
// 4.6 beta.5 — notifications robustes par appareil
// La clé VAPID sera ajoutée lorsque les notifications seront configurées.
globalThis.COVOIT_ENV = {
  environment: "test",
  version: "4.6.0-beta.5",
  vapidKey: "BObxsvRa1RrgB1ZpCVRgoeamoVswv79wDIx7iM17lEx5jlsThjtocVSHyk4dhIK57Ym0c4JPhbGXRQkTQ8TOEGc",
  firebaseConfig: {
    apiKey: "AIzaSyBOoonCuL0dIzBS3R6W6TlnK6Qp_fCzuqk",
    authDomain: "team-tool-test-data.firebaseapp.com",
    projectId: "team-tool-test-data",
    storageBucket: "team-tool-test-data.firebasestorage.app",
    messagingSenderId: "398960207483",
    appId: "1:398960207483:web:9240b437275e9882be24de"
  }
};

// Aide visuelle réservée à la plateforme TEST.
if (typeof document !== 'undefined') document.addEventListener('DOMContentLoaded', () => {
  const host = document.querySelector('.help-menu-block');
  if (!host) return;

  if (!document.getElementById('test-help-styles')) {
    const style = document.createElement('style');
    style.id = 'test-help-styles';
    style.textContent = `
      .help-shell > summary::-webkit-details-marker{display:none}
      .help-shell > summary{list-style:none}
      .help-summary-left{display:flex;align-items:center;gap:10px;min-width:0}
      .help-summary-icon{width:34px;height:34px;border-radius:10px;background:linear-gradient(145deg,#e9f2fb,#dceafb);display:grid;place-items:center;font-size:18px;flex:0 0 auto}
      .help-summary-text{display:flex;flex-direction:column;font:inherit;line-height:1.3}
      .help-summary-text strong{font:inherit;font-weight:800;letter-spacing:normal}.help-summary-text small{font-size:11px;color:var(--muted);font-weight:600;margin-top:3px}
      .help-summary-arrow{font-size:22px;color:var(--muted);transition:transform .18s ease}
      .help-shell[open] .help-summary-arrow{transform:rotate(90deg)}
      .help-panel{margin-top:12px;border:1px solid var(--line);border-radius:14px;overflow:hidden;background:var(--card)}
      .help-hero{padding:16px;background:linear-gradient(145deg,#203a5f,#315b88);color:#fff}
      .help-hero-kicker{font-size:11px;font-weight:850;letter-spacing:.7px;text-transform:uppercase;opacity:.8}
      .help-hero h4{font-size:19px;line-height:1.2;margin:5px 0 6px}
      .help-hero p{font-size:12px;line-height:1.45;margin:0;opacity:.9}
      .help-flow{display:grid;gap:8px;padding:12px}
      .help-step{display:grid;grid-template-columns:34px 1fr;gap:10px;align-items:start;padding:10px;border:1px solid var(--line);border-radius:11px;background:var(--soft)}
      .help-step-n{width:30px;height:30px;border-radius:50%;display:grid;place-items:center;background:var(--brand);color:#fff;font-weight:900;font-size:13px}
      .help-step strong{display:block;font-size:13px;margin-bottom:2px}
      .help-step span{display:block;font-size:11.5px;line-height:1.4;color:var(--muted)}
      .help-section{padding:13px 14px;border-top:1px solid var(--line)}
      .help-section-title{font-size:12px;font-weight:900;margin-bottom:9px;display:flex;align-items:center;gap:6px}
      .help-status-grid{display:grid;grid-template-columns:1fr 1fr;gap:7px}
      .help-status{padding:8px 9px;border-radius:9px;border:1px solid var(--line);font-size:11px;line-height:1.3;background:var(--card)}
      .help-status strong{display:block;font-size:12px;margin-bottom:2px}
      .help-status.present strong{color:var(--ok)}
      .help-status.absent strong{color:var(--muted)}
      .help-status.alone strong{color:var(--brand2)}
      .help-status.time strong{color:var(--warn)}
      .help-highlight{padding:11px;border-radius:10px;background:#eef7ff;border:1px solid #cfe3f7;font-size:11.5px;line-height:1.45}
      .help-highlight strong{color:#203a5f}
      .help-tabs{display:grid;gap:6px}
      .help-tab{display:grid;grid-template-columns:86px 1fr;gap:8px;align-items:start;font-size:11.5px;line-height:1.35}
      .help-tab b{color:var(--brand)}
      .help-tip{margin-top:8px;padding:9px 10px;border-radius:9px;background:#eefaf4;border:1px solid #c9ead9;font-size:11.5px;line-height:1.4}
      .help-test-note{padding:10px 14px;background:#f7efff;border-top:1px solid #e4d1f5;color:#6a1fa1;font-size:11px;line-height:1.4}
      html[data-theme="dark"] .help-summary-icon{background:#202b38}
      html[data-theme="dark"] .help-highlight{background:#17283a;border-color:#2e4d6a}
      html[data-theme="dark"] .help-highlight strong{color:#a9ccec}
      html[data-theme="dark"] .help-tip{background:#13271f;border-color:#285a44}
      html[data-theme="dark"] .help-test-note{background:#25172e;border-color:#4c2d5f;color:#d8a9f5}
    `;
    document.head.appendChild(style);
  }

  host.innerHTML = `
    <details class="help-shell">
      <summary class="menu-link">
        <span class="help-summary-left">
          <span class="help-summary-icon">💡</span>
          <span class="help-summary-text"><strong>Aide express</strong><small>1 minute pour tout comprendre</small></span>
        </span>
        <span class="help-summary-arrow">›</span>
      </summary>

      <div class="help-panel">
        <div class="help-hero">
          <div class="help-hero-kicker">Le principe</div>
          <h4>Tu renseignes ta situation.<br>L’app fait le reste.</h4>
          <p>Elle compose les groupes, tient compte des contraintes et aide à faire tourner les conducteurs équitablement.</p>
        </div>

        <div class="help-flow">
          <div class="help-step"><div class="help-step-n">1</div><div><strong>Je renseigne ma journée</strong><span>Présent, absent, seul ou avec un impératif horaire.</span></div></div>
          <div class="help-step"><div class="help-step-n">2</div><div><strong>L’app propose les groupes</strong><span>Elle croise les disponibilités, les contraintes et l’historique.</span></div></div>
          <div class="help-step"><div class="help-step-n">3</div><div><strong>On valide le trajet réel</strong><span>Chaque groupe peut être validé ou modifié séparément. Le vrai conducteur est enregistré et les compteurs sont mis à jour.</span></div></div>
        </div>

        <div class="help-section">
          <div class="help-section-title">👆 Quel statut choisir ?</div>
          <div class="help-status-grid">
            <div class="help-status present"><strong>● Présent</strong>Je covoiture normalement.</div>
            <div class="help-status absent"><strong>○ Absent</strong>Je ne participe pas.</div>
            <div class="help-status alone"><strong>🚗 Seul</strong>Je fais mon trajet de mon côté.</div>
            <div class="help-status time"><strong>⏱ Impératif</strong>Je dois repartir à une heure précise.</div>
          </div>
        </div>

        <div class="help-section">
          <div class="help-section-title">⚖️ Comment le conducteur est choisi ?</div>
          <div class="help-highlight"><strong>Chaque composition a son propre compteur.</strong><br>Un binôme Igor–Ludo est équilibré séparément d’un trinôme Igor–Ludo–Stéphane. L’app suggère en priorité celui qui a le moins conduit dans cette composition.</div>
          <div class="help-tip">✅ Si quelqu’un d’autre conduit finalement, on sélectionne simplement le <strong>conducteur réel</strong> avant validation.</div>
        </div>

        <div class="help-section">
          <div class="help-section-title">⏱ Et si j’ai un impératif ?</div>
          <div class="small muted">Tu indiques ton heure. Les collègues concernés disent s’ils peuvent s’adapter. L’app évite alors de proposer un groupe incompatible.</div>
        </div>

        <div class="help-section">
          <div class="help-section-title">🧭 Les 4 onglets</div>
          <div class="help-tabs">
            <div class="help-tab"><b>Prochain</b><span>Ma saisie et la situation du prochain covoiturage.</span></div>
            <div class="help-tab"><b>Planning</b><span>Renseigner plusieurs jours rapidement.</span></div>
            <div class="help-tab"><b>Groupes</b><span>Préparer, ajuster ou corriger les groupes.</span></div>
            <div class="help-tab"><b>Historique</b><span>Voir les trajets et mon bilan personnel.</span></div>
          </div>
        </div>

        <div class="help-section">
          <div class="help-section-title">🔔 Petit plus</div>
          <div class="small muted">Si les notifications sont activées, un rappel peut être envoyé à 20h quand le prochain jour travaillé n’est pas encore renseigné.</div>
        </div>

        <div class="help-test-note"><strong>🧪 Version TEST :</strong> la validation est volontairement libre afin de pouvoir faire des démonstrations sans attendre l’heure réelle.</div>
      </div>
    </details>
  `;
});

// 4.6 beta.3 — harmonisation visuelle et sémantique des actions Delle.
// L'app métier reste inchangée : ce bloc ne touche qu'à l'état des contrôles déjà rendus.
if (typeof document !== 'undefined') document.addEventListener('DOMContentLoaded', () => {
  const root = document.getElementById('dellePrivate');
  if (!root || typeof MutationObserver === 'undefined') return;

  const alignValidatedDelle = () => {
    const validated = root.querySelector('.delle-validated');
    const select = root.querySelector('#delleDriver');
    const actions = root.querySelector('.delle-actions');
    const appSave = root.querySelector('#saveDelleTrip');
    const appDelete = root.querySelector('#deleteDelleTrip');

    if (!validated || !select || !actions || !appSave || !appDelete) return;
    if (actions.dataset.delleAligned === '1') return;
    actions.dataset.delleAligned = '1';

    const forcedByMainGroup = select.disabled || (root.querySelector('.delle-suggest')?.textContent || '').includes('Conducteur imposé');
    const originalDriver = select.value;

    // Les vrais boutons de l'app restent présents avec leurs gestionnaires,
    // mais on affiche d'abord le même état "validé" que pour le trajet principal.
    appSave.style.display = 'none';
    appDelete.style.display = 'none';
    select.disabled = true;

    const doneBtn = document.createElement('button');
    doneBtn.type = 'button';
    doneBtn.className = 'btn smallbtn';
    doneBtn.disabled = true;
    doneBtn.textContent = '✓ Delle validé';

    const modifyBtn = document.createElement('button');
    modifyBtn.type = 'button';
    modifyBtn.className = 'btn secondary smallbtn';
    modifyBtn.textContent = 'Modifier';

    const cancelBtn = document.createElement('button');
    cancelBtn.type = 'button';
    cancelBtn.className = 'btn secondary smallbtn';
    cancelBtn.textContent = 'Annuler';
    cancelBtn.style.display = 'none';

    const showValidatedState = () => {
      select.value = originalDriver;
      select.disabled = true;
      appSave.style.display = 'none';
      appDelete.style.display = 'none';
      doneBtn.style.display = '';
      modifyBtn.style.display = '';
      cancelBtn.style.display = 'none';
    };

    modifyBtn.addEventListener('click', () => {
      doneBtn.style.display = 'none';
      modifyBtn.style.display = 'none';
      cancelBtn.style.display = '';
      select.disabled = forcedByMainGroup;

      appSave.style.display = '';
      appSave.disabled = false;
      appSave.textContent = 'Enregistrer les modifications';

      appDelete.style.display = '';
      appDelete.className = 'btn danger smallbtn';
      appDelete.textContent = 'Supprimer ce trajet';
    });

    cancelBtn.addEventListener('click', showValidatedState);

    actions.appendChild(doneBtn);
    actions.appendChild(modifyBtn);
    actions.appendChild(cancelBtn);
  };

  const observer = new MutationObserver(() => alignValidatedDelle());
  observer.observe(root, { childList: true, subtree: true });
  alignValidatedDelle();
});

// 4.6 beta.4 — même charte graphique pour le bloc Delle et le covoiturage principal.
if (typeof document !== 'undefined') document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('delle-main-style-sync')) return;
  const style = document.createElement('style');
  style.id = 'delle-main-style-sync';
  style.textContent = `
    .delle-private{width:100%;margin-top:9px;padding:12px;border:1px solid #86cba8;border-radius:14px;background:#e9f7f0;color:#123b29}
    .delle-private .delle-head{margin-bottom:5px;align-items:center}
    .delle-private .delle-head h3{margin:0;font-size:15px;color:#0f5f3a}
    .delle-private .delle-lock{color:#2e7553;font-size:10.5px}.delle-private .delle-place{color:#4b7563;font-size:10.5px}
    .delle-private .delle-body{display:grid;gap:7px}
    .delle-private .delle-counters{display:block;margin-top:1px;font-size:11.5px;line-height:1.35;color:#4b7563}
    .delle-private .delle-counters strong{padding:0;border:0;border-radius:0;background:transparent;color:inherit;font-size:inherit}
    .delle-private .delle-suggest{font-size:11.5px;font-weight:750;color:#2e7553}
    .delle-private .delle-driver-row{display:grid;grid-template-columns:auto minmax(120px,1fr);align-items:center;gap:8px;margin-top:2px}
    .delle-private .delle-driver-row label{font-size:12px;font-weight:800;color:#315e4a}
    .delle-private .delle-driver-row select{padding:9px;font-size:13px;border-radius:10px;background:var(--card)}
    .delle-private .delle-validated{margin-top:2px;padding:9px 10px;border:1px solid #9fd7b9;border-radius:11px;background:rgba(255,255,255,.55);color:#0f5f3a;font-size:11.5px}
    .delle-private .delle-actions{display:grid;grid-template-columns:minmax(0,1.35fr) minmax(0,.65fr);gap:7px;margin-top:2px}
    .delle-private .delle-actions .btn{width:100%;min-height:44px;padding:11px 8px;font-size:12.5px}
    .delle-private .delle-history-shell{border-top:1px solid #cce8d9;margin-top:12px;padding-top:10px}
    html[data-theme="dark"] .delle-private{background:#13271f;border-color:#285a44;color:#bde8d1}
    html[data-theme="dark"] .delle-private .delle-head h3,html[data-theme="dark"] .delle-private .delle-driver-row label{color:#9ce0bc}
    html[data-theme="dark"] .delle-private .delle-lock,html[data-theme="dark"] .delle-private .delle-place,html[data-theme="dark"] .delle-private .delle-counters,html[data-theme="dark"] .delle-private .delle-suggest{color:#8fc9aa}
    html[data-theme="dark"] .delle-private .delle-validated{background:#10231b;border-color:#285a44;color:#9ce0bc}
    @media(max-width:620px){.delle-private{padding:12px;border-radius:14px}.delle-private .delle-driver-row{grid-template-columns:auto 1fr;gap:8px}.delle-private .delle-actions{grid-template-columns:1.25fr .75fr;gap:7px}}
  `;
  document.head.appendChild(style);
});
