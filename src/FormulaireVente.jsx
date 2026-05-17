import { useEffect, useState } from "react"
import { supabase } from "./supabase"
import Modal from "./Modal"
import Spinner from "./Spinner"
import { formatDate } from "./dateUtils"
import SearchableSelect from "./SearchableSelect"
import Notification from "./Notification"

function Tag({ text, onRemove }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-700">
      {text}
      <button
        type="button"
        onClick={onRemove}
        className="ml-1 text-gray-400 hover:text-gray-600"
      >
        ✕
      </button>
    </span>
  )
}

function FormulaireVente({ recoltePourVente, clearRecoltePourVente }) {
  const [campagnes, setCampagnes] = useState([])
  const [campagneId, setCampagneId] = useState("")
  const [ventes, setVentes] = useState([])
  const [recoltesVendables, setRecoltesVendables] = useState([])
  const [parcelles, setParcelles] = useState([])

  const [loadingCampagnes, setLoadingCampagnes] = useState(true)
  const [loadingVentes, setLoadingVentes] = useState(false)
  const [loadingRecoltes, setLoadingRecoltes] = useState(false)
  const [modalOuvert, setModalOuvert] = useState(false)
  const [editingId, setEditingId] = useState(null)

  const [deleteVenteModalOpen, setDeleteVenteModalOpen] = useState(false)
  const [venteASupprimer, setVenteASupprimer] = useState(null)
  const [isDeletingVente, setIsDeletingVente] = useState(false)

  const [recolteId, setRecolteId] = useState("")
  const [dateVente, setDateVente] = useState("")
  const [prixKg, setPrixKg] = useState("")
  const [acheteur, setAcheteur] = useState("")

  const [message, setMessage] = useState("")
  const [messageType, setMessageType] = useState("info")
  const [errors, setErrors] = useState({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [pageCourante, setPageCourante] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [totalMontantGlobal, setTotalMontantGlobal] = useState(0)
  const [totalQuantiteVendueGlobal, setTotalQuantiteVendueGlobal] = useState(0)
  const [totalMontantFiltre, setTotalMontantFiltre] = useState(0)
  const [totalQuantiteVendueFiltree, setTotalQuantiteVendueFiltree] = useState(0)
  const [refreshKey, setRefreshKey] = useState(0)
  const ITEMS_PAR_PAGE = 10

  // Filtres ventes
  const [filtreDateDebutVente, setFiltreDateDebutVente] = useState("")
  const [filtreDateFinVente, setFiltreDateFinVente] = useState("")
  const [filtreParcelleIdVente, setFiltreParcelleIdVente] = useState("")
  const [filtreTypeOliveVente, setFiltreTypeOliveVente] = useState("")

  // Tri
  const [sortKey, setSortKey] = useState("date")
  const [sortDir, setSortDir] = useState("desc")

  // Popup de filtres
  const [filtersModalOpen, setFiltersModalOpen] = useState(false)
  const [tempFiltreDateDebutVente, setTempFiltreDateDebutVente] = useState("")
  const [tempFiltreDateFinVente, setTempFiltreDateFinVente] = useState("")
  const [tempFiltreParcelleIdVente, setTempFiltreParcelleIdVente] = useState("")
  const [tempFiltreTypeOliveVente, setTempFiltreTypeOliveVente] = useState("")

  // Effacement auto du message
  useEffect(() => {
    if (!message || messageType !== "success") return
    const timer = setTimeout(() => {
      setMessage("")
    }, 5000)
    return () => clearTimeout(timer)
  }, [message, messageType])

  // Campagnes
  useEffect(() => {
    async function loadCampagnes() {
      setLoadingCampagnes(true)
      const { data, error } = await supabase
        .from("campagne")
        .select("*")
        .eq("statut", "en_cours")
        .order("annee", { ascending: false })

      if (error) {
        console.error("Erreur campagnes ventes:", error)
        setMessageType("error")
        setMessage("Erreur lors du chargement des campagnes")
      } else {
        setCampagnes(data || [])
        if (recoltePourVente) {
          setCampagneId(String(recoltePourVente.campagne_id))
        } else if (data && data.length > 0) {
          setCampagneId(String(data[0].id))
        } else {
          setCampagneId("")
        }
      }
      setLoadingCampagnes(false)
    }
    loadCampagnes()
  }, [])

  const campagneSelectionnee = campagnes.find(
    (c) => String(c.id) === String(campagneId)
  )

  // Parcelles
  useEffect(() => {
    async function loadParcelles() {
      const { data, error } = await supabase
        .from("parcelles")
        .select("*")
        .order("nom", { ascending: true })

      if (error) {
        console.error("Erreur parcelles ventes:", error)
      } else {
        setParcelles(data || [])
      }
    }
    loadParcelles()
  }, [])

  function nomParcelleDepuisId(id) {
    const p = parcelles.find((par) => String(par.id) === String(id))
    return p ? p.nom : "-"
  }

  // Ventes — paginées + filtrées côté serveur, récolte embarquée
  useEffect(() => {
    async function loadVentes() {
      if (!campagneId) {
        setVentes([])
        setTotalCount(0)
        setTotalMontantGlobal(0)
        setTotalQuantiteVendueGlobal(0)
        setTotalMontantFiltre(0)
        setTotalQuantiteVendueFiltree(0)
        return
      }
      setLoadingVentes(true)
      const from = (pageCourante - 1) * ITEMS_PAR_PAGE
      const to = from + ITEMS_PAR_PAGE - 1

      // Si filtre parcelle/type : résoudre les recolte_ids correspondants
      let recolteIds = null
      if (filtreParcelleIdVente || filtreTypeOliveVente) {
        let rq = supabase
          .from("recolte_journaliere")
          .select("id")
          .eq("campagne_id", campagneId)
        if (filtreParcelleIdVente) rq = rq.eq("parcelle_id", filtreParcelleIdVente)
        if (filtreTypeOliveVente) rq = rq.eq("type_olive", filtreTypeOliveVente)
        const { data: rData } = await rq
        recolteIds = (rData || []).map((r) => r.id)
        if (recolteIds.length === 0) {
          setVentes([])
          setTotalCount(0)
          setTotalMontantFiltre(0)
          setTotalQuantiteVendueFiltree(0)
          setLoadingVentes(false)
          return
        }
      }

      let pageQuery = supabase
        .from("vente")
        .select(
          "id, campagne_id, recolte_id, date, quantite_kg, prix_kg_dt, montant_total_dt, acheteur, recolte:recolte_journaliere(id, parcelle_id, type_olive, date, quantite_kg, destination)",
          { count: "exact" }
        )
        .eq("campagne_id", campagneId)
        .order(
          sortKey,
          ["parcelle_id", "type_olive"].includes(sortKey)
            ? { referencedTable: "recolte_journaliere", ascending: sortDir === "asc" }
            : { ascending: sortDir === "asc" }
        )
        .range(from, to)

      let globalQuery = supabase
        .from("vente")
        .select("montant_total_dt, quantite_kg")
        .eq("campagne_id", campagneId)

      let filtreQuery = supabase
        .from("vente")
        .select("montant_total_dt, quantite_kg")
        .eq("campagne_id", campagneId)

      if (filtreDateDebutVente) {
        pageQuery = pageQuery.gte("date", filtreDateDebutVente)
        filtreQuery = filtreQuery.gte("date", filtreDateDebutVente)
      }
      if (filtreDateFinVente) {
        pageQuery = pageQuery.lte("date", filtreDateFinVente)
        filtreQuery = filtreQuery.lte("date", filtreDateFinVente)
      }
      if (recolteIds !== null) {
        pageQuery = pageQuery.in("recolte_id", recolteIds)
        filtreQuery = filtreQuery.in("recolte_id", recolteIds)
      }

      const [
        { data: pageData, error, count },
        { data: globalData },
        { data: filtreData },
      ] = await Promise.all([pageQuery, globalQuery, filtreQuery])

      if (error) {
        console.error("Erreur ventes:", error)
        setMessageType("error")
        setMessage("Erreur lors du chargement des ventes")
      } else {
        setVentes(pageData || [])
        setTotalCount(count || 0)
        setTotalMontantGlobal((globalData || []).reduce((s, v) => s + (v.montant_total_dt || 0), 0))
        setTotalQuantiteVendueGlobal((globalData || []).reduce((s, v) => s + (v.quantite_kg || 0), 0))
        setTotalMontantFiltre((filtreData || []).reduce((s, v) => s + (v.montant_total_dt || 0), 0))
        setTotalQuantiteVendueFiltree((filtreData || []).reduce((s, v) => s + (v.quantite_kg || 0), 0))
      }
      setLoadingVentes(false)
    }
    loadVentes()
  }, [campagneId, pageCourante, filtreDateDebutVente, filtreDateFinVente, filtreParcelleIdVente, filtreTypeOliveVente, refreshKey, sortKey, sortDir])

  // Récoltes vendables
  useEffect(() => {
    if (!campagneId) {
      setRecoltesVendables([])
      return
    }
    async function loadRecoltesVendables() {
      setLoadingRecoltes(true)
      const { data, error } = await supabase
        .from("recolte_journaliere")
        .select(
          `
          id,
          campagne_id,
          date,
          quantite_kg,
          type_olive,
          destination,
          est_vendu,
          parcelle_id
        `
        )
        .eq("campagne_id", campagneId)
        .eq("destination", "vente_brut")
        .eq("est_vendu", false)
        .order("date", { ascending: true })

      if (error) {
        console.error("Erreur recoltes vendables:", error)
        setMessageType("error")
        setMessage("Erreur lors du chargement des récoltes vendables")
      } else {
        setRecoltesVendables(data || [])
      }
      setLoadingRecoltes(false)
    }
    loadRecoltesVendables()
  }, [campagneId])

  function handleSort(key) {
    if (sortKey === key) {
      setSortDir(d => d === "asc" ? "desc" : "asc")
    } else {
      setSortKey(key)
      setSortDir("asc")
    }
    setPageCourante(1)
  }

  function getSortIndicator(key) {
    if (sortKey !== key) return <span className="ml-1 text-gray-400 text-xs">↕</span>
    return <span className="ml-1 text-xs">{sortDir === "asc" ? "↑" : "↓"}</span>
  }

  function resetForm() {
    setRecolteId("")
    setDateVente("")
    setPrixKg("")
    setAcheteur("")
    setEditingId(null)
    setMessage("")
    setMessageType("info")
    setErrors({})
    setIsSubmitting(false)
  }

  function ouvrirModalCreation() {
    resetForm()
    setModalOuvert(true)
  }

  function ouvrirModalEdition(vente) {
    setEditingId(vente.id)
    setRecolteId(vente.recolte_id || "")
    setDateVente(vente.date || "")
    setPrixKg(vente.prix_kg_dt ? String(vente.prix_kg_dt) : "")
    setAcheteur(vente.acheteur || "")
    setMessage("")
    setMessageType("info")
    setIsSubmitting(false)
    setModalOuvert(true)
  }

  function getRecolteFromId(id) {
    const fromVendables = recoltesVendables.find((r) => String(r.id) === String(id))
    if (fromVendables) return fromVendables
    for (const v of ventes) {
      if (v.recolte && String(v.recolte.id) === String(id)) return v.recolte
    }
    return null
  }

  function renderTypeLabel(type) {
    return type === "hay" ? "Hay" : "Nchrira"
  }

  function renderParcelleBadge(parcelleId) {
    const nom = nomParcelleDepuisId(parcelleId)
    if (!nom) return "-"

    const baseClass =
      "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"

    if (nom.toUpperCase().includes("CHOKRI")) {
      return (
        <span className={`${baseClass} bg-blue-50 text-blue-700`}>
          {nom}
        </span>
      )
    }

    if (nom.toUpperCase().includes("HBAIBA")) {
      return (
        <span className={`${baseClass} bg-amber-50 text-amber-700`}>
          {nom}
        </span>
      )
    }

    if (nom.toUpperCase().includes("SIDI")) {
      return (
        <span className={`${baseClass} bg-emerald-50 text-emerald-700`}>
          {nom}
        </span>
      )
    }

    return (
      <span className={`${baseClass} bg-gray-50 text-gray-700`}>
        {nom}
      </span>
    )
  }

  function renderTypeBadge(type) {
    const label = renderTypeLabel(type)
    const baseClass =
      "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"

    if (type === "hay") {
      return (
        <span className={`${baseClass} bg-green-50 text-green-700`}>
          {label}
        </span>
      )
    }

    if (type === "nchrira") {
      return (
        <span className={`${baseClass} bg-purple-50 text-purple-700`}>
          {label}
        </span>
      )
    }

    return (
      <span className={`${baseClass} bg-gray-50 text-gray-700`}>
        {label}
      </span>
    )
  }

  function getParcelleEtTypeFromVente(vente) {
    const r = getRecolteFromId(vente.recolte_id)
    if (!r) {
      return { parcelleId: null, type: null }
    }
    return {
      parcelleId: r.parcelle_id,
      type: r.type_olive,
    }
  }

  // Quand on arrive depuis Récolte avec une récolte à vendre
  useEffect(() => {
    if (!recoltePourVente) return

    setCampagneId(String(recoltePourVente.campagne_id))
    setRecolteId(String(recoltePourVente.id))
    setDateVente(recoltePourVente.date || "")
    setPrixKg("")
    setAcheteur("")
    setEditingId(null)
    setModalOuvert(true)

    if (clearRecoltePourVente) {
      clearRecoltePourVente()
    }
  }, [recoltePourVente])

  async function handleSubmit(e) {
    e.preventDefault()
    if (isSubmitting) return
    setIsSubmitting(true)
    setMessage("")

    try {
      if (!campagneId) {
        setMessageType("error")
        setMessage("Veuillez sélectionner une campagne")
        return
      }
      const newErrors = {}
      if (!recolteId) newErrors.recolteId = "Veuillez sélectionner une récolte"
      if (!dateVente) newErrors.dateVente = "La date de vente est obligatoire"
      if (!prixKg) newErrors.prixKg = "Le prix au kg est obligatoire"
      else if (parseFloat(prixKg) <= 0) newErrors.prixKg = "Le prix doit être positif"
      if (Object.keys(newErrors).length > 0) {
        setErrors(newErrors)
        return
      }

      let recolte = getRecolteFromId(recolteId)
      if (!recolte) {
        const { data, error } = await supabase
          .from("recolte_journaliere")
          .select(
            "id, quantite_kg, est_vendu, destination, parcelle_id, type_olive"
          )
          .eq("id", recolteId)
          .maybeSingle()

        if (error || !data) {
          console.error("Recolte introuvable pour la vente:", error)
          setMessageType("error")
          setMessage("Récolte introuvable pour la vente")
          return
        }
        recolte = data
      }

      if (!editingId && recolte.est_vendu) {
        setMessageType("error")
        setMessage("Cette récolte est déjà marquée comme vendue")
        return
      }

      if (recolte.destination && recolte.destination !== "vente_brut") {
        setMessageType("error")
        setMessage(
          "Seules les récoltes avec destination 'vente_brut' peuvent être vendues"
        )
        return
      }

      const quantiteVendu = recolte.quantite_kg || 0
      const prix = Number(prixKg)

      let errorVente

      if (editingId) {
        const { error } = await supabase
          .from("vente")
          .update({
            prix_kg_dt: prix,
            acheteur: acheteur || null,
          })
          .eq("id", editingId)

        errorVente = error
      } else {
        const { error } = await supabase.from("vente").insert([
          {
            campagne_id: campagneId,
            recolte_id: recolteId,
            date: dateVente,
            quantite_kg: quantiteVendu,
            prix_kg_dt: prix,
            acheteur: acheteur || null,
          },
        ])
        errorVente = error
      }

      if (errorVente) {
        console.error("Erreur enregistrement vente:", errorVente)
        setMessageType("error")
        setMessage("Erreur lors de l'enregistrement de la vente")
        return
      }

      if (!editingId) {
        const { error: errorUpdateRecolte } = await supabase
          .from("recolte_journaliere")
          .update({ est_vendu: true })
          .eq("id", recolteId)

        if (errorUpdateRecolte) {
          console.error("Erreur mise à jour récolte:", errorUpdateRecolte)
          setMessageType("error")
          setMessage(
            "Vente enregistrée, mais erreur lors de la mise à jour de la récolte"
          )
        }
      }

      if (!editingId) {
        setRecoltesVendables(prev => prev.filter(r => String(r.id) !== String(recolteId)))
      }
      setRefreshKey((k) => k + 1)
      if (!editingId) setPageCourante(1)
      setMessageType("success")
      setMessage(
        editingId
          ? "Vente mise à jour avec succès"
          : "Vente enregistrée avec succès"
      )
      setModalOuvert(false)
      setEditingId(null)
    } finally {
      setIsSubmitting(false)
    }
  }

  function handleDelete(id) {
    const vente = ventes.find((v) => v.id === id)
    if (!vente) return
    setVenteASupprimer(vente)
    setDeleteVenteModalOpen(true)
  }

  async function confirmerAnnulationVente() {
    if (!venteASupprimer) return
    setIsDeletingVente(true)

    try {
      const { data: venteToDelete, error: errorSelect } = await supabase
        .from("vente")
        .select("id, recolte_id")
        .eq("id", venteASupprimer.id)
        .maybeSingle()

      if (errorSelect) {
        console.error("Erreur sélection vente à supprimer:", errorSelect)
        setMessageType("error")
        setMessage("Erreur lors de la récupération de la vente")
        return
      }

      const { error } = await supabase.from("vente").delete().eq("id", venteASupprimer.id)

      if (error) {
        console.error("Erreur suppression vente:", error)
        setMessageType("error")
        setMessage("Erreur lors de l'annulation de la vente")
        return
      }

      if (venteToDelete && venteToDelete.recolte_id) {
        const { error: errorRecolte } = await supabase
          .from("recolte_journaliere")
          .update({ est_vendu: false })
          .eq("id", venteToDelete.recolte_id)

        if (errorRecolte) {
          console.error("Erreur remise récolte à disponible:", errorRecolte)
        }
      }

      const { data: recoltesVendablesData } = await supabase
        .from("recolte_journaliere")
        .select("id, campagne_id, date, quantite_kg, type_olive, destination, est_vendu, parcelle_id")
        .eq("campagne_id", campagneId)
        .eq("destination", "vente_brut")
        .eq("est_vendu", false)
        .order("date", { ascending: true })

      setRecoltesVendables(recoltesVendablesData || [])
      const itemsRestants = totalCount - 1
      const nouvellesPages = Math.ceil(itemsRestants / ITEMS_PAR_PAGE)
      setPageCourante(Math.min(pageCourante, Math.max(1, nouvellesPages)))
      setRefreshKey((k) => k + 1)
      setMessageType("success")
      setMessage("Vente annulée et récolte remise disponible")
      setDeleteVenteModalOpen(false)
      setVenteASupprimer(null)
    } finally {
      setIsDeletingVente(false)
    }
  }

  function handleResetFilters() {
    setFiltreDateDebutVente("")
    setFiltreDateFinVente("")
    setFiltreParcelleIdVente("")
    setFiltreTypeOliveVente("")
    setPageCourante(1)
  }

  function openFiltersModal() {
    setTempFiltreDateDebutVente(filtreDateDebutVente || "")
    setTempFiltreDateFinVente(filtreDateFinVente || "")
    setTempFiltreParcelleIdVente(filtreParcelleIdVente || "")
    setTempFiltreTypeOliveVente(filtreTypeOliveVente || "")
    setFiltersModalOpen(true)
  }

  function applyFiltersFromModal() {
    setFiltreDateDebutVente(tempFiltreDateDebutVente || "")
    setFiltreDateFinVente(tempFiltreDateFinVente || "")
    setFiltreParcelleIdVente(tempFiltreParcelleIdVente || "")
    setFiltreTypeOliveVente(tempFiltreTypeOliveVente || "")
    setPageCourante(1)
    setFiltersModalOpen(false)
  }

  const hasActiveFilters =
    !!filtreDateDebutVente ||
    !!filtreDateFinVente ||
    !!filtreParcelleIdVente ||
    !!filtreTypeOliveVente

  const nombreFiltresActifs = [
    filtreDateDebutVente,
    filtreDateFinVente,
    filtreParcelleIdVente,
    filtreTypeOliveVente,
  ].filter(Boolean).length

  const totalPagesVentes = Math.max(1, Math.ceil(totalCount / ITEMS_PAR_PAGE))

  function getPageNumbers() {
    if (totalPagesVentes <= 7) return Array.from({ length: totalPagesVentes }, (_, i) => i + 1)
    const pages = [1]
    if (pageCourante > 3) pages.push("…")
    for (let i = Math.max(2, pageCourante - 1); i <= Math.min(totalPagesVentes - 1, pageCourante + 1); i++) pages.push(i)
    if (pageCourante < totalPagesVentes - 2) pages.push("…")
    pages.push(totalPagesVentes)
    return pages
  }
  const prixMoyenGlobal = totalQuantiteVendueGlobal > 0
    ? totalMontantGlobal / totalQuantiteVendueGlobal : 0
  const prixMoyenFiltre = totalQuantiteVendueFiltree > 0
    ? totalMontantFiltre / totalQuantiteVendueFiltree : 0

  return (
    <div className="space-y-4">
      {/* Header + campagne + bouton */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">
            Ventes (olives brutes)
          </h2>
          <p className="text-sm text-gray-500">
            Enregistre les ventes d&apos;olives pour chaque récolte vendue en
            totalité.
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              Campagne active
            </label>
            {loadingCampagnes ? (
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <div className="w-4 h-4 border-2 border-gray-200 border-t-blue-500 rounded-full animate-spin" />
                Chargement des campagnes...
              </div>
            ) : campagnes.length === 0 ? (
              <div className="text-sm text-red-500">
                Aucune campagne en cours.
              </div>
            ) : (
              <select
                value={campagneId}
                onChange={(e) => { setCampagneId(e.target.value); setPageCourante(1) }}
                className="rounded-md border border-gray-300 px-3 py-1.5 text-sm shadow-sm focus:border-olive-500 focus:ring-olive-500"
              >
                {campagnes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.annee} – {c.statut}
                  </option>
                ))}
              </select>
            )}
          </div>

          <button
            type="button"
            onClick={ouvrirModalCreation}
            className="inline-flex items-center justify-center rounded-md bg-olive-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-olive-700 focus:outline-none focus:ring-2 focus:ring-olive-500 focus:ring-offset-2 disabled:opacity-50"
            disabled={!campagneId}
          >
            + Nouvelle vente
          </button>
        </div>
      </div>

      {/* Messages */}
      <Notification message={message} type={messageType} onDismiss={() => setMessage("")} />

      {/* Encadrés : total + prix moyen (global et filtré) */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div className="rounded-md bg-white px-4 py-3 shadow-sm border border-gray-200">
          <p className="text-sm text-gray-700">
            Total vendu pour la campagne{" "}
            {campagneSelectionnee ? campagneSelectionnee.annee : "-"} :{" "}
            <span className="font-semibold">
              {totalMontantGlobal.toLocaleString("fr-FR", {
                minimumFractionDigits: 3,
                maximumFractionDigits: 3,
              })}{" "}
              DT
            </span>
          </p>
          {hasActiveFilters && (
            <p className="text-xs text-gray-500 mt-1">
              Sur la sélection filtrée :{" "}
              <span className="font-semibold">
                {totalMontantFiltre.toLocaleString("fr-FR", {
                  minimumFractionDigits: 3,
                  maximumFractionDigits: 3,
                })}{" "}
                DT{" "}

              </span>
            </p>
          )}
        </div>

        <div className="rounded-md bg-white px-4 py-3 shadow-sm border border-gray-200">
          <p className="text-sm text-gray-700">
            Prix moyen global{" "}
            {campagneSelectionnee ? `(${campagneSelectionnee.annee})` : ""} :{" "}
            <span className="font-semibold">
              {prixMoyenGlobal.toLocaleString("fr-FR", {
                minimumFractionDigits: 3,
                maximumFractionDigits: 3,
              })}{" "}
              DT / kg
            </span>
          </p>
          {hasActiveFilters && (
            <p className="text-xs text-gray-500 mt-1">
              Prix moyen sur la sélection filtrée :{" "}
              <span className="font-semibold">
                {prixMoyenFiltre.toLocaleString("fr-FR", {
                  minimumFractionDigits: 3,
                  maximumFractionDigits: 3,
                })}{" "}
                DT / kg
              </span>
            </p>
          )}
        </div>
      </div>

      {/* Barre de contrôle filtres */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={openFiltersModal}
            className="inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
          >
            Filtres
            {hasActiveFilters && (
              <span className="ml-2 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-olive-600 px-1 text-xs font-semibold text-white">
                {nombreFiltresActifs}
              </span>
            )}
          </button>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
            >
              Réinitialiser les filtres
            </button>
          )}
        </div>

        {/* Tags de filtres actifs */}
        {hasActiveFilters && (
          <div className="flex flex-wrap gap-2">
            {filtreDateDebutVente && (
              <Tag
                text={`Du : ${formatDate(filtreDateDebutVente)}`}
                onRemove={() => { setFiltreDateDebutVente(""); setPageCourante(1) }}
              />
            )}
            {filtreDateFinVente && (
              <Tag
                text={`Au : ${formatDate(filtreDateFinVente)}`}
                onRemove={() => { setFiltreDateFinVente(""); setPageCourante(1) }}
              />
            )}
            {filtreParcelleIdVente && (
              <Tag
                text={`Parcelle : ${nomParcelleDepuisId(filtreParcelleIdVente)}`}
                onRemove={() => { setFiltreParcelleIdVente(""); setPageCourante(1) }}
              />
            )}
            {filtreTypeOliveVente && (
              <Tag
                text={`Type : ${filtreTypeOliveVente === "hay" ? "Hay" : "Nchrira"}`}
                onRemove={() => { setFiltreTypeOliveVente(""); setPageCourante(1) }}
              />
            )}
          </div>
        )}
      </div>

      {/* Tableau des ventes */}
      <div className="mt-4">
        {loadingVentes ? (
          <Spinner message="Chargement des ventes..." />
        ) : totalCount === 0 ? (
          <p className="text-sm text-gray-500">
            Aucune vente ne correspond aux filtres pour cette campagne.
          </p>
        ) : (
          <>
          {/* Vue cartes — mobile uniquement */}
          <div className="md:hidden space-y-2 mb-2">
            {ventes.map((v) => {
              const { parcelleId, type } = getParcelleEtTypeFromVente(v)
              return (
                <div key={v.id} className="rounded-lg border border-gray-200 bg-white p-3 shadow-sm">
                  {/* Date + Infos récolte */}
                  <div className="flex items-start justify-between mb-1">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{formatDate(v.date)}</p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {parcelleId != null ? renderParcelleBadge(parcelleId) : null}
                        {type != null ? renderTypeBadge(type) : null}
                      </div>
                    </div>
                    {/* Montant total */}
                    <div className="text-right">
                      <p className="text-xl font-bold text-emerald-700">{v.montant_total_dt?.toLocaleString("fr-FR", { minimumFractionDigits: 3, maximumFractionDigits: 3 })} DT</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {v.quantite_kg?.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kg · {v.prix_kg_dt?.toLocaleString("fr-FR", { minimumFractionDigits: 3, maximumFractionDigits: 3 })} DT/kg
                      </p>
                    </div>
                  </div>
                  {v.acheteur && <p className="text-xs text-gray-400 mt-1 mb-2">{v.acheteur}</p>}
                  <div className="flex items-center gap-3 pt-2 border-t border-gray-100">
                    <button type="button" onClick={() => ouvrirModalEdition(v)} className="text-xs font-medium text-olive-700 hover:text-olive-900">Modifier</button>
                    <button type="button" onClick={() => handleDelete(v.id)} className="text-xs font-medium text-red-600 hover:text-red-800 ml-auto">Annuler la vente</button>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Vue tableau — desktop uniquement */}
          <div className="hidden md:block overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left font-medium text-gray-600 cursor-pointer select-none hover:bg-gray-100" onClick={() => handleSort("date")}>
                    Date {getSortIndicator("date")}
                  </th>
                  <th className="px-3 py-2 text-left font-medium text-gray-600 cursor-pointer select-none hover:bg-gray-100" onClick={() => handleSort("parcelle_id")}>
                    Parcelle {getSortIndicator("parcelle_id")}
                  </th>
                  <th className="px-3 py-2 text-left font-medium text-gray-600 cursor-pointer select-none hover:bg-gray-100" onClick={() => handleSort("type_olive")}>
                    Type d'olive {getSortIndicator("type_olive")}
                  </th>
                  <th className="px-3 py-2 text-right font-medium text-gray-600 cursor-pointer select-none hover:bg-gray-100" onClick={() => handleSort("quantite_kg")}>
                    Quantité (kg) {getSortIndicator("quantite_kg")}
                  </th>
                  <th className="px-3 py-2 text-right font-medium text-gray-600 cursor-pointer select-none hover:bg-gray-100" onClick={() => handleSort("prix_kg_dt")}>
                    Prix / kg {getSortIndicator("prix_kg_dt")}
                  </th>
                  <th className="px-3 py-2 text-right font-medium text-gray-600 cursor-pointer select-none hover:bg-gray-100" onClick={() => handleSort("montant_total_dt")}>
                    Montant total {getSortIndicator("montant_total_dt")}
                  </th>
                  <th className="px-3 py-2 text-left font-medium text-gray-600 cursor-pointer select-none hover:bg-gray-100" onClick={() => handleSort("acheteur")}>
                    Acheteur {getSortIndicator("acheteur")}
                  </th>
                  <th className="px-3 py-2 text-right font-medium text-gray-600">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {ventes.map((v) => {
                  const { parcelleId, type } = getParcelleEtTypeFromVente(v)
                  return (
                    <tr key={v.id}>
                      <td className="px-3 py-2 text-gray-800">{formatDate(v.date)}</td>
                      <td className="px-3 py-2">
                        {parcelleId != null
                          ? renderParcelleBadge(parcelleId)
                          : "-"}
                      </td>
                      <td className="px-3 py-2">
                        {type != null ? renderTypeBadge(type) : "-"}
                      </td>
                      <td className="px-3 py-2 text-right text-gray-800">
                        {v.quantite_kg?.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kg
                      </td>
                      <td className="px-3 py-2 text-right text-gray-800">
                        {v.prix_kg_dt?.toLocaleString("fr-FR", {
                          minimumFractionDigits: 3,
                          maximumFractionDigits: 3,
                        })}{" "}
                        DT
                      </td>
                      <td className="px-3 py-2 text-right text-gray-800">
                        {v.montant_total_dt?.toLocaleString("fr-FR", {
                          minimumFractionDigits: 3,
                          maximumFractionDigits: 3,
                        })}{" "}
                        DT
                      </td>
                      <td className="px-3 py-2 text-gray-800">
                        {v.acheteur || "-"}
                      </td>
                      <td className="px-3 py-2 text-right space-x-2">
                        <button
                          type="button"
                          onClick={() => ouvrirModalEdition(v)}
                          className="text-xs font-medium text-olive-700 hover:text-olive-900"
                        >
                          Modifier
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(v.id)}
                          className="text-xs font-medium text-red-600 hover:text-red-800"
                        >
                          Annuler la vente
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          {totalPagesVentes > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-2 mt-3 px-1">
              <p className="text-sm text-gray-500">
                {(pageCourante - 1) * ITEMS_PAR_PAGE + 1}–{Math.min(pageCourante * ITEMS_PAR_PAGE, totalCount)} sur {totalCount} ventes
              </p>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setPageCourante((p) => Math.max(1, p - 1))}
                  disabled={pageCourante === 1}
                  className="rounded-md border border-gray-300 bg-white px-2.5 py-1 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40"
                >
                  ←
                </button>
                {getPageNumbers().map((p, i) =>
                  p === "…" ? (
                    <span key={`ellipsis-${i}`} className="px-1 text-sm text-gray-400">…</span>
                  ) : (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPageCourante(p)}
                      className={`rounded-md border px-2.5 py-1 text-sm font-medium ${
                        p === pageCourante
                          ? "border-olive-600 bg-olive-600 text-white"
                          : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                      }`}
                    >
                      {p}
                    </button>
                  )
                )}
                <button
                  type="button"
                  onClick={() => setPageCourante((p) => Math.min(totalPagesVentes, p + 1))}
                  disabled={pageCourante === totalPagesVentes}
                  className="rounded-md border border-gray-300 bg-white px-2.5 py-1 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40"
                >
                  →
                </button>
              </div>
            </div>
          )}
          </>
        )}
      </div>

      {/* Modal confirmation annulation vente */}
      <Modal
        isOpen={deleteVenteModalOpen}
        onClose={() => {
          if (isDeletingVente) return
          setDeleteVenteModalOpen(false)
          setVenteASupprimer(null)
        }}
        title="Annuler la vente"
        size="medium"
      >
        {venteASupprimer && (
          <div className="space-y-4">
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
              <p className="font-semibold mb-1">
                Vous êtes sur le point d&apos;annuler la vente du{" "}
                {formatDate(venteASupprimer.date)}.
              </p>
              <p>
                Quantité :{" "}
                <span className="font-semibold">
                  {venteASupprimer.quantite_kg?.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kg
                </span>
                {venteASupprimer.acheteur && (
                  <>
                    {" "}— Acheteur :{" "}
                    <span className="font-semibold">{venteASupprimer.acheteur}</span>
                  </>
                )}
              </p>
              <p className="mt-2">
                La récolte associée sera remise en statut{" "}
                <span className="font-semibold">Disponible</span>.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setDeleteVenteModalOpen(false)
                  setVenteASupprimer(null)
                }}
                disabled={isDeletingVente}
                className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 disabled:opacity-50"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={confirmerAnnulationVente}
                disabled={isDeletingVente}
                className="inline-flex items-center justify-center rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50"
              >
                {isDeletingVente ? "Annulation..." : "Confirmer l'annulation"}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal de filtres */}
      <Modal
        isOpen={filtersModalOpen}
        onClose={() => setFiltersModalOpen(false)}
        title="Filtres des ventes"
        size="medium"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-gray-600">
                Date de vente du
              </label>
              <input
                type="date"
                value={tempFiltreDateDebutVente}
                onChange={(e) => setTempFiltreDateDebutVente(e.target.value)}
                className="mt-1 block w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm shadow-sm focus:border-olive-500 focus:ring-olive-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600">
                Au
              </label>
              <input
                type="date"
                value={tempFiltreDateFinVente}
                onChange={(e) => setTempFiltreDateFinVente(e.target.value)}
                className="mt-1 block w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm shadow-sm focus:border-olive-500 focus:ring-olive-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600">
                Parcelle
              </label>
              <SearchableSelect
                value={tempFiltreParcelleIdVente}
                onChange={setTempFiltreParcelleIdVente}
                options={[{ value: "", label: "Toutes les parcelles" }, ...parcelles.map(p => ({ value: p.id, label: p.nom }))]}
                placeholder="Toutes les parcelles"
                className="mt-1 block w-full"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600">
                Type d&apos;olive
              </label>
              <select
                value={tempFiltreTypeOliveVente}
                onChange={(e) => setTempFiltreTypeOliveVente(e.target.value)}
                className="mt-1 block w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm shadow-sm focus:border-olive-500 focus:ring-olive-500"
              >
                <option value="">Tous les types</option>
                <option value="hay">Hay</option>
                <option value="nchrira">Nchrira</option>
              </select>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setFiltersModalOpen(false)}
              className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={applyFiltersFromModal}
              className="inline-flex items-center justify-center rounded-md bg-olive-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-olive-700 focus:outline-none focus:ring-2 focus:ring-olive-500 focus:ring-offset-2"
            >
              Appliquer
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal */}
      <Modal
        isOpen={modalOuvert}
        onClose={() => {
          setModalOuvert(false)
          setEditingId(null)
        }}
        title={editingId ? "Modifier une vente" : "Nouvelle vente"}
        size="large"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700">
                Récolte vendue (vente brute)
              </label>
              {loadingRecoltes ? (
                <div className="mt-1 flex items-center gap-2 text-sm text-gray-500">
                  <div className="w-4 h-4 border-2 border-gray-200 border-t-blue-500 rounded-full animate-spin" />
                  Chargement des récoltes vendables...
                </div>
              ) : recoltesVendables.length === 0 && !editingId ? (
                <p className="mt-1 text-sm text-red-500">
                  Aucune récolte disponible pour la vente brute (soit déjà
                  vendue, soit destination différente).
                </p>
              ) : (
                <>
                <select
                  value={recolteId}
                  onChange={(e) => { setRecolteId(e.target.value); setErrors(prev => ({ ...prev, recolteId: "" })) }}
                  onBlur={() => { if (!recolteId) setErrors(prev => ({ ...prev, recolteId: "Veuillez sélectionner une récolte" })) }}
                  className={`mt-1 block w-full rounded-md border px-3 py-2 text-sm shadow-sm focus:ring-1 ${errors.recolteId ? "border-red-300 focus:border-red-500 focus:ring-red-500" : "border-gray-300 focus:border-olive-500 focus:ring-olive-500"}`}
                  disabled={!!editingId}
                >
                  <option value="">Sélectionner une récolte</option>
                  {recoltesVendables.map((r) => {
                    const typeLabel = renderTypeLabel(r.type_olive)
                    const parcelleNom = nomParcelleDepuisId(r.parcelle_id)
                    return (
                      <option key={r.id} value={r.id}>
                        {formatDate(r.date)} – {parcelleNom} – {typeLabel} –{" "}
                        {r.quantite_kg} kg
                      </option>
                    )
                  })}
                  {editingId &&
                    !recoltesVendables.some(
                      (r) => String(r.id) === String(recolteId)
                    ) &&
                    (() => {
                      const r = getRecolteFromId(recolteId)
                      if (!r) return null
                      const typeLabel = renderTypeLabel(r.type_olive)
                      const parcelleNom = nomParcelleDepuisId(r.parcelle_id)
                      return (
                        <option value={r.id}>
                          {formatDate(r.date)} – {parcelleNom} – {typeLabel} –{" "}
                          {r.quantite_kg} kg
                        </option>
                      )
                    })()}
                </select>
                {errors.recolteId && <p className="mt-1 text-xs text-red-600">{errors.recolteId}</p>}
                </>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Date de vente <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={dateVente || ""}
                onChange={(e) => { setDateVente(e.target.value); setErrors(prev => ({ ...prev, dateVente: "" })) }}
                onBlur={() => { if (!dateVente) setErrors(prev => ({ ...prev, dateVente: "La date de vente est obligatoire" })) }}
                className={`mt-1 block w-full rounded-md border px-3 py-2 text-sm shadow-sm focus:ring-1 ${errors.dateVente ? "border-red-300 focus:border-red-500 focus:ring-red-500" : "border-gray-300 focus:border-olive-500 focus:ring-olive-500"}`}
                disabled={!!editingId}
              />
              {errors.dateVente && <p className="mt-1 text-xs text-red-600">{errors.dateVente}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Prix au kg (DT) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min="0"
                step="0.001"
                value={prixKg}
                onChange={(e) => { setPrixKg(e.target.value); setErrors(prev => ({ ...prev, prixKg: "" })) }}
                onBlur={() => {
                  if (!prixKg) setErrors(prev => ({ ...prev, prixKg: "Le prix au kg est obligatoire" }))
                  else if (parseFloat(prixKg) <= 0) setErrors(prev => ({ ...prev, prixKg: "Le prix doit être positif" }))
                }}
                className={`mt-1 block w-full rounded-md border px-3 py-2 text-sm shadow-sm focus:ring-1 ${errors.prixKg ? "border-red-300 focus:border-red-500 focus:ring-red-500" : "border-gray-300 focus:border-olive-500 focus:ring-olive-500"}`}
              />
              {errors.prixKg && <p className="mt-1 text-xs text-red-600">{errors.prixKg}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Acheteur (optionnel)
              </label>
              <input
                type="text"
                value={acheteur}
                onChange={(e) => setAcheteur(e.target.value)}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-olive-500 focus:ring-olive-500"
                placeholder="Nom de l'acheteur"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Quantité vendue
              </label>
              <input
                type="text"
                readOnly
                value={
                  recolteId
                    ? (() => {
                        const r = getRecolteFromId(recolteId)
                        return r
                          ? `${r.quantite_kg} kg (100% de la récolte)`
                          : ""
                      })()
                    : ""
                }
                className="mt-1 block w-full rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => {
                setModalOuvert(false)
                setEditingId(null)
              }}
              className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center justify-center rounded-md bg-olive-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-olive-700 focus:outline-none focus:ring-2 focus:ring-olive-500 focus:ring-offset-2 disabled:opacity-50"
            >
              {isSubmitting
                ? "Traitement en cours..."
                : editingId
                ? "Mettre à jour"
                : "Enregistrer"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

export default FormulaireVente