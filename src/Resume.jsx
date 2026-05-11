import { useState, useEffect, useMemo } from "react"
import { supabase } from "./supabase"
import Spinner from "./Spinner"
import Modal from "./Modal"
import ExportExcel from "./ExportExcel"

function Resume({ onNavigateTracteur }) {
  const [kpi, setKpi] = useState({
    ca: 0,
    coutMo: 0,
    autresCharges: 0,
    chargesTotales: 0,
    marge: 0,
    totalKg: 0,
    nbVentes: 0,
    totalLitresPerso: 0,
    nbJoursRecolte: 0,
    nbTracteurs: 0,
    chargesParType: {
      recolte: 0,
      equipement: 0,
      don: 0,
      transformation_huile: 0,
    },
    recolteParType: [],
    recolteParParcelle: [],
    recolteParAnnee: [],
    recolteParAnneeParParcelleType: [],
    caParParcelle: [],
    caParCampagne: [],
    margeParCampagne: [],
    margeParParcelle: [],
    ventesParParcelle: [],
    joursParCampagne: [],
    joursParParcelle: [],
    huilePersoParCampagne: [],
    huilePersoParParcelle: [],
    chargesParCampagne: [],
  })

  const [equipements, setEquipements] = useState([])

  const [campagnes, setCampagnes] = useState([])
  const [campagneFiltreId, setCampagneFiltreId] = useState("all")

  const [loading, setLoading] = useState(true)
  const [kpiActif, setKpiActif] = useState(null)
  const [detailQuantiteVue, setDetailQuantiteVue] = useState("annee")
  const [detailCaVue, setDetailCaVue] = useState("annee")
  const [detailMargeVue, setDetailMargeVue] = useState("annee")
  const [detailHuilePersoVue, setDetailHuilePersoVue] = useState("annee")
  const [detailChargesVue, setDetailChargesVue] = useState("campagne")

  useEffect(() => {
    async function loadCampagnes() {
      const { data, error } = await supabase
        .from("campagne")
        .select("id, annee, statut")
        .order("annee", { ascending: true })

      if (!error && data) {
        setCampagnes(data)
      }
    }
    loadCampagnes()
  }, [])

  useEffect(() => {
    async function loadKpi() {
      setLoading(true)

      let ventesQuery = supabase
        .from("vente")
        .select("id, recolte_id, montant_total_dt, campagne_id")

      let recoltesQuery = supabase
        .from("recolte_journaliere")
        .select(
          "id, quantite_kg, parcelle_id, type_olive, campagne_id, date, destination, quantite_litres"
        )

      let chargesQuery = supabase
        .from("charge")
        .select("montant_dt, type_charge, sous_type, campagne_id")

      let autresRevenusQuery = supabase
        .from("autre_revenu")
        .select("montant_dt, type_revenu, campagne_id")

      if (campagneFiltreId !== "all") {
        ventesQuery = ventesQuery.eq("campagne_id", campagneFiltreId)
        recoltesQuery = recoltesQuery.eq(
          "campagne_id",
          campagneFiltreId
        )
        chargesQuery = chargesQuery.eq("campagne_id", campagneFiltreId)
        autresRevenusQuery = autresRevenusQuery.eq("campagne_id", campagneFiltreId)
      }

      const [
        { data: ventes = [] },
        { data: recoltes = [] },
        { data: parcelles = [] },
        { data: campagnesData = [] },
        { data: charges = [] },
        { data: autresRevenus = [] },
        { data: equipementsData = [] },
      ] = await Promise.all([
        ventesQuery,
        recoltesQuery,
        supabase.from("parcelles").select("id, nom"),
        supabase.from("campagne").select("id, annee"),
        chargesQuery,
        autresRevenusQuery,
        supabase.from("equipements").select("id, nom, type, prix_achat").ilike("type", "%tracteur%").order("created_at", { ascending: true }),
      ])

      setEquipements(equipementsData)

      const caVentes = ventes.reduce(
        (sum, v) => sum + (parseFloat(v.montant_total_dt) || 0),
        0
      )
      const caAutresRevenus = autresRevenus.reduce(
        (sum, r) => sum + (parseFloat(r.montant_dt) || 0),
        0
      )
      const ca = caVentes + caAutresRevenus

      const totalKg = recoltes.reduce(
        (sum, r) => sum + (parseFloat(r.quantite_kg) || 0),
        0
      )

      const chargesParType = {
        recolte: 0,
        equipement: 0,
        don: 0,
        transformation_huile: 0,
      }

      for (const ch of charges) {
        const montant = parseFloat(ch.montant_dt) || 0
        const type = ch.type_charge
        if (!montant || !type) continue
        if (type in chargesParType) {
          chargesParType[type] += montant
        }
      }

      const coutMo = chargesParType.recolte
      const autresCharges =
        chargesParType.equipement +
        chargesParType.don +
        chargesParType.transformation_huile

      const chargesTotales = charges.reduce(
        (sum, ch) => sum + (parseFloat(ch.montant_dt) || 0),
        0
      )
      const marge = ca - chargesTotales

      const parcelleMap = new Map(parcelles.map((p) => [String(p.id), p.nom]))
      const campagneMap = new Map(
        campagnesData.map((c) => [String(c.id), c.annee])
      )

      const nomParcelle = (id) => parcelleMap.get(String(id)) ?? "-"
      const anneeCampagne = (id) => campagneMap.get(String(id)) ?? "-"

      // Récolte par type
      const mapType = new Map()
      for (const r of recoltes) {
        const key = r.type_olive || "?"
        mapType.set(
          key,
          (mapType.get(key) || 0) + (parseFloat(r.quantite_kg) || 0)
        )
      }
      const recolteParType = Array.from(mapType.entries()).map(
        ([typeOlive, quantite]) => ({ typeOlive, quantite })
      )

      // Récolte par parcelle
      const mapParcelle = new Map()
      for (const r of recoltes) {
        const key = r.parcelle_id || "null"
        mapParcelle.set(
          key,
          (mapParcelle.get(key) || 0) +
            (parseFloat(r.quantite_kg) || 0)
        )
      }
      const recolteParParcelle = Array.from(mapParcelle.entries()).map(
        ([parcelleId, quantite]) => ({
          parcelleId: parcelleId === "null" ? null : parcelleId,
          parcelleNom: nomParcelle(parcelleId),
          quantite,
        })
      )

      // Récolte par année (tout confondu)
      const mapAnnee = new Map()
      for (const r of recoltes) {
        const annee = anneeCampagne(r.campagne_id || "null") || "-"
        mapAnnee.set(
          annee,
          (mapAnnee.get(annee) || 0) +
            (parseFloat(r.quantite_kg) || 0)
        )
      }
      const recolteParAnnee = Array.from(mapAnnee.entries()).map(
        ([annee, quantite]) => ({ annee, quantite })
      )

      // Récolte par année / parcelle / type (vue détaillée)
      const mapAnnParcType = new Map()
      for (const r of recoltes) {
        const annee = anneeCampagne(r.campagne_id || "null")
        const parcelleId = r.parcelle_id || "null"
        const typeOlive = r.type_olive || "?"
        const key = `${annee}|${parcelleId}|${typeOlive}`
        mapAnnParcType.set(
          key,
          (mapAnnParcType.get(key) || 0) +
            (parseFloat(r.quantite_kg) || 0)
        )
      }
      const recolteParAnneeParParcelleType = Array.from(
        mapAnnParcType.entries()
      ).map(([key, quantite]) => {
        const [annee, parcelleId, typeOlive] = key.split("|")
        return {
          annee,
          parcelleId: parcelleId === "null" ? null : parcelleId,
          parcelleNom: nomParcelle(parcelleId),
          typeOlive,
          quantite,
        }
      })

      // CA par parcelle via ventes
      const recoltesMap = new Map(recoltes.map((r) => [String(r.id), r]))
      const mapCaParParcelle = new Map()
      for (const v of ventes) {
        if (!v.recolte_id) continue
        const rec = recoltesMap.get(String(v.recolte_id))
        if (!rec) continue
        const parcelleKey = rec.parcelle_id || "null"
        const montant = parseFloat(v.montant_total_dt) || 0
        mapCaParParcelle.set(
          parcelleKey,
          (mapCaParParcelle.get(parcelleKey) || 0) + montant
        )
      }
      const caParParcelle = Array.from(mapCaParParcelle.entries()).map(
        ([parcelleId, montant]) => ({
          parcelleId: parcelleId === "null" ? null : parcelleId,
          parcelleNom: nomParcelle(parcelleId),
          ca: montant,
        })
      )

      // CA + nombre de ventes par campagne
      const mapCaParCampagne = new Map()
      const mapNbVentesCampagne = new Map()
      for (const v of ventes) {
        const montant = parseFloat(v.montant_total_dt) || 0
        const campKey = v.campagne_id || "null"
        mapCaParCampagne.set(
          campKey,
          (mapCaParCampagne.get(campKey) || 0) + montant
        )
        mapNbVentesCampagne.set(
          campKey,
          (mapNbVentesCampagne.get(campKey) || 0) + 1
        )
      }
      for (const r of autresRevenus) {
        const montant = parseFloat(r.montant_dt) || 0
        const campKey = r.campagne_id || "null"
        mapCaParCampagne.set(
          campKey,
          (mapCaParCampagne.get(campKey) || 0) + montant
        )
      }
      const caParCampagne = Array.from(mapCaParCampagne.entries()).map(
        ([campagneId, montant]) => ({
          campagneId: campagneId === "null" ? null : campagneId,
          annee: anneeCampagne(campagneId),
          ca: montant,
          nbVentes: mapNbVentesCampagne.get(campagneId) || 0,
        })
      )

      // Charges totales par campagne
      const mapChargesParCampagne = new Map()
      for (const ch of charges) {
        const key = ch.campagne_id || "null"
        mapChargesParCampagne.set(
          key,
          (mapChargesParCampagne.get(key) || 0) +
            (parseFloat(ch.montant_dt) || 0)
        )
      }
      const chargesParCampagne = Array.from(mapChargesParCampagne.entries()).map(
        ([campagneId, total]) => ({
          campagneId: campagneId === "null" ? null : campagneId,
          annee: anneeCampagne(campagneId),
          total,
        })
      )

      // Marge par campagne
      const margeParCampagne = Array.from(mapCaParCampagne.entries()).map(
        ([campagneId, caCamp]) => {
          const chargesAnnee = mapChargesParCampagne.get(campagneId) || 0
          return {
            campagneId: campagneId === "null" ? null : campagneId,
            annee: anneeCampagne(campagneId),
            ca: caCamp,
            charges: chargesAnnee,
            marge: caCamp - chargesAnnee,
          }
        }
      )

      // Marge par parcelle (charges allouées au prorata de la récolte)
      const mapRecolteParcelle = new Map(
        recolteParParcelle.map((rp) => [
          String(rp.parcelleId ?? "null"),
          rp.quantite,
        ])
      )
      const margeParParcelle = caParParcelle.map((cpp) => {
        const recolteParc =
          mapRecolteParcelle.get(String(cpp.parcelleId ?? "null")) || 0
        const pct = totalKg > 0 ? recolteParc / totalKg : 0
        const chargesAllouees = chargesTotales * pct
        return {
          parcelleId: cpp.parcelleId,
          parcelleNom: cpp.parcelleNom,
          ca: cpp.ca,
          recolte: recolteParc,
          chargesAllouees,
          marge: cpp.ca - chargesAllouees,
        }
      })

      // Jours de récolte par campagne
      const mapJoursParCampagne = new Map()
      for (const r of recoltes) {
        const key = r.campagne_id || "null"
        mapJoursParCampagne.set(
          key,
          (mapJoursParCampagne.get(key) || 0) + 1
        )
      }
      const joursParCampagne = Array.from(
        mapJoursParCampagne.entries()
      ).map(([campagneId, nb]) => ({
        campagneId: campagneId === "null" ? null : campagneId,
        annee: anneeCampagne(campagneId),
        nb,
      }))

      // Jours de récolte par parcelle
      const mapJoursParParcelle = new Map()
      for (const r of recoltes) {
        const key = r.parcelle_id || "null"
        mapJoursParParcelle.set(
          key,
          (mapJoursParParcelle.get(key) || 0) + 1
        )
      }
      const joursParParcelle = Array.from(
        mapJoursParParcelle.entries()
      ).map(([parcelleId, nb]) => ({
        parcelleId: parcelleId === "null" ? null : parcelleId,
        parcelleNom: nomParcelle(parcelleId),
        nb,
      }))

      // Ventes par parcelle (compte)
      const mapVentesParParcelle = new Map()
      for (const v of ventes) {
        if (!v.recolte_id) continue
        const rec = recoltesMap.get(String(v.recolte_id))
        if (!rec) continue
        const key = rec.parcelle_id || "null"
        mapVentesParParcelle.set(
          key,
          (mapVentesParParcelle.get(key) || 0) + 1
        )
      }
      const ventesParParcelle = Array.from(
        mapVentesParParcelle.entries()
      ).map(([parcelleId, nb]) => ({
        parcelleId: parcelleId === "null" ? null : parcelleId,
        parcelleNom: nomParcelle(parcelleId),
        nb,
      }))

      // Huile perso : litres par campagne et par parcelle
      const recoltesHuilePerso = recoltes.filter(
        (r) => r.destination === "huile_perso"
      )
      const totalLitresPerso = recoltesHuilePerso.reduce(
        (sum, r) => sum + (parseFloat(r.quantite_litres) || 0),
        0
      )
      const mapHuileParCampagne = new Map()
      for (const r of recoltesHuilePerso) {
        const key = r.campagne_id || "null"
        mapHuileParCampagne.set(
          key,
          (mapHuileParCampagne.get(key) || 0) +
            (parseFloat(r.quantite_litres) || 0)
        )
      }
      const huilePersoParCampagne = Array.from(
        mapHuileParCampagne.entries()
      ).map(([campagneId, litres]) => ({
        campagneId: campagneId === "null" ? null : campagneId,
        annee: anneeCampagne(campagneId),
        litres,
      }))
      const mapHuileParParcelle = new Map()
      for (const r of recoltesHuilePerso) {
        const key = r.parcelle_id || "null"
        mapHuileParParcelle.set(
          key,
          (mapHuileParParcelle.get(key) || 0) +
            (parseFloat(r.quantite_litres) || 0)
        )
      }
      const huilePersoParParcelle = Array.from(
        mapHuileParParcelle.entries()
      ).map(([parcelleId, litres]) => ({
        parcelleId: parcelleId === "null" ? null : parcelleId,
        parcelleNom: nomParcelle(parcelleId),
        litres,
      }))

      setKpi({
        ca,
        coutMo,
        autresCharges,
        chargesTotales,
        marge,
        totalKg,
        nbVentes: ventes.length,
        totalLitresPerso,
        nbJoursRecolte: recoltes.length,
        nbTracteurs: equipementsData.length,
        chargesParType,
        recolteParType,
        recolteParParcelle,
        recolteParAnnee,
        recolteParAnneeParParcelleType,
        caParParcelle,
        caParCampagne,
        margeParCampagne,
        margeParParcelle,
        ventesParParcelle,
        joursParCampagne,
        joursParParcelle,
        huilePersoParCampagne,
        huilePersoParParcelle,
        chargesParCampagne,
      })
      setLoading(false)
    }
    loadKpi()
  }, [campagneFiltreId])

  const recolteParTypeTriee = useMemo(
    () =>
      [...kpi.recolteParType].sort((a, b) =>
        labelTypeOlive(a.typeOlive).localeCompare(
          labelTypeOlive(b.typeOlive)
        )
      ),
    [kpi.recolteParType]
  )

  const recolteParParcelleTriee = useMemo(
    () =>
      [...kpi.recolteParParcelle].sort((a, b) =>
        a.parcelleNom.localeCompare(b.parcelleNom)
      ),
    [kpi.recolteParParcelle]
  )

  const recolteParAnneeTriee = useMemo(
    () =>
      [...kpi.recolteParAnnee].sort((a, b) =>
        String(a.annee).localeCompare(String(b.annee))
      ),
    [kpi.recolteParAnnee]
  )

  const caParParcelleTrie = useMemo(
    () => [...kpi.caParParcelle].sort((a, b) => b.ca - a.ca),
    [kpi.caParParcelle]
  )

  const caParCampagneTrie = useMemo(
    () =>
      [...kpi.caParCampagne].sort((a, b) =>
        String(a.annee).localeCompare(String(b.annee))
      ),
    [kpi.caParCampagne]
  )

  const margeParCampagneTrie = useMemo(
    () =>
      [...kpi.margeParCampagne].sort((a, b) =>
        String(a.annee).localeCompare(String(b.annee))
      ),
    [kpi.margeParCampagne]
  )

  const margeParParcelleTrie = useMemo(
    () => [...kpi.margeParParcelle].sort((a, b) => b.marge - a.marge),
    [kpi.margeParParcelle]
  )

  const huilePersoParCampagneTrie = useMemo(
    () =>
      [...kpi.huilePersoParCampagne].sort((a, b) =>
        String(a.annee).localeCompare(String(b.annee))
      ),
    [kpi.huilePersoParCampagne]
  )

  const huilePersoParParcelleTrie = useMemo(
    () =>
      [...kpi.huilePersoParParcelle].sort((a, b) => b.litres - a.litres),
    [kpi.huilePersoParParcelle]
  )

  const chargesParCampagneTrie = useMemo(
    () =>
      [...kpi.chargesParCampagne].sort((a, b) =>
        String(a.annee).localeCompare(String(b.annee))
      ),
    [kpi.chargesParCampagne]
  )

  if (loading) return <Spinner message="Chargement des KPIs..." />

  const cards = [
    {
      id: "ca",
      label: "Chiffre d'affaires",
      value: kpi.ca.toLocaleString("fr-FR", { minimumFractionDigits: 3, maximumFractionDigits: 3 }) + " DT",
      color: "bg-blue-500",
      icon: "💰",
      hasDetail: true,
    },
    {
      id: "quantite",
      label: "Quantité récoltée",
      value: kpi.totalKg.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " kg",
      color: "bg-purple-500",
      icon: "🫒",
      hasDetail: true,
    },
    {
      id: "charges",
      label: "Charges totales",
      value: kpi.chargesTotales.toLocaleString("fr-FR", { minimumFractionDigits: 3, maximumFractionDigits: 3 }) + " DT",
      color: "bg-amber-500",
      icon: "📉",
      hasDetail: true,
    },
    {
      id: "marge",
      label: "Marge nette",
      value: kpi.marge.toLocaleString("fr-FR", { minimumFractionDigits: 3, maximumFractionDigits: 3 }) + " DT",
      sub:
        kpi.ca > 0
          ? `(${((kpi.marge / kpi.ca) * 100).toFixed(1)} % du CA)`
          : null,
      color: kpi.marge >= 0 ? "bg-green-500" : "bg-red-500",
      icon: kpi.marge >= 0 ? "✅" : "⚠️",
      hasDetail: true,
    },
    {
      id: "huile_perso",
      label: "Huile perso produite",
      value: kpi.totalLitresPerso.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " L",
      color: "bg-cyan-500",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7">
          <rect x="9" y="1" width="6" height="2.5" rx="1" fill="currentColor" stroke="none" />
          <path d="M9 3.5 L7.5 7 M15 3.5 L16.5 7" />
          <path d="M7.5 7 Q5.5 8.5 5.5 10.5 L5.5 20 Q5.5 22.5 12 22.5 Q18.5 22.5 18.5 20 L18.5 10.5 Q18.5 8.5 16.5 7 Z" />
          <path d="M5.8 15.5 Q12 13.5 18.2 15.5" strokeWidth="1.2" />
        </svg>
      ),
      hasDetail: true,
    },
    {
      id: "tracteur",
      label: "Tracteurs",
      value: kpi.nbTracteurs,
      color: "bg-orange-500",
      icon: "🚜",
      hasDetail: kpi.nbTracteurs > 0 && !!onNavigateTracteur,
      onClick: () => onNavigateTracteur && equipements.length > 0 && onNavigateTracteur(equipements[0]),
    },
  ]

  function formatMontant(value) {
    return `${value.toLocaleString("fr-FR", { minimumFractionDigits: 3, maximumFractionDigits: 3 })} DT`
  }

  function labelTypeCharge(key) {
    switch (key) {
      case "recolte":
        return "Récolte"
      case "equipement":
        return "Équipements"
      case "don":
        return "Dons"
      case "transformation_huile":
        return "Transformation huile"
      default:
        return key
    }
  }

  function labelTypeOlive(type) {
    if (type === "hay") return "Hay"
    if (type === "nchrira") return "Nchrira"
    return type || "-"
  }

  const lignesCharges = Object.entries(kpi.chargesParType)
    .filter(([, montant]) => montant > 0)
    .map(([key, montant]) => {
      const part =
        kpi.chargesTotales > 0
          ? (montant / kpi.chargesTotales) * 100
          : 0
      return { key, label: labelTypeCharge(key), montant, part }
    })

  return (
    <div>
      {/* Filtre campagne + export */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-2xl font-bold text-gray-800">
          Résumé de la campagne
        </h2>
        <div className="flex flex-wrap items-center gap-3">
          <div className="text-sm">
            <label className="mr-2 text-gray-600">Campagne :</label>
            <select
              value={campagneFiltreId}
              onChange={(e) => {
                const value = e.target.value
                setCampagneFiltreId(value)
                if (value !== "all" && detailQuantiteVue === "annee") {
                  setDetailQuantiteVue("parcelle")
                }
                if (value !== "all" && detailCaVue === "annee")
                  setDetailCaVue("parcelle")
                if (value !== "all" && detailMargeVue === "annee")
                  setDetailMargeVue("parcelle")
                if (value !== "all" && detailHuilePersoVue === "annee")
                  setDetailHuilePersoVue("parcelle")
                if (value !== "all")
                  setDetailChargesVue("type")
                if (value === "all") {
                  setDetailCaVue("annee")
                  setDetailMargeVue("annee")
                  setDetailHuilePersoVue("annee")
                  setDetailChargesVue("campagne")
                }
              }}
              className="rounded-md border border-gray-300 px-2 py-1 text-sm shadow-sm focus:border-olive-500 focus:ring-olive-500"
            >
              <option value="all">Toutes les campagnes</option>
              {campagnes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.annee} – {c.statut === "en_cours" ? "En cours" : "Terminée"}
                </option>
              ))}
            </select>
          </div>
          <ExportExcel />
        </div>
      </div>

      {/* Cartes KPI */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {cards.map((card) =>
          card.hasDetail ? (
            <button
              key={card.id}
              type="button"
              onClick={() => card.onClick ? card.onClick() : setKpiActif(card.id)}
              className={`${card.color} text-white rounded-xl px-4 py-3 shadow-lg transform hover:scale-[1.02] hover:shadow-xl hover:ring-2 hover:ring-white/50 transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-white/60 cursor-pointer text-left group`}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-2xl">{card.icon}</span>
                <span className="text-sm opacity-90">
                  {card.label}
                </span>
              </div>
              <div className="text-2xl font-bold whitespace-nowrap">
                {card.value}
              </div>
              {card.sub && (
                <div className="text-xs mt-0.5 opacity-80">
                  {card.sub}
                </div>
              )}
              <div className="text-xs mt-1 opacity-70 group-hover:opacity-100 transition-opacity">
                Voir le détail →
              </div>
            </button>
          ) : (
            <div
              key={card.id}
              className={`${card.color} text-white rounded-xl px-4 py-3 shadow-lg`}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-2xl">{card.icon}</span>
                <span className="text-sm opacity-90">
                  {card.label}
                </span>
              </div>
              <div className="text-2xl font-bold whitespace-nowrap">
                {card.value}
              </div>
              {card.sub && (
                <div className="text-xs mt-0.5 opacity-80">
                  {card.sub}
                </div>
              )}
            </div>
          )
        )}
      </div>

      {/* Modale — Chiffre d'affaires */}
      <Modal
        isOpen={kpiActif === "ca"}
        onClose={() => setKpiActif(null)}
        title="Chiffre d'affaires"
        size="large"
      >
        {campagneFiltreId === "all" && (
          <div className="mb-3">
            <div className="inline-flex rounded-md border border-gray-200 bg-gray-50 p-1 text-xs">
              <button
                type="button"
                onClick={() => setDetailCaVue("annee")}
                className={`px-3 py-1 rounded-md ${
                  detailCaVue === "annee"
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                Par Campagne
              </button>
              <button
                type="button"
                onClick={() => setDetailCaVue("parcelle")}
                className={`px-3 py-1 rounded-md ${
                  detailCaVue === "parcelle"
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                Par parcelle
              </button>
            </div>
          </div>
        )}

        <div className="overflow-x-auto overflow-y-auto max-h-[55vh]">
          {campagneFiltreId === "all" && detailCaVue === "annee" ? (
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="px-3 py-2 text-left font-medium text-gray-600">
                    Campagne
                  </th>
                  <th className="px-3 py-2 text-right font-medium text-gray-600">
                    Nb ventes
                  </th>
                  <th className="px-3 py-2 text-right font-medium text-gray-600">
                    CA (DT)
                  </th>
                  <th className="px-3 py-2 text-right font-medium text-gray-600">
                    Part
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {caParCampagneTrie.length === 0 ? (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-3 py-3 text-center text-gray-500"
                    >
                      Aucune vente enregistrée.
                    </td>
                  </tr>
                ) : (
                  caParCampagneTrie.map((ligne, idx) => {
                    const part =
                      kpi.ca > 0 ? (ligne.ca / kpi.ca) * 100 : 0
                    return (
                      <tr key={idx}>
                        <td className="px-3 py-2 text-gray-800">
                          {ligne.annee}
                        </td>
                        <td className="px-3 py-2 text-right text-gray-800">
                          {ligne.nbVentes}
                        </td>
                        <td className="px-3 py-2 text-right text-gray-800">
                          {formatMontant(ligne.ca)}
                        </td>
                        <td className="px-3 py-2 text-right text-gray-800">
                          {kpi.ca > 0
                            ? `${part.toFixed(1)} %`
                            : "-"}
                        </td>
                      </tr>
                    )
                  })
                )}
                {caParCampagneTrie.length > 0 && (
                  <tr className="bg-gray-50 font-semibold">
                    <td className="px-3 py-2 text-gray-900">
                      Total
                    </td>
                    <td className="px-3 py-2 text-right text-gray-900">
                      {kpi.nbVentes}
                    </td>
                    <td className="px-3 py-2 text-right text-gray-900">
                      {formatMontant(kpi.ca)}
                    </td>
                    <td className="px-3 py-2 text-right text-gray-900">
                      {kpi.ca > 0 ? "100.0 %" : "-"}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          ) : (
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="px-3 py-2 text-left font-medium text-gray-600">
                    Parcelle
                  </th>
                  <th className="px-3 py-2 text-right font-medium text-gray-600">
                    CA (DT)
                  </th>
                  <th className="px-3 py-2 text-right font-medium text-gray-600">
                    Part
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {caParParcelleTrie.length === 0 ? (
                  <tr>
                    <td
                      colSpan={3}
                      className="px-3 py-3 text-center text-gray-500"
                    >
                      Aucune vente liée à une parcelle.
                    </td>
                  </tr>
                ) : (
                  caParParcelleTrie.map((ligne, idx) => {
                    const part =
                      kpi.ca > 0 ? (ligne.ca / kpi.ca) * 100 : 0
                    return (
                      <tr key={idx}>
                        <td className="px-3 py-2 text-gray-800">
                          {ligne.parcelleNom}
                        </td>
                        <td className="px-3 py-2 text-right text-gray-800">
                          {formatMontant(ligne.ca)}
                        </td>
                        <td className="px-3 py-2 text-right text-gray-800">
                          {kpi.ca > 0
                            ? `${part.toFixed(1)} %`
                            : "-"}
                        </td>
                      </tr>
                    )
                  })
                )}
                {caParParcelleTrie.length > 0 && (
                  <tr className="bg-gray-50 font-semibold">
                    <td className="px-3 py-2 text-gray-900">
                      Total
                    </td>
                    <td className="px-3 py-2 text-right text-gray-900">
                      {formatMontant(kpi.ca)}
                    </td>
                    <td className="px-3 py-2 text-right text-gray-900">
                      {kpi.ca > 0 ? "100.0 %" : "-"}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </Modal>

      {/* Modale — Charges */}
      <Modal
        isOpen={kpiActif === "charges"}
        onClose={() => setKpiActif(null)}
        title="Charges totales"
        size="large"
      >
        {campagneFiltreId === "all" && (
          <div className="mb-3">
            <div className="inline-flex rounded-md border border-gray-200 bg-gray-50 p-1 text-xs">
              <button
                type="button"
                onClick={() => setDetailChargesVue("campagne")}
                className={`px-3 py-1 rounded-md ${
                  detailChargesVue === "campagne"
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                Par Campagne
              </button>
              <button
                type="button"
                onClick={() => setDetailChargesVue("type")}
                className={`px-3 py-1 rounded-md ${
                  detailChargesVue === "type"
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                Par type de charge
              </button>
            </div>
          </div>
        )}

        <div className="overflow-x-auto overflow-y-auto max-h-[55vh]">
          {campagneFiltreId === "all" && detailChargesVue === "campagne" ? (
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="px-3 py-2 text-left font-medium text-gray-600">
                    Campagne
                  </th>
                  <th className="px-3 py-2 text-right font-medium text-gray-600">
                    Charges totales (DT)
                  </th>
                  <th className="px-3 py-2 text-right font-medium text-gray-600">
                    Part
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {chargesParCampagneTrie.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-3 py-3 text-center text-gray-500">
                      Aucune charge enregistrée.
                    </td>
                  </tr>
                ) : (
                  chargesParCampagneTrie.map((ligne, idx) => {
                    const part =
                      kpi.chargesTotales > 0
                        ? (ligne.total / kpi.chargesTotales) * 100
                        : 0
                    return (
                      <tr key={idx}>
                        <td className="px-3 py-2 text-gray-800">{ligne.annee}</td>
                        <td className="px-3 py-2 text-right text-gray-800">
                          {formatMontant(ligne.total)}
                        </td>
                        <td className="px-3 py-2 text-right text-gray-800">
                          {kpi.chargesTotales > 0 ? `${part.toFixed(1)} %` : "-"}
                        </td>
                      </tr>
                    )
                  })
                )}
                {chargesParCampagneTrie.length > 0 && (
                  <tr className="bg-gray-50 font-semibold">
                    <td className="px-3 py-2 text-gray-900">Total</td>
                    <td className="px-3 py-2 text-right text-gray-900">
                      {formatMontant(kpi.chargesTotales)}
                    </td>
                    <td className="px-3 py-2 text-right text-gray-900">
                      {kpi.chargesTotales > 0 ? "100.0 %" : "-"}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          ) : (
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="px-3 py-2 text-left font-medium text-gray-600">
                    Type de charge
                  </th>
                  <th className="px-3 py-2 text-right font-medium text-gray-600">
                    Montant
                  </th>
                  <th className="px-3 py-2 text-right font-medium text-gray-600">
                    Part
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {lignesCharges.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-3 py-3 text-center text-gray-500">
                      Aucune charge enregistrée.
                    </td>
                  </tr>
                ) : (
                  lignesCharges.map((ligne) => (
                    <tr key={ligne.key}>
                      <td className="px-3 py-2 text-gray-800">{ligne.label}</td>
                      <td className="px-3 py-2 text-right text-gray-800">
                        {formatMontant(ligne.montant)}
                      </td>
                      <td className="px-3 py-2 text-right text-gray-800">
                        {kpi.chargesTotales > 0 ? `${ligne.part.toFixed(1)} %` : "-"}
                      </td>
                    </tr>
                  ))
                )}
                {lignesCharges.length > 0 && (
                  <tr className="bg-gray-50 font-semibold">
                    <td className="px-3 py-2 text-gray-900">Total</td>
                    <td className="px-3 py-2 text-right text-gray-900">
                      {formatMontant(kpi.chargesTotales)}
                    </td>
                    <td className="px-3 py-2 text-right text-gray-900">
                      {kpi.chargesTotales > 0 ? "100.0 %" : "-"}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </Modal>

      {/* Modale — Quantités récoltées */}
      <Modal
        isOpen={kpiActif === "quantite"}
        onClose={() => setKpiActif(null)}
        title="Quantités récoltées"
        size="large"
      >
        <div className="mb-3">
          <div className="inline-flex rounded-md border border-gray-200 bg-gray-50 p-1 text-xs">
            {campagneFiltreId === "all" && (
              <button
                type="button"
                onClick={() => setDetailQuantiteVue("annee")}
                className={`px-3 py-1 rounded-md ${
                  detailQuantiteVue === "annee"
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                Par Campagne
              </button>
            )}
            <button
              type="button"
              onClick={() => setDetailQuantiteVue("parcelle")}
              className={`px-3 py-1 rounded-md ${
                detailQuantiteVue === "parcelle"
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              Par parcelle
            </button>
            <button
              type="button"
              onClick={() => setDetailQuantiteVue("type")}
              className={`px-3 py-1 rounded-md ${
                detailQuantiteVue === "type"
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              Par type d&apos;olive
            </button>
          </div>
        </div>

        <div className="overflow-x-auto overflow-y-auto max-h-[55vh]">
          {detailQuantiteVue === "annee" &&
          campagneFiltreId === "all" ? (
            // Vue agrégée par année (toutes parcelles + types confondus)
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="px-3 py-2 text-left font-medium text-gray-600">
                    Campagne
                  </th>
                  <th className="px-3 py-2 text-right font-medium text-gray-600">
                    Quantité (kg)
                  </th>
                  <th className="px-3 py-2 text-right font-medium text-gray-600">
                    Part
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {recolteParAnneeTriee.length === 0 ? (
                  <tr>
                    <td
                      colSpan={3}
                      className="px-3 py-3 text-center text-gray-500"
                    >
                      Aucune récolte enregistrée.
                    </td>
                  </tr>
                ) : (
                  recolteParAnneeTriee.map((ligne, idx) => {
                    const part =
                      kpi.totalKg > 0
                        ? (ligne.quantite / kpi.totalKg) * 100
                        : 0
                    return (
                      <tr key={idx}>
                        <td className="px-3 py-2 text-gray-800">
                          {ligne.annee}
                        </td>
                        <td className="px-3 py-2 text-right text-gray-800">
                          {ligne.quantite.toLocaleString("fr-FR", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}{" "}
                          kg
                        </td>
                        <td className="px-3 py-2 text-right text-gray-800">
                          {kpi.totalKg > 0
                            ? `${part.toFixed(1)} %`
                            : "-"}
                        </td>
                      </tr>
                    )
                  })
                )}
                {recolteParAnneeTriee.length > 0 && (
                  <tr className="bg-gray-50 font-semibold">
                    <td className="px-3 py-2 text-gray-900">
                      Total
                    </td>
                    <td className="px-3 py-2 text-right text-gray-900">
                      {kpi.totalKg.toLocaleString("fr-FR", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}{" "}
                      kg
                    </td>
                    <td className="px-3 py-2 text-right text-gray-900">
                      {kpi.totalKg > 0 ? "100.0 %" : "-"}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          ) : detailQuantiteVue === "parcelle" ? (
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="px-3 py-2 text-left font-medium text-gray-600">
                    Parcelle
                  </th>
                  <th className="px-3 py-2 text-right font-medium text-gray-600">
                    Quantité (kg)
                  </th>
                  <th className="px-3 py-2 text-right font-medium text-gray-600">
                    Part
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {recolteParParcelleTriee.length === 0 ? (
                  <tr>
                    <td
                      colSpan={3}
                      className="px-3 py-3 text-center text-gray-500"
                    >
                      Aucune récolte enregistrée.
                    </td>
                  </tr>
                ) : (
                  recolteParParcelleTriee.map((ligne, idx) => {
                    const part =
                      kpi.totalKg > 0
                        ? (ligne.quantite / kpi.totalKg) * 100
                        : 0
                    return (
                      <tr key={idx}>
                        <td className="px-3 py-2 text-gray-800">
                          {ligne.parcelleNom}
                        </td>
                        <td className="px-3 py-2 text-right text-gray-800">
                          {ligne.quantite.toLocaleString("fr-FR", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}{" "}
                          kg
                        </td>
                        <td className="px-3 py-2 text-right text-gray-800">
                          {kpi.totalKg > 0
                            ? `${part.toFixed(1)} %`
                            : "-"}
                        </td>
                      </tr>
                    )
                  })
                )}
                {recolteParParcelleTriee.length > 0 && (
                  <tr className="bg-gray-50 font-semibold">
                    <td className="px-3 py-2 text-gray-900">
                      Total
                    </td>
                    <td className="px-3 py-2 text-right text-gray-900">
                      {kpi.totalKg.toLocaleString("fr-FR", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}{" "}
                      kg
                    </td>
                    <td className="px-3 py-2 text-right text-gray-900">
                      {kpi.totalKg > 0 ? "100.0 %" : "-"}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          ) : (
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="px-3 py-2 text-left font-medium text-gray-600">
                    Type d&apos;olive
                  </th>
                  <th className="px-3 py-2 text-right font-medium text-gray-600">
                    Quantité (kg)
                  </th>
                  <th className="px-3 py-2 text-right font-medium text-gray-600">
                    Part
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {recolteParTypeTriee.length === 0 ? (
                  <tr>
                    <td
                      colSpan={3}
                      className="px-3 py-3 text-center text-gray-500"
                    >
                      Aucune récolte enregistrée.
                    </td>
                  </tr>
                ) : (
                  recolteParTypeTriee.map((ligne, idx) => {
                    const part =
                      kpi.totalKg > 0
                        ? (ligne.quantite / kpi.totalKg) * 100
                        : 0
                    return (
                      <tr key={idx}>
                        <td className="px-3 py-2 text-gray-800">
                          {labelTypeOlive(ligne.typeOlive)}
                        </td>
                        <td className="px-3 py-2 text-right text-gray-800">
                          {ligne.quantite.toLocaleString("fr-FR", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}{" "}
                          kg
                        </td>
                        <td className="px-3 py-2 text-right text-gray-800">
                          {kpi.totalKg > 0
                            ? `${part.toFixed(1)} %`
                            : "-"}
                        </td>
                      </tr>
                    )
                  })
                )}
                {recolteParTypeTriee.length > 0 && (
                  <tr className="bg-gray-50 font-semibold">
                    <td className="px-3 py-2 text-gray-900">
                      Total
                    </td>
                    <td className="px-3 py-2 text-right text-gray-900">
                      {kpi.totalKg.toLocaleString("fr-FR", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}{" "}
                      kg
                    </td>
                    <td className="px-3 py-2 text-right text-gray-900">
                      {kpi.totalKg > 0 ? "100.0 %" : "-"}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </Modal>

      {/* Modale — Huile perso produite */}
      <Modal
        isOpen={kpiActif === "huile_perso"}
        onClose={() => setKpiActif(null)}
        title="Huile perso produite"
        size="large"
      >
        {campagneFiltreId === "all" && (
          <div className="mb-3">
            <div className="inline-flex rounded-md border border-gray-200 bg-gray-50 p-1 text-xs">
              <button
                type="button"
                onClick={() => setDetailHuilePersoVue("annee")}
                className={`px-3 py-1 rounded-md ${
                  detailHuilePersoVue === "annee"
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                Par Campagne
              </button>
              <button
                type="button"
                onClick={() => setDetailHuilePersoVue("parcelle")}
                className={`px-3 py-1 rounded-md ${
                  detailHuilePersoVue === "parcelle"
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                Par parcelle
              </button>
            </div>
          </div>
        )}
        <div className="overflow-x-auto overflow-y-auto max-h-[55vh]">
          {campagneFiltreId === "all" &&
          detailHuilePersoVue === "annee" ? (
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="px-3 py-2 text-left font-medium text-gray-600">
                    Campagne
                  </th>
                  <th className="px-3 py-2 text-right font-medium text-gray-600">
                    Litres
                  </th>
                  <th className="px-3 py-2 text-right font-medium text-gray-600">
                    Part
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {huilePersoParCampagneTrie.length === 0 ? (
                  <tr>
                    <td
                      colSpan={3}
                      className="px-3 py-3 text-center text-gray-500"
                    >
                      Aucune huile perso enregistrée.
                    </td>
                  </tr>
                ) : (
                  huilePersoParCampagneTrie.map((ligne, idx) => {
                    const part =
                      kpi.totalLitresPerso > 0
                        ? (ligne.litres / kpi.totalLitresPerso) * 100
                        : 0
                    return (
                      <tr key={idx}>
                        <td className="px-3 py-2 text-gray-800">
                          {ligne.annee}
                        </td>
                        <td className="px-3 py-2 text-right text-gray-800">
                          {ligne.litres.toLocaleString("fr-FR", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}{" "}
                          L
                        </td>
                        <td className="px-3 py-2 text-right text-gray-800">
                          {kpi.totalLitresPerso > 0
                            ? `${part.toFixed(1)} %`
                            : "-"}
                        </td>
                      </tr>
                    )
                  })
                )}
                {huilePersoParCampagneTrie.length > 0 && (
                  <tr className="bg-gray-50 font-semibold">
                    <td className="px-3 py-2 text-gray-900">Total</td>
                    <td className="px-3 py-2 text-right text-gray-900">
                      {kpi.totalLitresPerso.toLocaleString("fr-FR", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}{" "}
                      L
                    </td>
                    <td className="px-3 py-2 text-right text-gray-900">
                      {kpi.totalLitresPerso > 0 ? "100.0 %" : "-"}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          ) : (
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="px-3 py-2 text-left font-medium text-gray-600">
                    Parcelle
                  </th>
                  <th className="px-3 py-2 text-right font-medium text-gray-600">
                    Litres
                  </th>
                  <th className="px-3 py-2 text-right font-medium text-gray-600">
                    Part
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {huilePersoParParcelleTrie.length === 0 ? (
                  <tr>
                    <td
                      colSpan={3}
                      className="px-3 py-3 text-center text-gray-500"
                    >
                      Aucune huile perso enregistrée.
                    </td>
                  </tr>
                ) : (
                  huilePersoParParcelleTrie.map((ligne, idx) => {
                    const part =
                      kpi.totalLitresPerso > 0
                        ? (ligne.litres / kpi.totalLitresPerso) * 100
                        : 0
                    return (
                      <tr key={idx}>
                        <td className="px-3 py-2 text-gray-800">
                          {ligne.parcelleNom}
                        </td>
                        <td className="px-3 py-2 text-right text-gray-800">
                          {ligne.litres.toLocaleString("fr-FR", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}{" "}
                          L
                        </td>
                        <td className="px-3 py-2 text-right text-gray-800">
                          {kpi.totalLitresPerso > 0
                            ? `${part.toFixed(1)} %`
                            : "-"}
                        </td>
                      </tr>
                    )
                  })
                )}
                {huilePersoParParcelleTrie.length > 0 && (
                  <tr className="bg-gray-50 font-semibold">
                    <td className="px-3 py-2 text-gray-900">Total</td>
                    <td className="px-3 py-2 text-right text-gray-900">
                      {kpi.totalLitresPerso.toLocaleString("fr-FR", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}{" "}
                      L
                    </td>
                    <td className="px-3 py-2 text-right text-gray-900">
                      {kpi.totalLitresPerso > 0 ? "100.0 %" : "-"}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </Modal>

      {/* Modale — Marge nette */}
      <Modal
        isOpen={kpiActif === "marge"}
        onClose={() => setKpiActif(null)}
        title="Marge nette"
        size="large"
      >
        {campagneFiltreId === "all" && (
          <div className="mb-3">
            <div className="inline-flex rounded-md border border-gray-200 bg-gray-50 p-1 text-xs">
              <button
                type="button"
                onClick={() => setDetailMargeVue("annee")}
                className={`px-3 py-1 rounded-md ${
                  detailMargeVue === "annee"
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                Par Campagne
              </button>
              <button
                type="button"
                onClick={() => setDetailMargeVue("parcelle")}
                className={`px-3 py-1 rounded-md ${
                  detailMargeVue === "parcelle"
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                Par parcelle
              </button>
            </div>
          </div>
        )}

        <div className="overflow-x-auto overflow-y-auto max-h-[55vh]">
          {campagneFiltreId === "all" &&
          detailMargeVue === "annee" ? (
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="px-3 py-2 text-left font-medium text-gray-600">
                    Campagne
                  </th>
                  <th className="px-3 py-2 text-right font-medium text-gray-600">
                    CA (DT)
                  </th>
                  <th className="px-3 py-2 text-right font-medium text-gray-600">
                    Charges (DT)
                  </th>
                  <th className="px-3 py-2 text-right font-medium text-gray-600">
                    Marge nette (DT)
                  </th>
                  <th className="px-3 py-2 text-right font-medium text-gray-600">
                    Marge (%)
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {margeParCampagneTrie.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-3 py-3 text-center text-gray-500"
                    >
                      Aucune donnée disponible.
                    </td>
                  </tr>
                ) : (
                  margeParCampagneTrie.map((ligne, idx) => {
                    const pct =
                      ligne.ca > 0
                        ? (ligne.marge / ligne.ca) * 100
                        : null
                    return (
                      <tr key={idx}>
                        <td className="px-3 py-2 text-gray-800">
                          {ligne.annee}
                        </td>
                        <td className="px-3 py-2 text-right text-gray-800">
                          {formatMontant(ligne.ca)}
                        </td>
                        <td className="px-3 py-2 text-right text-gray-800">
                          {formatMontant(ligne.charges)}
                        </td>
                        <td
                          className={`px-3 py-2 text-right font-semibold ${
                            ligne.marge >= 0
                              ? "text-green-700"
                              : "text-red-600"
                          }`}
                        >
                          {formatMontant(ligne.marge)}
                        </td>
                        <td
                          className={`px-3 py-2 text-right font-semibold ${
                            ligne.marge >= 0
                              ? "text-green-700"
                              : "text-red-600"
                          }`}
                        >
                          {pct !== null
                            ? `${pct.toFixed(1)} %`
                            : "-"}
                        </td>
                      </tr>
                    )
                  })
                )}
                {margeParCampagneTrie.length > 0 && (
                  <tr className="bg-gray-50 font-semibold">
                    <td className="px-3 py-2 text-gray-900">
                      Total
                    </td>
                    <td className="px-3 py-2 text-right text-gray-900">
                      {formatMontant(kpi.ca)}
                    </td>
                    <td className="px-3 py-2 text-right text-gray-900">
                      {formatMontant(kpi.chargesTotales)}
                    </td>
                    <td
                      className={`px-3 py-2 text-right font-bold ${
                        kpi.marge >= 0
                          ? "text-green-700"
                          : "text-red-600"
                      }`}
                    >
                      {formatMontant(kpi.marge)}
                    </td>
                    <td
                      className={`px-3 py-2 text-right font-bold ${
                        kpi.marge >= 0
                          ? "text-green-700"
                          : "text-red-600"
                      }`}
                    >
                      {kpi.ca > 0
                        ? `${((kpi.marge / kpi.ca) * 100).toFixed(
                            1
                          )} %`
                        : "-"}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          ) : (
            <>
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium text-gray-600">
                      Parcelle
                    </th>
                    <th className="px-3 py-2 text-right font-medium text-gray-600">
                      Récolte (kg)
                    </th>
                    <th className="px-3 py-2 text-right font-medium text-gray-600">
                      CA (DT)
                    </th>
                    <th className="px-3 py-2 text-right font-medium text-gray-600">
                      Charges* (DT)
                    </th>
                    <th className="px-3 py-2 text-right font-medium text-gray-600">
                      Marge (DT)
                    </th>
                    <th className="px-3 py-2 text-right font-medium text-gray-600">
                      Marge (%)
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {margeParParcelleTrie.length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-3 py-3 text-center text-gray-500"
                      >
                        Aucune donnée disponible.
                      </td>
                    </tr>
                  ) : (
                    margeParParcelleTrie.map((ligne, idx) => {
                      const pct =
                        ligne.ca > 0
                          ? (ligne.marge / ligne.ca) * 100
                          : null
                      return (
                        <tr key={idx}>
                          <td className="px-3 py-2 text-gray-800">
                            {ligne.parcelleNom}
                          </td>
                          <td className="px-3 py-2 text-right text-gray-800">
                            {ligne.recolte.toLocaleString("fr-FR", {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}{" "}
                            kg
                          </td>
                          <td className="px-3 py-2 text-right text-gray-800">
                            {formatMontant(ligne.ca)}
                          </td>
                          <td className="px-3 py-2 text-right text-gray-800">
                            {formatMontant(ligne.chargesAllouees)}
                          </td>
                          <td
                            className={`px-3 py-2 text-right font-semibold ${
                              ligne.marge >= 0
                                ? "text-green-700"
                                : "text-red-600"
                            }`}
                          >
                            {formatMontant(ligne.marge)}
                          </td>
                          <td
                            className={`px-3 py-2 text-right font-semibold ${
                              ligne.marge >= 0
                                ? "text-green-700"
                                : "text-red-600"
                            }`}
                          >
                            {pct !== null
                              ? `${pct.toFixed(1)} %`
                              : "-"}
                          </td>
                        </tr>
                      )
                    })
                  )}
                  {margeParParcelleTrie.length > 0 && (
                    <tr className="bg-gray-50 font-semibold">
                      <td className="px-3 py-2 text-gray-900">
                        Total
                      </td>
                      <td className="px-3 py-2 text-right text-gray-900">
                        {kpi.totalKg.toLocaleString("fr-FR", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}{" "}
                        kg
                      </td>
                      <td className="px-3 py-2 text-right text-gray-900">
                        {formatMontant(kpi.ca)}
                      </td>
                      <td className="px-3 py-2 text-right text-gray-900">
                        {formatMontant(kpi.chargesTotales)}
                      </td>
                      <td
                        className={`px-3 py-2 text-right font-bold ${
                          kpi.marge >= 0
                            ? "text-green-700"
                            : "text-red-600"
                        }`}
                      >
                        {formatMontant(kpi.marge)}
                      </td>
                      <td
                        className={`px-3 py-2 text-right font-bold ${
                          kpi.marge >= 0
                            ? "text-green-700"
                            : "text-red-600"
                        }`}
                      >
                        {kpi.ca > 0
                          ? `${((kpi.marge / kpi.ca) * 100).toFixed(
                              1
                            )} %`
                          : "-"}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
              <p className="mt-2 text-xs text-gray-400 italic">
                * Charges allouées proportionnellement à la quantité
                récoltée par parcelle.
              </p>
            </>
          )}
        </div>
      </Modal>
    </div>
  )
}

export default Resume