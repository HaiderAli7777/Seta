/* ============================================================================
   3.10 — payments on documents, professional reports and exports.
   · settlementsOf follows the same rule as the aged receivable: a receipt,
     cheque or credit note recorded against a document settles that document
     first; anything left settles the oldest open documents.
   · Reports read like financial statements: a statement heading, figures in
     proportional tabular numerals, quiet section rows and ruled totals.
   · PDF and Excel exports keep the statement's structure — sections, groups,
     indentation, subtotals, totals, gains in green and falls in red — and use
     only characters the PDF fonts can draw.
   ========================================================================== */
function settlementsOf(state, doc, asOf = TODAY) {
  if (!doc || doc.state !== "posted" || !["invoice", "bill"].includes(doc.type)) return null;
  const isAR = doc.type === "invoice", creditT = isAR ? "credit_note" : "debit_note", payK = isAR ? "in" : "out";
  const charges = state.docs.filter((d) => d.state === "posted" && d.partner === doc.partner && d.type === doc.type && d.date <= asOf)
    .map((d) => { const t = amounts(d).total; return { id: d.id, number: d.number, due: d.due, amount: t, open: t, paid: [] }; })
    .sort((a, b) => a.due.localeCompare(b.due) || a.number.localeCompare(b.number));
  const byId = Object.fromEntries(charges.map((c) => [c.id, c])), byNo = Object.fromEntries(charges.map((c) => [c.number, c]));
  const pool = [];
  const settle = (c, amt, src) => {
    let left = R2(amt);
    if (c) { const ap = Math.min(left, c.open); if (ap > 0.004) { c.open = R2(c.open - ap); c.paid.push({ ...src, amount: R2(ap), direct: true }); } left = R2(left - ap); }
    if (left > 0.004) pool.push({ src, left });
  };
  state.docs.filter((d) => d.state === "posted" && d.partner === doc.partner && d.type === creditT && d.date <= asOf)
    .forEach((d) => settle(byId[d.against] || byNo[d.ref], amounts(d).total, { kind: "credit", label: DOCMETA[d.type].label, date: d.date, number: d.number, id: d.id, docType: d.type }));
  state.payments.filter((x) => x.partner === doc.partner && x.kind === payK && x.date <= asOf)
    .forEach((x) => settle(byId[x.doc], x.amount, { kind: "payment", label: MET[x.method] ? MET[x.method].name : isAR ? "Receipt" : "Payment", date: x.date, number: x.number, id: x.id, memo: x.memo || x.ref || "" }));
  (state.pdcs || []).filter((x) => x.partner === doc.partner && x.kind === payK && pdcSettles(x, asOf))
    .forEach((x) => settle(byId[x.doc], +x.amount, { kind: "pdc", label: "Post-dated cheque", date: x.date, number: `Cheque ${x.chequeNo}`, id: x.id, memo: [x.bank, pdcStatus(x) === "cleared" ? "cleared" : "not yet cleared"].filter(Boolean).join(" · ") }));
  pool.sort((a, b) => a.src.date.localeCompare(b.src.date));
  charges.forEach((c) => { while (c.open > 0.004 && pool.length) { const p = pool[0], ap = Math.min(p.left, c.open);
    c.open = R2(c.open - ap); p.left = R2(p.left - ap); c.paid.push({ ...p.src, amount: R2(ap), direct: false }); if (p.left <= 0.004) pool.shift(); } });
  const me = charges.find((c) => c.id === doc.id);
  if (!me) return null;
  const items = me.paid.slice().sort((a, b) => a.date.localeCompare(b.date));
  const overdue = me.open > 0.004 && doc.due < TODAY ? daysBetween(doc.due, TODAY) : 0;
  return { total: me.amount, paid: R2(me.amount - me.open), open: me.open, items, overdue };
}

