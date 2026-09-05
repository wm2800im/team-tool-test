from pathlib import Path
import re


def once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{label}: expected exactly 1 match, found {count}")
    return text.replace(old, new, 1)


app = Path("app.js")
text = app.read_text(encoding="utf-8")

text = once(
    text,
    "const APP_VERSION = ENV.version || '4.4.0-beta.7';",
    "const APP_VERSION = ENV.version || '4.4.0-beta.9';",
    "app fallback version",
)

text = once(
    text,
    "const STATUS = {\n  present:{label:'Présent',cls:'present'}, absent:{label:'Absent',cls:'absent'},\n  alone:{label:'Seul',cls:'alone'}, time:{label:'Impératif',cls:'time'}, missing:{label:'Non renseigné',cls:'missing'}\n};",
    "const STATUS = {\n  present:{label:'Présent',cls:'present'}, absent:{label:'Absent',cls:'absent'},\n  alone:{label:'Seul',cls:'alone'}, time:{label:'Impératif',cls:'time'}, missing:{label:'Non renseigné',cls:'missing'}\n};\nconst LATE_UNKNOWN = 'late_unknown';\nconst timeLabel = value => value===LATE_UNKNOWN ? 'Tard · heure inconnue' : (value||'');",
    "late value helper",
)

text = once(
    text,
    "  if(v.status==='time')return {label:`Impératif ${v.time||''}`.trim(),cls:'time'};",
    "  if(v.status==='time')return {label:`Impératif ${timeLabel(v.time)}`.trim(),cls:'time'};",
    "status label",
)

text = once(
    text,
    "  sel.value=[...sel.options].some(o=>o.value===value)?value:'16:15';\n}",
    "  const late=document.createElement('option');late.value=LATE_UNKNOWN;late.textContent=timeLabel(LATE_UNKNOWN);sel.appendChild(late);\n  sel.value=[...sel.options].some(o=>o.value===value)?value:'16:15';\n}",
    "late selector option",
)

old_compat = """    const item=document.createElement('div');item.className='compat-item';
    item.innerHTML=`<div><strong>${label(p)}</strong> doit partir au plus tard à <strong>${v.time}</strong>.</div><div class=\"small muted\">Peux-tu partir avec ${label(p)} à cet horaire ?</div>
      <div class=\"compat-actions\"><button class=\"compat-btn yes ${current==='yes'?'selected':''}\" data-owner=\"${p}\" data-answer=\"yes\">✅ Oui</button><button class=\"compat-btn no ${current==='no'?'selected':''}\" data-owner=\"${p}\" data-answer=\"no\">❌ Non</button></div>`;"""
new_compat = """    const item=document.createElement('div');item.className='compat-item';
    const lateUnknown=v.time===LATE_UNKNOWN;
    const constraintText=lateUnknown
      ? `<strong>${label(p)}</strong> veut partir tard, à une heure inconnue.`
      : `<strong>${label(p)}</strong> veut partir à <strong>${timeLabel(v.time)}</strong>.`;
    const question=lateUnknown
      ? `Peux-tu partir avec ${label(p)} malgré cette incertitude ?`
      : `Peux-tu partir avec ${label(p)} à cet horaire ?`;
    item.innerHTML=`<div>${constraintText}</div><div class=\"small muted\">${question}</div>
      <div class=\"compat-actions\"><button class=\"compat-btn yes ${current==='yes'?'selected':''}\" data-owner=\"${p}\" data-answer=\"yes\">✅ Oui</button><button class=\"compat-btn no ${current==='no'?'selected':''}\" data-owner=\"${p}\" data-answer=\"no\">❌ Non</button></div>`;"""
text = once(text, old_compat, new_compat, "compatibility wording")

text = once(
    text,
    "${bad.map(x=>`${label(x.responder)} a refusé ${x.time} avec ${label(x.owner)}`).join(' · ')}",
    "${bad.map(x=>`${label(x.responder)} a refusé ${timeLabel(x.time)} avec ${label(x.owner)}`).join(' · ')}",
    "group rejected display",
)
text = once(
    text,
    "${unknown.map(x=>`${label(x.responder)} ↔ ${label(x.owner)} ${x.time}`).join(' · ')}",
    "${unknown.map(x=>`${label(x.responder)} ↔ ${label(x.owner)} ${timeLabel(x.time)}`).join(' · ')}",
    "group unknown display",
)
text = once(
    text,
    "${proposal.rejected.map(x=>`${label(x.responder)} ne peut pas partir à ${x.time} avec ${label(x.owner)}`).join(' · ')}",
    "${proposal.rejected.map(x=>`${label(x.responder)} ne peut pas partir avec ${label(x.owner)} · ${timeLabel(x.time)}`).join(' · ')}",
    "proposal rejected display",
)

app.write_text(text, encoding="utf-8")

index = Path("index.html")
html = index.read_text(encoding="utf-8")
html = once(
    html,
    '<label>Départ au plus tard</label><select id="timeLimit"></select>',
    '<label>Départ</label><select id="timeLimit"></select>',
    "main time label",
)
html = once(
    html,
    '<label>Heure maxi</label><select id="rangeTime"></select>',
    '<label>Départ</label><select id="rangeTime"></select>',
    "planning time label",
)
index.write_text(html, encoding="utf-8")

config = Path("public-config.js")
cfg = config.read_text(encoding="utf-8")
cfg = once(cfg, 'version: "4.4.0-beta.8"', 'version: "4.4.0-beta.9"', "public version")
config.write_text(cfg, encoding="utf-8")

sw = Path("service-worker.js")
sw_text = sw.read_text(encoding="utf-8")
sw_text = once(
    sw_text,
    "const CACHE='covoiturage-4.4.0-beta.8';",
    "const CACHE='covoiturage-4.4.0-beta.9';",
    "cache version",
)
sw.write_text(sw_text, encoding="utf-8")
