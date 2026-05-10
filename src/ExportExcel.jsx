import { useState, useEffect } from "react"
import { supabase } from "./supabase"
import ExcelJS from "exceljs"
import Modal from "./Modal"
import { formatDate } from "./dateUtils"

// ─── Palette ────────────────────────────────────────────────────────────────
const C_HEADER_BG = "FF4D7C0F"  // vert olive foncé
const C_HEADER_FG = "FFFFFFFF"  // blanc
const C_TOTAL_BG  = "FFFEF9C3"  // jaune pâle
const C_ROW_ALT   = "FFF0FDF4"  // vert très clair (lignes paires)
const C_BORDER    = "FFD1D5DB"  // gris clair

function border() {
  const s = { style: "thin", color: { argb: C_BORDER } }
  return { top: s, left: s, bottom: s, right: s }
}

function applyHeaderStyle(row) {
  row.height = 24
  row.eachCell((cell) => {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: C_HEADER_BG } }
    cell.font  = { bold: true, color: { argb: C_HEADER_FG }, size: 10 }
    cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true }
    cell.border = border()
  })
}

function applyDataStyle(row, idx) {
  const bg = idx % 2 === 0 ? "FFFFFFFF" : C_ROW_ALT
  row.eachCell({ includeEmpty: true }, (cell) => {
    cell.fill   = { type: "pattern", pattern: "solid", fgColor: { argb: bg } }
    cell.border = border()
    cell.font   = { size: 10 }
  })
}

function applyTotalStyle(row) {
  row.eachCell({ includeEmpty: true }, (cell) => {
    cell.fill   = { type: "pattern", pattern: "solid", fgColor: { argb: C_TOTAL_BG } }
    cell.font   = { bold: true, size: 10 }
    cell.border = border()
  })
}

function freezeAndFilter(ws, colCount) {
  const lastCol = ws.getColumn(colCount).letter
  ws.autoFilter = `A1:${lastCol}1`
  ws.views = [{ state: "frozen", ySplit: 1 }]
}

async function downloadWorkbook(wb, fileName) {
  const buffer = await wb.xlsx.writeBuffer()
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = fileName
  a.click()
  URL.revokeObjectURL(url)
}

function labelTypeCharge(type) {
  const labels = { main_oeuvre: "Main d'œuvre", repas: "Repas", essence: "Essence", don: "Dons", vehicule: "Autres charges véhicules", equipement: "Équipements" }
  return labels[type] ?? type ?? "-"
}