function PaymentsPanel({ s, d, onRecord, drill }) {
  const isInv = d.type === "invoice", pct = s.total > 0 ? Math.min(100, (s.paid / s.total) * 100) : 0;
  const tone = s.open <= 0.004 ? "ok" : s.overdue ? "bad" : "warn";
  return <section className="pay-panel">
    <header>
      <div><h3>{isInv ? "Payments received" : "Payments made"}</h3>
        <p>{s.items.length ? `${s.items.length} ${s.items.length === 1 ? "settlement" : "settlements"} applied to ${d.number}` : `Nothing ${isInv ? "received" : "paid"} against ${d.number} yet`}</p></div>
      <span className={cx("pay-state", tone)}>{s.open <= 0.004 ? "Paid in full" : s.paid > 0.004 ? (s.overdue ? `Part paid · ${s.overdue} days overdue` : "Part paid") : s.overdue ? `${s.overdue} days overdue` : `Due ${dmy(d.due)}`}</span>
    </header>
    <div className="pay-figs">
      <div><span>Document total</span><b>{money(s.total, false)}</b></div>
      <div className="paid"><span>{isInv ? "Received" : "Paid"}</span><b>{money(s.paid, false)}</b></div>
      <div className={cx("due", tone)}><span>{isInv ? "Balance receivable" : "Balance payable"}</span><b>{money(s.open, false)}</b></div>
    </div>
    <div className="pay-bar" role="img" aria-label={`${pct.toFixed(0)}% settled`}><i style={{ width: pct + "%" }} /></div>
    {s.items.length > 0 && <div className="tbl-wrap"><table className="tbl pay-tbl">
      <thead><tr><th>Date</th><th>Reference</th><th>Method</th><th>Note</th><th className="n">Amount · AED</th></tr></thead>
      <tbody>{s.items.map((x, i) => <tr key={i} className={x.kind === "credit" && drill ? "gl-row" : ""} onClick={x.kind === "credit" && drill ? () => drill(LIST_OF[x.docType], x.id, x.number, d.number) : undefined}>
        <td className="muted">{dmy(x.date)}</td><td className="mono">{x.number}</td>
        <td><span className={cx("pay-kind", x.kind)}>{x.kind === "credit" ? x.label : x.kind === "pdc" ? "Cheque" : x.label}</span></td>
        <td className="muted">{x.direct ? x.memo || "Recorded against this document" : `Applied from an earlier ${x.kind === "credit" ? "credit" : "payment"} (oldest open first)`}</td>
        <td className="n">{money(x.amount)}</td></tr>)}</tbody>
      <tfoot><tr><td colSpan={4}>Total {isInv ? "received" : "paid"}</td><td className="n">{money(s.paid)}</td></tr>
        <tr className="pay-open"><td colSpan={4}>{isInv ? "Balance receivable" : "Balance payable"}</td><td className="n">{money(s.open)}</td></tr></tfoot>
    </table></div>}
    {s.open > 0.004 && onRecord && <div className="pay-cta"><Btn kind="pri" icon={Wallet} onClick={onRecord}>Record {isInv ? "a receipt" : "a payment"} · {money(s.open, false)}</Btn></div>}
  </section>;
}

/* Statement heading, as on a set of financial statements. */
const StatementHead = ({ title, sub }) => { const CO = useCo();
  return <div className="stmt-head"><b>{CO.name}</b><h3>{title}</h3><span>{sub}</span><small>All amounts in UAE dirhams (AED){CO.trn ? ` · TRN ${CO.trn}` : ""}</small></div>; };

/* ------------------------------------------------------------- exports */
const pdfSafe = (s) => String(s == null ? "" : s).replace(/−/g, "-").replace(/[▲▼▴▾●•]/g, "").replace(/[   ]/g, " ")
  .replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/…/g, "...").replace(/[ \t]+/g, " ").replace(/ *\n */g, "\n").trim();