// ─── Export campagne unique ──────────────────────────────────────────────────
async function exportSingle(campId) {
  const [
    { data: campagne },
    { data: recoltes },
    { data: ventes },
    { data: parcelles },
    { data: charges },
  ] = await Promise.all([
    supabase.from("campagne").select("*").eq("id", campId).single(),
    supabase.from("recolte_journaliere").select("*").eq("campagne_id", campId).order("date"),
    supabase.from("vente").select("*").eq("campagne_id", campId).order("date"),
    supabase.from("parcelles").select("*").order("nom"),
    supabase.from("charge").select("*").eq("campagne_id", campId).order("date"),
  ])

  const parcellesMap = new Map(parcelles.map(p => [p.id, p.nom]))
  const recoltesMap  = new Map(recoltes.map(r => [r.id, r]))

  const totalRecolteKg = recoltes.reduce((s, r) => s + (r.quantite_kg || 0), 0)
  const totalCA        = ventes.reduce((s, v) => s + (v.montant_total_dt || 0), 0)
  const totalCharges   = charges.reduce((s, c) => s + (c.montant_dt || 0), 0)

  const wb = new ExcelJS.Workbook()
  wb.creator = "Olive App"
  wb.created = new Date()

  // ── 1. Récapitulatif ──────────────────────────────────────────────────────
  const wsRecap = wb.addWorksheet("Récapitulatif")
  wsRecap.columns = [
    { key: "label", width: 32 },
    { key: "value", width: 22 },
  ]

  const recapRows = [
    ["Récapitulatif", `Campagne ${campagne.annee}`],
    [""],
    ["Statut", campagne.statut ?? "-"],
    [""],
    ["Quantité totale récoltée", `${totalRecolteKg.toFixed(2)} kg`],
    ["Chiffre d'affaires total", `${totalCA.toFixed(3)} DT`],
    ["Charges totales", `${totalCharges.toFixed(3)} DT`],
    ["Bénéfice net", `${(totalCA - totalCharges).toFixed(3)} DT`],
  ]

  recapRows.forEach((r, i) => {
    const row = wsRecap.addRow(r)
    if (i === 0) {
      row.height = 24
      row.eachCell((cell) => {
        cell.fill  = { type: "pattern", pattern: "solid", fgColor: { argb: C_HEADER_BG } }
        cell.font  = { bold: true, color: { argb: C_HEADER_FG }, size: 12 }
        cell.border = border()
      })
    } else if (r[0] && r[1]) {
      row.getCell(1).font = { bold: true, size: 10 }
      row.getCell(2).font = { size: 10 }
      row.eachCell((cell) => { cell.border = border() })
    }
  })

  // ── 2. Récoltes ───────────────────────────────────────────────────────────
  const wsRecoltes = wb.addWorksheet("Récoltes")
  wsRecoltes.columns = [
    { header: "Date",             key: "date",        width: 13 },
    { header: "Parcelle",         key: "parcelle",    width: 22 },
    { header: "Type d'olive",     key: "type",        width: 14 },
    { header: "Quantité (kg)",    key: "quantite",    width: 14, style: { numFmt: "#,##0.00" } },
    { header: "Nb sachets",       key: "sachets",     width: 11 },
    { header: "Destination",      key: "destination", width: 14 },
    { header: "Statut vente",     key: "statut",      width: 13 },
  ]
  applyHeaderStyle(wsRecoltes.getRow(1))

  recoltes.forEach((r, i) => {
    const row = wsRecoltes.addRow([
      formatDate(r.date),
      parcellesMap.get(r.parcelle_id) || "-",
      r.type_olive === "hay" ? "Hay" : "Nchrira",
      r.quantite_kg,
      r.nb_sachets || "",
      r.destination === "vente_brut" ? "Vente brute" : r.destination === "huile_perso" ? "Huile - Perso" : "Huile - Vendue",
      r.est_vendu ? "Vendu" : "Disponible",
    ])
    applyDataStyle(row, i)
  })

  const lastRec = recoltes.length + 1
  const totalRowR = wsRecoltes.addRow(["Total", "", "", { formula: `SUM(D2:D${lastRec})` }, "", "", ""])
  applyTotalStyle(totalRowR)
  totalRowR.getCell(4).numFmt = "#,##0.00"
  freezeAndFilter(wsRecoltes, 7)

  // ── 3. Ventes ─────────────────────────────────────────────────────────────
  const wsVentes = wb.addWorksheet("Ventes")
  wsVentes.columns = [
    { header: "Date",              key: "date",     width: 13 },
    { header: "Parcelle",          key: "parcelle", width: 22 },
    { header: "Type d'olive",      key: "type",     width: 14 },
    { header: "Quantité (kg)",     key: "quantite", width: 14, style: { numFmt: "#,##0.00" } },
    { header: "Prix/kg (DT)",      key: "prix",     width: 13, style: { numFmt: "#,##0.000" } },
    { header: "Montant total (DT)", key: "montant", width: 16, style: { numFmt: "#,##0.000" } },
    { header: "Acheteur",          key: "acheteur", width: 18 },
  ]
  applyHeaderStyle(wsVentes.getRow(1))

  ventes.forEach((v, i) => {
    const rec = recoltesMap.get(v.recolte_id)
    const row = wsVentes.addRow([
      formatDate(v.date),
      rec ? parcellesMap.get(rec.parcelle_id) || "-" : "-",
      rec ? (rec.type_olive === "hay" ? "Hay" : "Nchrira") : "-",
      v.quantite_kg,
      v.prix_kg_dt,
      v.montant_total_dt,
      v.acheteur || "-",
    ])
    applyDataStyle(row, i)
  })

  const lastVente = ventes.length + 1
  const totalRowV = wsVentes.addRow([
    "Total", "", "",
    { formula: `SUM(D2:D${lastVente})` }, "",
    { formula: `SUM(F2:F${lastVente})` }, "",
  ])
  applyTotalStyle(totalRowV)
  totalRowV.getCell(4).numFmt = "#,##0.00"
  totalRowV.getCell(6).numFmt = "#,##0.000"
  freezeAndFilter(wsVentes, 7)

  // ── 4. Parcelles ──────────────────────────────────────────────────────────
  const parcelleStats = new Map()
  recoltes.forEach(r => {
    const nom = parcellesMap.get(r.parcelle_id) || "Inconnue"
    const p = parcelleStats.get(nom) || { quantite: 0, nbRecoltes: 0 }
    parcelleStats.set(nom, { quantite: p.quantite + (r.quantite_kg || 0), nbRecoltes: p.nbRecoltes + 1 })
  })

  const wsParcelles = wb.addWorksheet("Parcelles")
  wsParcelles.columns = [
    { header: "Parcelle",           key: "parcelle",   width: 24 },
    { header: "Quantité totale (kg)", key: "quantite", width: 20, style: { numFmt: "#,##0.00" } },
    { header: "Nb récoltes",        key: "nb",         width: 14 },
  ]
  applyHeaderStyle(wsParcelles.getRow(1))
  let pIdx = 0
  for (const [nom, stat] of parcelleStats) {
    const row = wsParcelles.addRow([nom, stat.quantite, stat.nbRecoltes])
    applyDataStyle(row, pIdx++)
  }
  const lastParc = pIdx + 1
  const totalRowP = wsParcelles.addRow([
    "Total",
    { formula: `SUM(B2:B${lastParc})` },
    { formula: `SUM(C2:C${lastParc})` },
  ])
  applyTotalStyle(totalRowP)
  totalRowP.getCell(2).numFmt = "#,##0.00"
  freezeAndFilter(wsParcelles, 3)

  // ── 5. Charges ────────────────────────────────────────────────────────────
  const wsCharges = wb.addWorksheet("Charges")
  wsCharges.columns = [
    { header: "Date",            key: "date",    width: 13 },
    { header: "Type de charge",  key: "type",    width: 18 },
    { header: "Montant (DT)",    key: "montant", width: 14, style: { numFmt: "#,##0.000" } },
    { header: "Nb ouvriers",     key: "nb",      width: 12 },
    { header: "Description",     key: "desc",    width: 24 },
    { header: "Bénéficiaire",    key: "benef",   width: 18 },
  ]
  applyHeaderStyle(wsCharges.getRow(1))
  charges.forEach((c, i) => {
    const row = wsCharges.addRow([
      formatDate(c.date),
      labelTypeCharge(c.type_charge),
      c.montant_dt,
      c.nb_ouvriers || "",
      c.description || "",
      c.beneficiaire || "",
    ])
    applyDataStyle(row, i)
  })
  const lastCharge = charges.length + 1
  const totalRowC = wsCharges.addRow(["Total", "", { formula: `SUM(C2:C${lastCharge})` }, "", "", ""])
  applyTotalStyle(totalRowC)
  totalRowC.getCell(3).numFmt = "#,##0.000"
  freezeAndFilter(wsCharges, 6)

  await downloadWorkbook(wb, `Campagne_${campagne.annee}_Export.xlsx`)
}