function cellText(td) {
  if (td.dataset && td.dataset.x != null) return td.dataset.x;
  const c = td.cloneNode(true);
  c.querySelectorAll(".noexport,svg,.fin-go,.fin-i,.fin-cnt,.icon-btn,.th-d-hide").forEach((e) => e.remove());
  c.querySelectorAll(".th-d").forEach((e) => e.prepend("\n"));
  c.querySelectorAll("*").forEach((e) => e.append(" "));
  return (c.textContent || "").replace(/[ \t]+/g, " ").replace(/ *\n */g, "\n").trim();
}
function scrapeRich(root) {
  const out = [];
  if (!root) return out;
  root.querySelectorAll("table.tbl").forEach((t) => {
    if (t.closest(".noexport")) return;
    const head = [], rows = [], numCols = [];
    t.querySelectorAll("tr").forEach((tr) => {
      const sec = tr.parentElement && tr.parentElement.tagName, cells = [], tones = [];
      tr.querySelectorAll("th,td").forEach((td) => {
        const span = td.colSpan || 1;
        if (sec === "THEAD" && /\bn\b/.test(td.className)) numCols[cells.length] = true;
        const raw = pdfSafe(cellText(td)), txt = sec === "THEAD" ? raw : raw.replace(/\n/g, " ");
        cells.push(span > 1 ? { text: txt, span } : txt);
        tones.push(/\bup\b/.test(td.className) ? "up" : /\bdown\b/.test(td.className) ? "down" : "");
        for (let i = 1; i < span; i++) { cells.push(null); tones.push(""); }
      });
      const txt = cells.filter((c) => c != null).map((c) => (typeof c === "object" ? c.text : c));
      if (!txt.some((c) => c !== "")) return;
      if (sec === "THEAD") { head.push(cells.map((c) => (c && typeof c === "object" ? c.text : c || ""))); return; }
      const k = tr.className || "";
      const kind = /fin-cat/.test(k) ? "cat" : /fin-head/.test(k) ? "heading" : /fin-note/.test(k) ? "note" : /fin-total|\bgrand\b/.test(k) || sec === "TFOOT" ? "total"
        : /fin-sub|\bsub\b/.test(k) ? "subtotal" : /fin-sec|\bsec\b/.test(k) ? "section" : /fin-grp/.test(k) ? "group" : "row";
      rows.push({ cells, kind, depth: +(tr.style.getPropertyValue("--d") || 0), tones });
    });
    if (rows.length || head.length) out.push({ caption: t.getAttribute("aria-label") || t.dataset.caption || "", head, rows, numCols });
  });
  return out;
}
const isNumText = (s) => /^\(?[+-]?[\d,]*\d(\.\d+)?\)?$/.test(String(s || "").trim());
const isPctText = (s) => /^[<>]?[+-]?\d[\d,]*(\.\d+)?%$/.test(String(s || "").trim());
const xNum = (s) => { const t = String(s).trim(), neg = /^\(.*\)$/.test(t) || /^-/.test(t); const v = +t.replace(/[^\d.]/g, ""); return neg ? -v : v; };
const cssRgb = (name, fb) => { try { const el = document.querySelector(".mz") || document.body; const v = getComputedStyle(el).getPropertyValue(name).trim();
  const m = /^#([0-9a-f]{6})$/i.exec(v); if (m) return [0, 2, 4].map((i) => parseInt(m[1].slice(i, i + 2), 16));
  const r = /rgba?\(([^)]+)\)/.exec(v); if (r) return r[1].split(",").slice(0, 3).map((x) => +x); } catch (e) {} return fb; };

function exportPdfPro(title, meta, CO, tables, name) {
  const JS = window.jspdf && window.jspdf.jsPDF;
  if (!JS) { window.print(); return false; }
  const cols = Math.max(1, ...tables.map((t) => Math.max(t.head.length ? t.head[t.head.length - 1].length : 0, ...t.rows.map((r) => r.cells.length))));
  const doc = new JS({ orientation: cols > 6 ? "landscape" : "portrait", unit: "pt", format: "a4" });
  const W = doc.internal.pageSize.getWidth(), H = doc.internal.pageSize.getHeight(), M = 40;
  const BRAND = cssRgb("--pri-a", [37, 99, 235]), DARK = cssRgb("--sb-2", [17, 24, 39]), INK = [24, 29, 38], MUTE = [104, 112, 124];
  const tint = (c, f) => c.map((v) => Math.round(255 - (255 - v) * f));
  doc.setFillColor(...DARK); doc.rect(0, 0, W, 5, "F"); doc.setFillColor(...BRAND); doc.rect(0, 5, W, 1.6, "F");
  let y = 36, logoW = 0;
  if (CO.logo) { try { const p = doc.getImageProperties(CO.logo), h = 34, w = Math.min(130, (p.width / p.height) * h); doc.addImage(CO.logo, W - M - w, 22, w, h); logoW = w; } catch (e) {} }
  doc.setFont("helvetica", "bold"); doc.setFontSize(10); doc.setTextColor(...BRAND); doc.text(pdfSafe(CO.name || ""), M, y);
  doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.setTextColor(...MUTE);
  doc.text(pdfSafe([CO.trn ? `TRN ${CO.trn}` : "", addrText ? addrText(CO) : "", CO.emirate].filter(Boolean).join("  ·  ")).slice(0, 120), M, y + 12);
  doc.setFont("helvetica", "bold"); doc.setFontSize(18); doc.setTextColor(...INK); doc.text(pdfSafe(title), M, y + 38);
  doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(...MUTE); doc.text(doc.splitTextToSize(pdfSafe(meta), W - 2 * M - 150), M, y + 54);
  doc.setFontSize(8); doc.text(`Prepared ${dmy(TODAY)}`, W - M, y + 38, { align: "right" }); doc.text("Amounts in AED", W - M, y + 50, { align: "right" });
  doc.setDrawColor(...tint(DARK, 0.35)); doc.setLineWidth(0.8); doc.line(M, y + 66, W - M, y + 66);
  let startY = y + 82;
  tables.forEach((t, ti) => {
    if (t.caption && ti > 0) { if (startY > H - 120) { doc.addPage(); startY = 48; }
      doc.setFont("helvetica", "bold"); doc.setFontSize(10); doc.setTextColor(...BRAND); doc.text(pdfSafe(t.caption), M, startY); startY += 8; }
    const n = Math.max(t.head.length ? t.head[t.head.length - 1].length : 0, ...t.rows.map((r) => r.cells.length));
    const right = (i) => t.numCols[i] || t.rows.some((r) => { const c = r.cells[i]; return typeof c === "string" && (isNumText(c) || isPctText(c)); });
    const body = t.rows.map((r) => { const row = []; r.cells.forEach((c) => { if (c === null) return; row.push(typeof c === "object" ? { content: c.text, colSpan: c.span } : c); }); return row; });
    doc.autoTable({
      head: t.head.length ? t.head : undefined, body, startY, theme: "plain",
      margin: { left: M, right: M, top: 46, bottom: 50 },
      styles: { font: "helvetica", fontSize: n > 7 ? 7.4 : 8.4, cellPadding: { top: 4.2, bottom: 4.2, left: 6, right: 6 }, textColor: INK, overflow: "linebreak", valign: "middle" },
      headStyles: { fillColor: DARK, textColor: [255, 255, 255], fontStyle: "bold", fontSize: n > 7 ? 6.8 : 7.4, cellPadding: { top: 6, bottom: 6, left: 6, right: 6 } },
      columnStyles: { 0: { cellWidth: n > 4 ? (cols > 6 ? 190 : 170) : "auto" } },
      didParseCell: (h) => {
        const i = h.column.index;
        if (right(i) && i > 0) h.cell.styles.halign = "right";
        if (h.section !== "body") return;
        const r = t.rows[h.row.index]; if (!r) return;
        const st = h.cell.styles;
        if (r.kind === "cat" || r.kind === "heading") { st.fontStyle = "bold"; st.textColor = BRAND; st.fontSize = 7.2; st.cellPadding = { top: 10, bottom: 3, left: 6, right: 6 }; if (typeof h.cell.raw === "string" || h.cell.raw && h.cell.raw.content) h.cell.text = h.cell.text.map((x) => x.toUpperCase()); }
        else if (r.kind === "section") { st.fontStyle = "bold"; st.fillColor = [244, 246, 249]; }
        else if (r.kind === "group") { st.fontStyle = "bold"; }
        else if (r.kind === "subtotal") { st.fontStyle = "bold"; st.fillColor = tint(BRAND, 0.06); }
        else if (r.kind === "total") { st.fontStyle = "bold"; st.fillColor = tint(BRAND, 0.12); st.fontSize = (st.fontSize || 8.4) + 0.6; }
        else if (r.kind === "note") { st.fontStyle = "italic"; st.textColor = MUTE; }
        if (i === 0 && r.depth) st.cellPadding = { top: 4.2, bottom: 4.2, left: 6 + r.depth * 11, right: 6 };
        const tone = r.tones[i]; if (tone === "up") st.textColor = [18, 128, 74]; if (tone === "down") st.textColor = [196, 43, 43];
      },
      didDrawCell: (h) => {
        if (h.section !== "body") return; const r = t.rows[h.row.index]; if (!r) return; const c = h.cell;
        if (r.kind === "subtotal" || r.kind === "total") { doc.setDrawColor(...INK); doc.setLineWidth(r.kind === "total" ? 0.9 : 0.6); doc.line(c.x, c.y, c.x + c.width, c.y);
          if (r.kind === "total") { doc.setLineWidth(0.5); doc.line(c.x, c.y + c.height - 2.4, c.x + c.width, c.y + c.height - 2.4); doc.line(c.x, c.y + c.height, c.x + c.width, c.y + c.height); } }
        else if (r.kind !== "cat" && r.kind !== "heading") { doc.setDrawColor(232, 235, 240); doc.setLineWidth(0.4); doc.line(c.x, c.y + c.height, c.x + c.width, c.y + c.height); }
      },
    });
    startY = doc.lastAutoTable.finalY + 22;
  });
  const pages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    if (i > 1) { doc.setFillColor(...DARK); doc.rect(0, 0, W, 4, "F"); doc.setFont("helvetica", "bold"); doc.setFontSize(8); doc.setTextColor(...MUTE);
      doc.text(pdfSafe(`${CO.name} — ${title}`), M, 26); doc.setFont("helvetica", "normal"); doc.text(pdfSafe(meta).slice(0, 90), W - M, 26, { align: "right" }); }
    doc.setDrawColor(226, 229, 234); doc.setLineWidth(0.5); doc.line(M, H - 34, W - M, H - 34);
    doc.setFont("helvetica", "normal"); doc.setFontSize(7.5); doc.setTextColor(140, 147, 156);
    doc.text(pdfSafe(`${CO.name} · ${title} · prepared with InvoEez on ${dmy(TODAY)}`), M, H - 22);
    doc.text(`Page ${i} of ${pages}`, W - M, H - 22, { align: "right" });
  }
  return saveBlob(doc.output("blob"), name + ".pdf");
}