// ─── Export toutes campagnes ─────────────────────────────────────────────────
async function exportAll() {
  const [
    { data: campagnes },
    { data: recoltes },
    { data: ventes },
    { data: parcelles },
    { data: charges },
  ] = await Promise.all([
    supabase.from("campagne").select("*").order("annee"),
    supabase.from("recolte_journaliere").select("*").order("date"),
    supabase.from("vente").select("*").order("date"),
    supabase.from("parcelles").select("*").order("nom"),
    supabase.from("charge").select("*").order("date"),
  ])

  const campagneMap  = new Map(campagnes.map(c => [c.id, c.annee]))
  const parcellesMap = new Map(parcelles.map(p => [p.id, p.nom]))
  const recoltesMap  = new Map(recoltes.map(r => [r.id, r]))

  const wb = new ExcelJS.Workbook()
  wb.creator = "Olive App"
  wb.created = new Date()

  // ── 1. Récap Global ───────────────────────────────────────────────────────
  const wsRecap = wb.addWorksheet("Récap Global")
  wsRecap.columns = [
    { header: "Campagne",       key: "camp",     width: 12 },
    { header: "Récolte (kg)",   key: "recolte",  width: 14, style: { numFmt: "#,##0.00" } },
    { header: "CA (DT)",        key: "ca",       width: 14, style: { numFmt: "#,##0.000" } },
    { header: "Charges (DT)",   key: "charges",  width: 14, style: { numFmt: "#,##0.000" } },
    { header: "Bénéfice (DT)",  key: "benef",    width: 14, style: { numFmt: "#,##0.000" } },
  ]
  applyHeaderStyle(wsRecap.getRow(1))

  campagnes.forEach((camp, i) => {
    const tRecolte  = recoltes.filter(r => r.campagne_id === camp.id).reduce((s, r) => s + (r.quantite_kg || 0), 0)
    const tCA       = ventes.filter(v => v.campagne_id === camp.id).reduce((s, v) => s + (v.montant_total_dt || 0), 0)
    const tCharges  = charges.filter(c => c.campagne_id === camp.id).reduce((s, c) => s + (c.montant_dt || 0), 0)
    const row = wsRecap.addRow([camp.annee, tRecolte, tCA, tCharges, tCA - tCharges])
    applyDataStyle(row, i)
  })

  const lastCamp = campagnes.length + 1
  const totalRow = wsRecap.addRow([
    "TOTAL",
    { formula: `SUM(B2:B${lastCamp})` },
    { formula: `SUM(C2:C${lastCamp})` },
    { formula: `SUM(D2:D${lastCamp})` },
    { formula: `SUM(E2:E${lastCamp})` },
  ])
  applyTotalStyle(totalRow)
  ;["B", "C", "D", "E"].forEach((col, i) => {
    totalRow.getCell(i + 2).numFmt = i === 0 ? "#,##0.00" : "#,##0.000"
  })
  freezeAndFilter(wsRecap, 5)

  // ── 2. Récoltes ───────────────────────────────────────────────────────────
  const wsRecoltes = wb.addWorksheet("Récoltes")
  wsRecoltes.columns = [
    { header: "Campagne",        key: "camp",        width: 12 },
    { header: "Date",            key: "date",        width: 13 },
    { header: "Parcelle",        key: "parcelle",    width: 22 },
    { header: "Type d'olive",    key: "type",        width: 14 },
    { header: "Quantité (kg)",   key: "quantite",    width: 14, style: { numFmt: "#,##0.00" } },
    { header: "Nb sachets",      key: "sachets",     width: 11 },
    { header: "Destination",     key: "destination", width: 14 },
    { header: "Statut vente",    key: "statut",      width: 13 },
  ]
  applyHeaderStyle(wsRecoltes.getRow(1))
  recoltes.forEach((r, i) => {
    const row = wsRecoltes.addRow([
      campagneMap.get(r.campagne_id) || "-",
      formatDate(r.date),
      parcellesMap.get(r.parcelle_id) || "-",
      r.type_olive === "hay" ? "Hay" : "Nchrira",
      r.quantite_kg,
      r.nb_sachets || "",
      r.destination === "vente_brut" ? "Vente brute" : r.destination === "huile_perso" ? "Huile - Perso" : "Huile - Vendue",
      r.est_vendu ? "Vendu" : "Disponible",
    ])
    applyDataStyle(row, i)
  })
  const lastRecA = recoltes.length + 1
  const totalRA = wsRecoltes.addRow(["Total", "", "", "", { formula: `SUM(E2:E${lastRecA})` }, "", "", ""])
  applyTotalStyle(totalRA)
  totalRA.getCell(5).numFmt = "#,##0.00"
  freezeAndFilter(wsRecoltes, 8)

  // ── 3. Ventes ─────────────────────────────────────────────────────────────
  const wsVentes = wb.addWorksheet("Ventes")
  wsVentes.columns = [
    { header: "Campagne",          key: "camp",     width: 12 },
    { header: "Date",              key: "date",     width: 13 },
    { header: "Parcelle",          key: "parcelle", width: 22 },
    { header: "Type d'olive",      key: "type",     width: 14 },
    { header: "Quantité (kg)",     key: "quantite", width: 14, style: { numFmt: "#,##0.00" } },
    { header: "Prix/kg (DT)",      key: "prix",     width: 13, style: { numFmt: "#,##0.000" } },
    { header: "Montant total (DT)", key: "montant", width: 16, style: { numFmt: "#,##0.000" } },
    { header: "Acheteur",          key: "acheteur", width: 18 },
  ]
  applyHeaderStyle(wsVentes.getRow(1))
  ventes.forEach((v, i) => {
    const rec = recoltesMap.get(v.recolte_id)
    const row = wsVentes.addRow([
      campagneMap.get(v.campagne_id) || "-",
      formatDate(v.date),
      rec ? parcellesMap.get(rec.parcelle_id) || "-" : "-",
      rec ? (rec.type_olive === "hay" ? "Hay" : "Nchrira") : "-",
      v.quantite_kg,
      v.prix_kg_dt,
      v.montant_total_dt,
      v.acheteur || "-",
    ])
    applyDataStyle(row, i)
  })
  const lastVA = ventes.length + 1
  const totalVA = wsVentes.addRow(["Total", "", "", "",
    { formula: `SUM(E2:E${lastVA})` }, "",
    { formula: `SUM(G2:G${lastVA})` }, "",
  ])
  applyTotalStyle(totalVA)
  totalVA.getCell(5).numFmt = "#,##0.00"
  totalVA.getCell(7).numFmt = "#,##0.000"
  freezeAndFilter(wsVentes, 8)

  // ── 4. Parcelles ──────────────────────────────────────────────────────────
  const wsParcelles = wb.addWorksheet("Parcelles")
  wsParcelles.columns = [
    { header: "Campagne",             key: "camp",     width: 12 },
    { header: "Parcelle",             key: "parcelle", width: 24 },
    { header: "Quantité totale (kg)", key: "quantite", width: 20, style: { numFmt: "#,##0.00" } },
    { header: "Nb récoltes",          key: "nb",       width: 14 },
  ]
  applyHeaderStyle(wsParcelles.getRow(1))
  const statMap = new Map()
  recoltes.forEach(r => {
    const key = `${r.campagne_id}|${r.parcelle_id}`
    const prev = statMap.get(key) || { campagneId: r.campagne_id, parcelleId: r.parcelle_id, quantite: 0, nb: 0 }
    statMap.set(key, { ...prev, quantite: prev.quantite + (r.quantite_kg || 0), nb: prev.nb + 1 })
  })
  let sIdx = 0
  for (const stat of statMap.values()) {
    const row = wsParcelles.addRow([
      campagneMap.get(stat.campagneId) || "-",
      parcellesMap.get(stat.parcelleId) || "Inconnue",
      stat.quantite,
      stat.nb,
    ])
    applyDataStyle(row, sIdx++)
  }
  const lastParcA = sIdx + 1
  const totalPA = wsParcelles.addRow([
    "Total", "",
    { formula: `SUM(C2:C${lastParcA})` },
    { formula: `SUM(D2:D${lastParcA})` },
  ])
  applyTotalStyle(totalPA)
  totalPA.getCell(3).numFmt = "#,##0.00"
  freezeAndFilter(wsParcelles, 4)

  // ── 5. Charges ────────────────────────────────────────────────────────────
  const wsCharges = wb.addWorksheet("Charges")
  wsCharges.columns = [
    { header: "Campagne",       key: "camp",    width: 12 },
    { header: "Date",           key: "date",    width: 13 },
    { header: "Type de charge", key: "type",    width: 18 },
    { header: "Montant (DT)",   key: "montant", width: 14, style: { numFmt: "#,##0.000" } },
    { header: "Nb ouvriers",    key: "nb",      width: 12 },
    { header: "Description",    key: "desc",    width: 24 },
    { header: "Bénéficiaire",   key: "benef",   width: 18 },
  ]
  applyHeaderStyle(wsCharges.getRow(1))
  charges.forEach((c, i) => {
    const row = wsCharges.addRow([
      campagneMap.get(c.campagne_id) || "-",
      formatDate(c.date),
      labelTypeCharge(c.type_charge),
      c.montant_dt,
      c.nb_ouvriers || "",
      c.description || "",
      c.beneficiaire || "",
    ])
    applyDataStyle(row, i)
  })
  const lastCA = charges.length + 1
  const totalCA2 = wsCharges.addRow(["Total", "", "", { formula: `SUM(D2:D${lastCA})` }, "", "", ""])
  applyTotalStyle(totalCA2)
  totalCA2.getCell(4).numFmt = "#,##0.000"
  freezeAndFilter(wsCharges, 7)

  await downloadWorkbook(wb, "Olive_App_Toutes_Campagnes.xlsx")
}

// ─── Composant ───────────────────────────────────────────────────────────────
function ExportExcel() {
  const [campagnes, setCampagnes] = useState([])
  const [campagneSelectId, setCampagneSelectId] = useState("all")
  const [isExporting, setIsExporting] = useState(false)
  const [message, setMessage] = useState(null)
  const [modalOuvert, setModalOuvert] = useState(false)

  useEffect(() => {
    async function loadCampagnes() {
      const { data } = await supabase
        .from("campagne")
        .select("id, annee")
        .order("annee", { ascending: false })
      setCampagnes(data || [])
    }
    loadCampagnes()
  }, [])

  useEffect(() => {
    if (!message) return
    const timer = setTimeout(() => setMessage(null), 5000)
    return () => clearTimeout(timer)
  }, [message])

  function ouvrirModal() {
    setCampagneSelectId("all")
    setMessage(null)
    setModalOuvert(true)
  }

  async function handleExport() {
    setIsExporting(true)
    setMessage(null)
    try {
      if (campagneSelectId === "all") {
        await exportAll()
      } else {
        await exportSingle(campagneSelectId)
      }
      setMessage({ type: "success", text: "Fichier téléchargé avec succès !" })
    } catch (err) {
      console.error("Erreur export Excel:", err)
      setMessage({ type: "error", text: "Erreur lors de l'export" })
    } finally {
      setIsExporting(false)
    }
  }

  async function handleExportEtFermer() {
    await handleExport()
    setModalOuvert(false)
  }

  const campagneLabel = campagneSelectId === "all"
    ? "Toutes les campagnes"
    : `Campagne ${campagnes.find(c => String(c.id) === campagneSelectId)?.annee ?? ""}`

  return (
    <>
      <button
        type="button"
        onClick={ouvrirModal}
        className="inline-flex items-center gap-1.5 rounded-md bg-green-600 px-3 py-1.5 text-sm font-medium text-white shadow-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
      >
        📥 Exporter Excel
      </button>

      <Modal
        isOpen={modalOuvert}
        onClose={() => { if (!isExporting) setModalOuvert(false) }}
        title="Exporter en Excel"
        size="medium"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Campagne à exporter
            </label>
            <select
              value={campagneSelectId}
              onChange={(e) => setCampagneSelectId(e.target.value)}
              disabled={isExporting}
              className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-olive-500 focus:ring-olive-500 disabled:opacity-50"
            >
              <option value="all">Toutes les campagnes</option>
              {campagnes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.annee}
                </option>
              ))}
            </select>
            <p className="mt-1.5 text-xs text-gray-500">
              {campagneSelectId === "all"
                ? "Génère un fichier avec toutes les campagnes et un récapitulatif global comparatif."
                : `Génère un fichier pour la campagne ${campagnes.find(c => String(c.id) === campagneSelectId)?.annee ?? ""} uniquement.`}
            </p>
          </div>

          {/* Aperçu du contenu */}
          <div className="rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-600 space-y-0.5">
            <p className="font-medium text-gray-700 mb-1">Onglets inclus :</p>
            {campagneSelectId === "all" ? (
              <>
                <p>📊 Récap Global — comparatif toutes années</p>
                <p>🫒 Récoltes — toutes campagnes avec totaux</p>
                <p>💰 Ventes — toutes campagnes avec totaux</p>
                <p>🌿 Parcelles — stats par campagne et parcelle</p>
                <p>📉 Charges — toutes campagnes avec totaux</p>
              </>
            ) : (
              <>
                <p>📊 Récapitulatif — KPIs de la campagne</p>
                <p>🫒 Récoltes — détail avec totaux</p>
                <p>💰 Ventes — détail avec totaux</p>
                <p>🌿 Parcelles — stats par parcelle</p>
                <p>📉 Charges — détail avec totaux</p>
              </>
            )}
          </div>

          {message && (
            <p className={`text-sm ${message.type === "success" ? "text-green-700" : "text-red-600"}`}>
              {message.text}
            </p>
          )}

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setModalOuvert(false)}
              disabled={isExporting}
              className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 disabled:opacity-50"
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={handleExportEtFermer}
              disabled={isExporting}
              className="inline-flex items-center gap-2 rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isExporting ? "Génération en cours..." : `📥 Exporter — ${campagneLabel}`}
            </button>
          </div>
        </div>
      </Modal>
    </>
  )
}

export default ExportExcel