/* Excel with real formatting: numbers stay numbers (#,##0.00 with brackets), sections and totals styled. */
function exportExcelPro(title, meta, CO, tables, name) {
  const XF = [], key = {}, xf = (o) => { const k = JSON.stringify(o); if (key[k] == null) { key[k] = XF.length; XF.push(o); } return key[k]; };
  const base = { font: 0, fill: 0, border: 0, num: 0, h: "", indent: 0, wrap: false };
  const S = (o) => xf({ ...base, ...o });
  const rows = [], put = (cells) => rows.push(cells);
  put([{ v: title, s: S({ font: 2 }) }]); put([{ v: CO.name + (CO.trn ? `  ·  TRN ${CO.trn}` : ""), s: S({ font: 1 }) }]);
  put([{ v: meta, s: S({ font: 3 }) }]); put([{ v: `Prepared ${dmy(TODAY)} · amounts in AED`, s: S({ font: 3 }) }]); put([]);
  let freeze = 0, width = [];
  tables.forEach((t, ti) => {
    if (t.caption && ti > 0) put([{ v: t.caption, s: S({ font: 5 }) }]);
    t.head.forEach((h) => { if (!freeze && ti === 0) freeze = rows.length + 1; put(h.map((c, i) => ({ v: String(c || "").replace(/\n/g, " · "), s: S({ font: 4, fill: 2, h: i > 0 && t.numCols[i] ? "right" : "", wrap: true }) }))); });
    t.rows.forEach((r) => {
      const kind = r.kind, font = kind === "cat" || kind === "heading" ? 5 : kind === "note" ? 6 : ["section", "group", "subtotal", "total"].includes(kind) ? 1 : 0;
      const fill = kind === "section" ? 3 : kind === "subtotal" ? 4 : kind === "total" ? 5 : 0, border = kind === "subtotal" ? 2 : kind === "total" ? 3 : kind === "row" ? 1 : 0;
      const cells = []; r.cells.forEach((c, i) => {
        if (c === null) { cells.push(null); return; }
        const txt = typeof c === "object" ? c.text : c, tone = r.tones[i];
        const f = tone === "up" ? 7 : tone === "down" ? 8 : font;
        if (i > 0 && isNumText(txt)) cells.push({ v: xNum(txt), n: true, s: S({ font: f, fill, border, num: 164, h: "right" }) });
        else if (i > 0 && isPctText(txt) && !/[<>]/.test(txt)) cells.push({ v: xNum(txt.replace("%", "")) / 100, n: true, s: S({ font: f, fill, border, num: /^[+-]/.test(txt.trim()) ? 165 : 166, h: "right" }) });
        else if (i > 0 && /^[–—-]$/.test(txt.trim())) cells.push({ v: 0, n: true, s: S({ font, fill, border, num: 164, h: "right" }) });
        else cells.push({ v: kind === "cat" || kind === "heading" ? txt.toUpperCase() : txt, s: S({ font: f, fill, border, indent: i === 0 ? Math.min(6, r.depth) : 0, h: i > 0 && t.numCols[i] ? "right" : "" }) });
      });
      put(cells);
    });
    put([]);
  });
  rows.forEach((r) => r.forEach((c, i) => { if (!c) return; const l = String(c.n ? money(c.v, false) : c.v).length; width[i] = Math.max(width[i] || 10, Math.min(i === 0 ? 60 : 22, l + 3)); }));
  width[0] = Math.max(width[0] || 30, 34);
  const fonts = ['<font><sz val="10"/><name val="Calibri"/></font>', '<font><b/><sz val="10"/><name val="Calibri"/></font>', '<font><b/><sz val="15"/><color rgb="FF1E3A8A"/><name val="Calibri"/></font>',
    '<font><sz val="9"/><color rgb="FF6B7280"/><name val="Calibri"/></font>', '<font><b/><sz val="9"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font>', '<font><b/><sz val="9"/><color rgb="FF1D4ED8"/><name val="Calibri"/></font>',
    '<font><i/><sz val="9"/><color rgb="FF6B7280"/><name val="Calibri"/></font>', '<font><sz val="10"/><color rgb="FF12804A"/><name val="Calibri"/></font>', '<font><sz val="10"/><color rgb="FFC42B2B"/><name val="Calibri"/></font>'];
  const fill = (rgb) => `<fill><patternFill patternType="solid"><fgColor rgb="FF${rgb}"/><bgColor indexed="64"/></patternFill></fill>`;
  const fills = ['<fill><patternFill patternType="none"/></fill>', '<fill><patternFill patternType="gray125"/></fill>', fill("1F2937"), fill("F3F5F8"), fill("EEF3FD"), fill("E1EAFB")];
  const borders = ['<border><left/><right/><top/><bottom/><diagonal/></border>', '<border><left/><right/><top/><bottom style="hair"><color rgb="FFD6DAE0"/></bottom><diagonal/></border>',
    '<border><left/><right/><top style="thin"><color rgb="FF1F2937"/></top><bottom/><diagonal/></border>', '<border><left/><right/><top style="thin"><color rgb="FF1F2937"/></top><bottom style="double"><color rgb="FF1F2937"/></bottom><diagonal/></border>'];
  const xfs = XF.map((o) => `<xf numFmtId="${o.num}" fontId="${o.font}" fillId="${o.fill}" borderId="${o.border}" xfId="0"${o.num ? ' applyNumberFormat="1"' : ""} applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment${o.h ? ` horizontal="${o.h}"` : ""}${o.indent ? ` indent="${o.indent}"` : ""}${o.wrap ? ' wrapText="1"' : ""} vertical="center"/></xf>`);
  const styles = '<?xml version="1.0" encoding="UTF-8"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
    + '<numFmts count="3"><numFmt numFmtId="164" formatCode="#,##0.00;(#,##0.00);&quot;–&quot;"/><numFmt numFmtId="165" formatCode="+0.0%;-0.0%;0.0%"/><numFmt numFmtId="166" formatCode="0.0%"/></numFmts>'
    + `<fonts count="${fonts.length}">${fonts.join("")}</fonts><fills count="${fills.length}">${fills.join("")}</fills><borders count="${borders.length}">${borders.join("")}</borders>`
    + '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>'
    + `<cellXfs count="${xfs.length}">${xfs.join("")}</cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`;
  const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const colName = (i) => { let s = ""; i++; while (i) { const m = (i - 1) % 26; s = String.fromCharCode(65 + m) + s; i = Math.floor((i - 1) / 26); } return s; };
  let sd = "";
  rows.forEach((r, ri) => { sd += `<row r="${ri + 1}"${ri === 0 ? ' ht="22" customHeight="1"' : ""}>`; r.forEach((c, ci) => { if (!c) return; const ref = colName(ci) + (ri + 1);
    sd += c.n ? `<c r="${ref}" s="${c.s}"><v>${c.v}</v></c>` : `<c r="${ref}" s="${c.s}" t="inlineStr"><is><t xml:space="preserve">${esc(c.v)}</t></is></c>`; }); sd += "</row>"; });
  const sheet = '<?xml version="1.0" encoding="UTF-8"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
    + (freeze ? `<sheetViews><sheetView workbookViewId="0" showGridLines="0"><pane ySplit="${freeze}" topLeftCell="A${freeze + 1}" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>` : '<sheetViews><sheetView workbookViewId="0" showGridLines="0"/></sheetViews>')
    + `<cols>${width.map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w || 12}" customWidth="1"/>`).join("")}</cols><sheetData>${sd}</sheetData>`
    + '<pageMargins left="0.5" right="0.5" top="0.6" bottom="0.6" header="0.3" footer="0.3"/><pageSetup orientation="landscape" fitToWidth="1" fitToHeight="0"/></worksheet>';
  const sheetName = esc(title.replace(/[\\/?*[\]:]/g, " ").slice(0, 31));
  const files = [
    { name: "[Content_Types].xml", body: '<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>' },
    { name: "_rels/.rels", body: '<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>' },
    { name: "xl/workbook.xml", body: `<?xml version="1.0" encoding="UTF-8"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="${sheetName}" sheetId="1" r:id="rId1"/></sheets></workbook>` },
    { name: "xl/_rels/workbook.xml.rels", body: '<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>' },
    { name: "xl/styles.xml", body: styles },
    { name: "xl/worksheets/sheet1.xml", body: sheet },
  ];
  return saveBlob(new Blob([_zip(files)], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), name + ".xlsx");
}

const PRO_CSS = `
/* sidebar opens beside the page, never over it */
.sbar.folded.peek{margin-right:0!important}

/* statements read like statements */
.mz .rframe .tbl td.n,.mz .rframe .tbl th.n,.mz .fin-tbl td.n,.mz .pay-tbl td.n{font-family:var(--sans);font-variant-numeric:tabular-nums lining-nums;font-feature-settings:"tnum" 1,"lnum" 1;letter-spacing:-.005em}
.stmt-head{text-align:center;padding:22px 16px 14px;border-bottom:1px solid var(--line-2);margin:4px 24px 0}
.stmt-head b{display:block;font-size:13px;font-weight:650;color:var(--brand-600);letter-spacing:.02em}
.stmt-head h3{font-size:19px;font-weight:700;letter-spacing:-.02em;color:var(--ink);margin-top:3px}
.stmt-head span{display:block;font-size:12.5px;color:var(--ink-2);margin-top:3px}
.stmt-head small{display:block;font-size:11px;color:var(--ink-4);margin-top:3px}
.mz .tbl.fin-tbl{font-size:13px}
.mz .tbl.fin-tbl thead th{background:var(--surface);border-bottom:1.5px solid var(--ink-3);color:var(--ink-2);vertical-align:bottom}
.mz .tbl.fin-tbl thead th .th-d{color:var(--ink-4)}
.mz .tbl.fin-tbl tr.fin-sec td{background:color-mix(in srgb,var(--surface-2) 70%,var(--surface))}
.mz .tbl.fin-tbl tr.fin-acc td{color:var(--ink-2)}
.mz .tbl.fin-tbl tr.fin-sub td{background:transparent;border-top:1px solid var(--ink-3)}
.mz .tbl.fin-tbl tr.fin-total td{background:color-mix(in srgb,var(--brand-50) 70%,var(--surface));border-top:1.5px solid var(--ink-2);border-bottom:3px double var(--ink-2)}
.mz .tbl.fin-tbl td.cmp-prev,.mz .tbl.fin-tbl th.cmp-prev{background:color-mix(in srgb,var(--surface-2) 45%,transparent)}
.mz .rframe .acts .btn{height:34px}
.exp-group{display:inline-flex;border:1px solid var(--line);border-radius:10px;overflow:hidden;background:var(--surface);box-shadow:var(--sh-1)}
.mz .exp-group .btn{border:0;border-radius:0;box-shadow:none;background:transparent}
.mz .exp-group .btn+.btn{border-left:1px solid var(--line)}
.mz .exp-group .btn:hover{background:var(--brand-50);color:var(--brand-600)}
.sbar.folded{transition:width .2s var(--ease),flex-basis .2s var(--ease)}
.sbar.folded.peek{box-shadow:inset -1px 0 0 rgba(255,255,255,.06),8px 0 24px rgba(8,12,24,.18)}

/* payments on a document */
.pay-panel{border:1px solid var(--line);border-radius:16px;background:var(--surface);padding:16px 18px 14px;box-shadow:var(--sh-1)}
.pay-panel header{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;flex-wrap:wrap}
.pay-panel h3{font-size:15px;font-weight:650;color:var(--ink)}
.pay-panel header p{font-size:12px;color:var(--ink-3);margin-top:2px}
.pay-state{display:inline-flex;align-items:center;height:26px;padding:0 11px;border-radius:20px;font-size:12px;font-weight:650}
.pay-state.ok{background:var(--pos-50);color:var(--pos)}.pay-state.warn{background:var(--warn-50);color:var(--warn)}.pay-state.bad{background:var(--neg-50);color:var(--neg)}
.pay-figs{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin-top:14px}
.pay-figs>div{padding:10px 12px;border-radius:12px;background:var(--surface-2);border:1px solid var(--line-2)}
.pay-figs span{display:block;font-size:11px;font-weight:600;letter-spacing:.04em;text-transform:uppercase;color:var(--ink-3)}
.pay-figs b{display:block;font-size:19px;font-weight:700;letter-spacing:-.02em;color:var(--ink);margin-top:3px;font-variant-numeric:tabular-nums}
.pay-figs .paid b{color:var(--pos)}
.pay-figs .due.warn{background:var(--warn-50);border-color:color-mix(in srgb,var(--warn) 25%,transparent)}.pay-figs .due.warn b{color:var(--warn)}
.pay-figs .due.bad{background:var(--neg-50);border-color:color-mix(in srgb,var(--neg) 25%,transparent)}.pay-figs .due.bad b{color:var(--neg)}
.pay-figs .due.ok b{color:var(--pos)}
.pay-bar{height:8px;border-radius:6px;background:var(--surface-3);overflow:hidden;margin:12px 0 4px}
.pay-bar i{display:block;height:100%;border-radius:6px;background:linear-gradient(90deg,var(--pos),color-mix(in srgb,var(--pos) 60%,var(--s1)));transform-origin:0 50%;animation:barGrowX .8s var(--ease) both}
.pay-tbl{margin-top:10px}
.mz .tbl.pay-tbl tfoot td{font-weight:650}
.mz .tbl.pay-tbl tr.pay-open td{color:var(--ink);font-weight:700;background:var(--brand-50)}
.pay-kind{display:inline-flex;align-items:center;height:22px;padding:0 9px;border-radius:20px;font-size:11.5px;font-weight:600;background:var(--surface-3);color:var(--ink-2)}
.pay-kind.payment{background:var(--pos-50);color:var(--pos)}.pay-kind.credit{background:var(--brand-50);color:var(--brand-600)}.pay-kind.pdc{background:var(--warn-50);color:var(--warn)}
.pay-cta{display:flex;justify-content:flex-end;margin-top:10px}
.sumrow.paid .v{color:var(--pos)}
.sumrow.balance{margin-top:6px;padding:9px 10px;border-radius:10px;background:var(--brand-50)}
.sumrow.balance .k,.sumrow.balance .v{font-weight:700;color:var(--ink)}
.sumrow.balance.zero{background:var(--pos-50)}.sumrow.balance.zero .v{color:var(--pos)}
.totbox .sumrow.paid .v{color:#12804A}.totbox .baldue{display:flex;justify-content:space-between;margin-top:8px;padding:9px 12px;border-radius:8px;background:#F1F4F9;font-weight:700;color:#16191D}
@media (max-width:700px){.pay-figs{grid-template-columns:minmax(0,1fr)}.stmt-head{margin:4px 12px 0}}
@media print{.pay-cta{display:none}}
`;
