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

function FormulaireRecolte({ onDemanderVente }) {
  const [campagnes, setCampagnes] = useState([])
  const [campagneId, setCampagneId] = useState("")
  const [recoltes, setRecoltes] = useState([])
  const [parcelles, setParcelles] = useState([])

  const [loadingCampagnes, setLoadingCampagnes] = useState(true)
  const [loadingRecoltes, setLoadingRecoltes] = useState(false)
  const [modalOuvert, setModalOuvert] = useState(false)
  const [editingId, setEditingId] = useState(null)

  const [dateRecolte, setDateRecolte] = useState("")
  const [parcelleId, setParcelleId] = useState("")
  const [typeOlive, setTypeOlive] = useState("hay")
  const [quantiteKg, setQuantiteKg] = useState("")
  const [nbSachets, setNbSachets] = useState("")
  const [quantiteL, setQuantiteL] = useState("")
  const [destination, setDestination] = useState("vente_brut")

  const [message, setMessage] = useState("")
  const [messageType, setMessageType] = useState("info")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [formError, setFormError] = useState("")
  const [editError, setEditError] = useState("")
  const [errors, setErrors] = useState({})

  const [recolteDoublon, setRecolteDoublon] = useState(null)
  const [doublonChoiceVisible, setDoublonChoiceVisible] = useState(false)

  // Filtres appliqués (plus de dates)
  const [filtreParcelleId, setFiltreParcelleId] = useState("")
  const [filtreTypeOlive, setFiltreTypeOlive] = useState("")
  const [filtreDestination, setFiltreDestination] = useState("")

  // Tri
  const [sortKey, setSortKey] = useState("date")
  const [sortDir, setSortDir] = useState("desc")

  // Popup de filtres
  const [filtersModalOpen, setFiltersModalOpen] = useState(false)
  const [tempFiltreParcelleId, setTempFiltreParcelleId] = useState("")
  const [tempFiltreTypeOlive, setTempFiltreTypeOlive] = useState("")
  const [tempFiltreDestination, setTempFiltreDestination] = useState("")

  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [recolteASupprimer, setRecolteASupprimer] = useState(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const [editingEstVendu, setEditingEstVendu] = useState(false)
  const [confirmVenduModalOpen, setConfirmVenduModalOpen] = useState(false)
  const [confirmVenduStep, setConfirmVenduStep] = useState(1)
  const [recolteAModifier, setRecolteAModifier] = useState(null)
  const [venteAssociee, setVenteAssociee] = useState(null)
  const [loadingVenteAssociee, setLoadingVenteAssociee] = useState(false)
  const [modifierPrixVente, setModifierPrixVente] = useState(false)
  const [ventePrixKg, setVentePrixKg] = useState("")
  const [venteAcheteur, setVenteAcheteur] = useState("")

  const [pageCourante, setPageCourante] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [totalKgGlobal, setTotalKgGlobal] = useState(0)
  const [totalKgFiltre, setTotalKgFiltre] = useState(0)
  const [refreshKey, setRefreshKey] = useState(0)

  const ITEMS_PAR_PAGE = 10

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
        console.error("Erreur chargement campagnes:", error)
        setMessageType("error")
        setMessage("Erreur lors du chargement des campagnes")
      } else {
        setCampagnes(data || [])
        if (data && data.length > 0) {
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
        console.error("Erreur chargement parcelles:", error)
        setMessageType("error")
        setMessage("Erreur lors du chargement des parcelles")
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

  function renderDestinationLabel(dest) {
    if (dest === "vente_brut") return "Vente brute"
    if (dest === "huile_perso") return "Huile - Perso"
    return dest || "-"
  }

  // Récoltes — paginées + filtrées côté serveur
  useEffect(() => {
    async function loadRecoltes() {
      if (!campagneId) {
        setRecoltes([])
        setTotalCount(0)
        setTotalKgGlobal(0)
        setTotalKgFiltre(0)
        return
      }

      setLoadingRecoltes(true)

      const from = (pageCourante - 1) * ITEMS_PAR_PAGE
      const to = from + ITEMS_PAR_PAGE - 1

      let pageQuery = supabase
        .from("recolte_journaliere")
        .select(
          "id, campagne_id, date, parcelle_id, type_olive, quantite_kg, nb_sachets, quantite_litres, destination, est_vendu",
          { count: "exact" }
        )
        .eq("campagne_id", campagneId)
        .order(sortKey, { ascending: sortDir === "asc" })
        .range(from, to)

      let globalQuery = supabase
        .from("recolte_journaliere")
        .select("quantite_kg")
        .eq("campagne_id", campagneId)

      let filtreQuery = supabase
        .from("recolte_journaliere")
        .select("quantite_kg")
        .eq("campagne_id", campagneId)

      if (filtreParcelleId) {
        pageQuery = pageQuery.eq("parcelle_id", filtreParcelleId)
        filtreQuery = filtreQuery.eq("parcelle_id", filtreParcelleId)
      }

      if (filtreTypeOlive) {
        pageQuery = pageQuery.eq("type_olive", filtreTypeOlive)
        filtreQuery = filtreQuery.eq("type_olive", filtreTypeOlive)
      }

      if (filtreDestination) {
        pageQuery = pageQuery.eq("destination", filtreDestination)
        filtreQuery = filtreQuery.eq("destination", filtreDestination)
      }

      const [
        { data: pageData, error, count },
        { data: globalData },
        { data: filtreData },
      ] = await Promise.all([pageQuery, globalQuery, filtreQuery])

      if (error) {
        console.error("Erreur chargement récoltes:", error)
        setMessageType("error")
        setMessage("Erreur lors du chargement des récoltes")
      } else {
        setRecoltes(pageData || [])
        setTotalCount(count || 0)
        setTotalKgGlobal(
          (globalData || []).reduce(
            (s, r) => s + (r.quantite_kg || 0),
            0
          )
        )
        setTotalKgFiltre(
          (filtreData || []).reduce(
            (s, r) => s + (r.quantite_kg || 0),
            0
          )
        )
      }

      setLoadingRecoltes(false)
    }

    loadRecoltes()
  }, [
    campagneId,
    pageCourante,
    filtreParcelleId,
    filtreTypeOlive,
    filtreDestination,
    refreshKey,
    sortKey,
    sortDir,
  ])

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
    setDateRecolte("")
    setParcelleId("")
    setTypeOlive("hay")
    setQuantiteKg("")
    setNbSachets("")
    setQuantiteL("")
    setDestination("vente_brut")
    setEditingId(null)
    setMessage("")
    setMessageType("info")
    setFormError("")
    setEditError("")
    setErrors({})
    setRecolteDoublon(null)
    setDoublonChoiceVisible(false)
    setIsSubmitting(false)
    setEditingEstVendu(false)
    setModifierPrixVente(false)
    setVentePrixKg("")
    setVenteAcheteur("")
  }

  function ouvrirModalCreation() {
    resetForm()
    setModalOuvert(true)
  }

  function ouvrirModalEdition(recolte) {
    setEditingEstVendu(!!(recolte.est_vendu && recolte.destination !== "huile_perso"))
    setEditingId(recolte.id)
    setDateRecolte(recolte.date || "")
    setParcelleId(recolte.parcelle_id ? String(recolte.parcelle_id) : "")
    setTypeOlive(recolte.type_olive || "hay")
    setQuantiteKg(
      recolte.quantite_kg != null ? String(recolte.quantite_kg) : ""
    )
    setNbSachets(
      recolte.nb_sachets != null ? String(recolte.nb_sachets) : ""
    )
    setQuantiteL(
      recolte.quantite_litres != null ? String(recolte.quantite_litres) : ""
    )
    setDestination(recolte.destination || "vente_brut")
    setMessage("")
    setMessageType("info")
    setFormError("")
    setEditError("")
    setErrors({})
    setRecolteDoublon(null)
    setDoublonChoiceVisible(false)
    setIsSubmitting(false)
    setModalOuvert(true)
  }

  function renderTypeLabel(type) {
    return type === "hay" ? "Hay" : "Nchrira"
  }

  function renderParcelleBadge(parcelleId) {
    const nom = nomParcelleDepuisId(parcelleId)
    if (!nom || nom === "-") return "-"
    const baseClass =
      "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
    if (nom.toUpperCase().includes("CHOKRI"))
      return <span className={`${baseClass} bg-blue-50 text-blue-700`}>{nom}</span>
    if (nom.toUpperCase().includes("HBAIBA"))
      return <span className={`${baseClass} bg-amber-50 text-amber-700`}>{nom}</span>
    if (nom.toUpperCase().includes("SIDI"))
      return <span className={`${baseClass} bg-emerald-50 text-emerald-700`}>{nom}</span>
    return <span className={`${baseClass} bg-gray-50 text-gray-700`}>{nom}</span>
  }

  function renderTypeBadge(type) {
    const label = renderTypeLabel(type)
    const baseClass =
      "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
    if (type === "hay")
      return <span className={`${baseClass} bg-green-50 text-green-700`}>{label}</span>
    if (type === "nchrira")
      return <span className={`${baseClass} bg-purple-50 text-purple-700`}>{label}</span>
    return <span className={`${baseClass} bg-gray-50 text-gray-700`}>{label}</span>
  }

  // RÈGLE 0 intelligente : chercher un éventuel doublon
  async function chercherDoublonRecolte() {
    if (!campagneId || !dateRecolte || !parcelleId || !typeOlive) {
      return { doublon: null, error: null }
    }

    let query = supabase
      .from("recolte_journaliere")
      .select(
        "id, est_vendu, campagne_id, date, parcelle_id, type_olive, quantite_kg, destination"
      )
      .eq("campagne_id", campagneId)
      .eq("date", dateRecolte)
      .eq("parcelle_id", parcelleId)
      .eq("type_olive", typeOlive)
      .eq("destination", destination)

    if (editingId) {
      query = query.neq("id", editingId)
    }

    const { data, error } = await query

    if (error) {
      console.error("Erreur vérification doublon récolte:", error)
      return { doublon: null, error }
    }

    if (data && data.length > 0) {
      return { doublon: data[0], error: null }
    }

    return { doublon: null, error: null }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (isSubmitting) return
    setIsSubmitting(true)
    setMessage("")
    setFormError("")
    setRecolteDoublon(null)
    setDoublonChoiceVisible(false)

    try {
      if (!campagneId) {
        setFormError("Veuillez sélectionner une campagne.")
        return
      }
      const newErrors = {}
      if (!dateRecolte) newErrors.dateRecolte = "La date est obligatoire"
      if (!parcelleId) newErrors.parcelleId = "La parcelle est obligatoire"
      if (!quantiteKg) newErrors.quantiteKg = "La quantité est obligatoire"
      else if (Number(quantiteKg) <= 0) newErrors.quantiteKg = "La quantité doit être positive"
      if (Object.keys(newErrors).length > 0) {
        setErrors(newErrors)
        return
      }

      const quantite = Number(quantiteKg)

      if (editingId && editingEstVendu) {
        if (modifierPrixVente && !ventePrixKg) {
          setFormError("Le prix au kg est obligatoire.")
          return
        }

        const { error: errorRecolte } = await supabase
          .from("recolte_journaliere")
          .update({ quantite_kg: quantite })
          .eq("id", editingId)

        if (errorRecolte) {
          setFormError("Erreur lors de la modification de la récolte.")
          return
        }

        const venteUpdate = { quantite_kg: quantite }
        if (modifierPrixVente) {
          venteUpdate.prix_kg_dt = Number(ventePrixKg)
          venteUpdate.acheteur = venteAcheteur || null
        }

        const { error: errorVente } = await supabase
          .from("vente")
          .update(venteUpdate)
          .eq("recolte_id", editingId)

        if (errorVente) {
          setFormError("Récolte modifiée, mais erreur lors de la mise à jour de la vente.")
          return
        }

        setPageCourante(pageCourante)
        setRefreshKey((k) => k + 1)
        setMessageType("success")
        setMessage("Récolte et vente mises à jour avec succès")
        setModalOuvert(false)
        setEditingId(null)
        return
      }

      if (!editingId) {
        const { doublon, error } = await chercherDoublonRecolte()

        if (error) {
          setFormError("Erreur lors de la vérification de la récolte.")
          return
        }

        if (doublon) {
          if (doublon.est_vendu) {
            setFormError(
              "Une récolte déjà vendue existe pour cette date, cette parcelle, ce type d'olive et cette destination. Vous ne pouvez pas ajouter une deuxième récolte identique."
            )
            return
          } else {
            setRecolteDoublon(doublon)
            setDoublonChoiceVisible(true)
            setFormError(
              "Une récolte existe déjà pour cette date, cette parcelle, ce type d'olive et cette destination."
            )
            return
          }
        }
      } else {
        const { doublon, error } = await chercherDoublonRecolte()

        if (error) {
          setFormError("Erreur lors de la vérification de la récolte.")
          return
        }

        if (doublon) {
          setFormError(
            "Une autre récolte existe déjà pour cette date, cette parcelle, ce type d'olive et cette destination."
          )
          return
        }
      }

      const isHuile = destination !== "vente_brut"

      const payload = {
        campagne_id: campagneId,
        date: dateRecolte,
        parcelle_id: parcelleId,
        type_olive: typeOlive,
        quantite_kg: quantite,
        nb_sachets: nbSachets !== "" ? Number(nbSachets) : null,
        quantite_litres:
          isHuile && quantiteL !== "" ? parseFloat(quantiteL) : null,
        destination,
      }

      let errorRequete
      let targetPage = editingId ? pageCourante : 1

      if (editingId) {
        const res = await supabase
          .from("recolte_journaliere")
          .update(payload)
          .eq("id", editingId)
        errorRequete = res.error
      } else {
        const res = await supabase.from("recolte_journaliere").insert([payload])
        errorRequete = res.error

        if (!res.error) {
          let countQuery = supabase
            .from("recolte_journaliere")
            .select("id", { count: "exact", head: true })
            .eq("campagne_id", campagneId)
            .lt("date", dateRecolte)

          if (filtreParcelleId) countQuery = countQuery.eq("parcelle_id", filtreParcelleId)
          if (filtreTypeOlive) countQuery = countQuery.eq("type_olive", filtreTypeOlive)
          if (filtreDestination) countQuery = countQuery.eq("destination", filtreDestination)

          const { count: countBefore } = await countQuery
          targetPage = Math.max(1, Math.ceil(((countBefore || 0) + 1) / ITEMS_PAR_PAGE))
        }
      }

      if (errorRequete) {
        console.error("Erreur enregistrement récolte:", errorRequete)
        setFormError("Erreur lors de l'enregistrement de la récolte.")
        return
      }

      setPageCourante(targetPage)
      setRefreshKey((k) => k + 1)
      setMessageType("success")
      setMessage("Récolte enregistrée avec succès")
      setModalOuvert(false)
      setEditingId(null)
      setRecolteDoublon(null)
      setDoublonChoiceVisible(false)
    } finally {
      setIsSubmitting(false)
    }
  }

  function handleDelete(id) {
    const recolte = recoltes.find((r) => r.id === id)

    if (!recolte) {
      setMessageType("error")
      setMessage("Récolte introuvable")
      return
    }

    setRecolteASupprimer(recolte)
    setDeleteModalOpen(true)
  }

  async function confirmerSuppressionRecolte() {
    if (!recolteASupprimer) return
    setIsDeleting(true)

    try {
      if (!recolteASupprimer.est_vendu) {
        const { error } = await supabase
          .from("recolte_journaliere")
          .delete()
          .eq("id", recolteASupprimer.id)

        if (error) {
          console.error("Erreur suppression récolte:", error)
          setMessageType("error")
          setMessage("Erreur lors de la suppression de la récolte")
          return
        }
      } else {
        const { error: venteError } = await supabase
          .from("vente")
          .delete()
          .eq("recolte_id", recolteASupprimer.id)

        if (venteError) {
          console.error("Erreur suppression de la vente liée:", venteError)
          setMessageType("error")
          setMessage("Erreur lors de la suppression de la vente associée")
          return
        }

        const { error } = await supabase
          .from("recolte_journaliere")
          .delete()
          .eq("id", recolteASupprimer.id)

        if (error) {
          console.error("Erreur suppression récolte:", error)
          setMessageType("error")
          setMessage("Erreur lors de la suppression de la récolte")
          return
        }
      }

      const itemsRestants = totalCount - 1
      const nouvellesPages = Math.ceil(itemsRestants / ITEMS_PAR_PAGE)
      setPageCourante(Math.min(pageCourante, Math.max(1, nouvellesPages)))
      setRefreshKey((k) => k + 1)

      setMessageType("success")
      setMessage(
        recolteASupprimer.est_vendu
          ? "Récolte et vente associée supprimées"
          : "Récolte supprimée"
      )
      setDeleteModalOpen(false)
      setRecolteASupprimer(null)
    } finally {
      setIsDeleting(false)
    }
  }

  const totalPagesRecoltes = Math.max(1, Math.ceil(totalCount / ITEMS_PAR_PAGE))

  function getPageNumbers() {
    if (totalPagesRecoltes <= 7) return Array.from({ length: totalPagesRecoltes }, (_, i) => i + 1)
    const pages = [1]
    if (pageCourante > 3) pages.push("…")
    for (let i = Math.max(2, pageCourante - 1); i <= Math.min(totalPagesRecoltes - 1, pageCourante + 1); i++) pages.push(i)
    if (pageCourante < totalPagesRecoltes - 2) pages.push("…")
    pages.push(totalPagesRecoltes)
    return pages
  }

  const hasActiveFilters =
    !!filtreParcelleId || !!filtreTypeOlive || !!filtreDestination

  const nombreFiltresActifs = [
    filtreParcelleId,
    filtreTypeOlive,
    filtreDestination,
  ].filter(Boolean).length

  function handleResetFilters() {
    setFiltreParcelleId("")
    setFiltreTypeOlive("")
    setFiltreDestination("")
    setPageCourante(1)
  }

  function openFiltersModal() {
    setTempFiltreParcelleId(filtreParcelleId || "")
    setTempFiltreTypeOlive(filtreTypeOlive || "")
    setTempFiltreDestination(filtreDestination || "")
    setFiltersModalOpen(true)
  }

  function applyFiltersFromModal() {
    setFiltreParcelleId(tempFiltreParcelleId || "")
    setFiltreTypeOlive(tempFiltreTypeOlive || "")
    setFiltreDestination(tempFiltreDestination || "")
    setPageCourante(1)
    setFiltersModalOpen(false)
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">
            Récoltes journalières
          </h2>
          <p className="text-sm text-gray-500">
            Enregistre chaque journée de récolte, parcelle par parcelle.
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
                onChange={(e) => {
                  setCampagneId(e.target.value)
                  setPageCourante(1)
                }}
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
            + Nouvelle récolte
          </button>
        </div>
      </div>

      {/* Message si tentative de modifier une récolte vendue */}
      {editError && (
        <div className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800">
          {editError}
        </div>
      )}

      {/* Messages globaux */}
      <Notification message={message} type={messageType} onDismiss={() => setMessage("")} />

      {/* Résumé simple */}
      <div className="rounded-md bg-white px-4 py-3 shadow-sm border border-gray-200">
        <p className="text-sm text-gray-700">
          Total récolté pour la campagne{" "}
          {campagneSelectionnee ? campagneSelectionnee.annee : "-"} :{" "}
          <span className="font-semibold">
            {totalKgGlobal.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kg
          </span>
        </p>
        {hasActiveFilters && (
          <p className="text-xs text-gray-500 mt-1">
            Sur la sélection filtrée :{" "}
            <span className="font-semibold">
              {totalKgFiltre.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kg
            </span>
          </p>
        )}
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
            {filtreParcelleId && (
              <Tag
                text={`Parcelle: ${nomParcelleDepuisId(filtreParcelleId)}`}
                onRemove={() => {
                  setFiltreParcelleId("")
                  setPageCourante(1)
                }}
              />
            )}
            {filtreTypeOlive && (
              <Tag
                text={`Type: ${
                  filtreTypeOlive === "hay" ? "Hay" : "Nchrira"
                }`}
                onRemove={() => {
                  setFiltreTypeOlive("")
                  setPageCourante(1)
                }}
              />
            )}
            {filtreDestination && (
              <Tag
                text={`Destination: ${renderDestinationLabel(
                  filtreDestination
                )}`}
                onRemove={() => {
                  setFiltreDestination("")
                  setPageCourante(1)
                }}
              />
            )}
          </div>
        )}
      </div>

      {/* Modal de filtres */}
      <Modal
        isOpen={filtersModalOpen}
        onClose={() => setFiltersModalOpen(false)}
        title="Filtres des récoltes"
        size="medium"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <label className="block text-xs font-medium text-gray-600">
                Parcelle
              </label>
              <SearchableSelect
                value={tempFiltreParcelleId}
                onChange={setTempFiltreParcelleId}
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
                value={tempFiltreTypeOlive}
                onChange={(e) => setTempFiltreTypeOlive(e.target.value)}
                className="mt-1 block w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm shadow-sm focus:border-olive-500 focus:ring-olive-500"
              >
                <option value="">Tous les types</option>
                <option value="hay">Hay</option>
                <option value="nchrira">Nchrira</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600">
                Destination
              </label>
              <select
                value={tempFiltreDestination}
                onChange={(e) => setTempFiltreDestination(e.target.value)}
                className="mt-1 block w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm shadow-sm focus:border-olive-500 focus:ring-olive-500"
              >
                <option value="">Toutes les destinations</option>
                <option value="vente_brut">Vente brute</option>
                <option value="huile_perso">Huile - Perso</option>

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

      {/* Tableau */}
      <div className="mt-4">
        {loadingRecoltes ? (
          <Spinner message="Chargement des récoltes..." />
        ) : totalCount === 0 ? (
          <p className="text-sm text-gray-500">
            Aucune récolte ne correspond aux filtres pour cette campagne.
          </p>
        ) : (
          <>
          {/* Vue cartes — mobile uniquement */}
          <div className="md:hidden space-y-2 mb-2">
            {recoltes.map((r) => {
              const isHuilePerso = r.destination === "huile_perso"
              const statutVenteLabel = isHuilePerso ? "Non concernée" : r.est_vendu ? "Vendu" : "Disponible"
              return (
                <div key={r.id} className="rounded-lg border border-gray-200 bg-white p-3 shadow-sm">
                  {/* Date + Quantité + Sachets */}
                  <div className="flex items-start justify-between mb-1">
                    <p className="text-sm font-semibold text-gray-900">{formatDate(r.date)}</p>
                    <div className="text-right">
                      <p className="text-xl font-bold text-gray-900">{r.quantite_kg?.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kg</p>
                      {r.nb_sachets != null && <p className="text-xs text-gray-500">{r.nb_sachets} sachet{r.nb_sachets > 1 ? "s" : ""}</p>}
                    </div>
                  </div>
                  {/* Infos */}
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mb-3">
                    {renderParcelleBadge(r.parcelle_id)}
                    {renderTypeBadge(r.type_olive)}
                    <span className="text-xs text-gray-500">{renderDestinationLabel(r.destination)}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${r.est_vendu ? "bg-green-100 text-green-700" : isHuilePerso ? "bg-purple-100 text-purple-700" : "bg-orange-100 text-orange-700"}`}>{statutVenteLabel}</span>
                  </div>
                  {/* Actions */}
                  <div className="flex items-center gap-3 pt-2 border-t border-gray-100">
                    <button type="button" onClick={async () => {
                      if (r.est_vendu && !isHuilePerso) {
                        setRecolteAModifier(r); setConfirmVenduStep(1); setVenteAssociee(null); setLoadingVenteAssociee(true); setConfirmVenduModalOpen(true)
                        const { data } = await supabase.from("vente").select("id, prix_kg_dt, acheteur, quantite_kg").eq("recolte_id", r.id).maybeSingle()
                        setVenteAssociee(data || null); setLoadingVenteAssociee(false); return
                      }
                      ouvrirModalEdition(r)
                    }} className="text-xs font-medium text-olive-700 hover:text-olive-900">Modifier</button>
                    {!isHuilePerso && !r.est_vendu && onDemanderVente && (
                      <button type="button" onClick={() => onDemanderVente(r)} className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-700">Vendre</button>
                    )}
                    <button type="button" onClick={() => handleDelete(r.id)} className="text-xs font-medium text-red-600 hover:text-red-800 ml-auto">Supprimer</button>
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
                    Type {getSortIndicator("type_olive")}
                  </th>
                  <th className="px-3 py-2 text-right font-medium text-gray-600 cursor-pointer select-none hover:bg-gray-100" onClick={() => handleSort("quantite_kg")}>
                    Quantité (kg) {getSortIndicator("quantite_kg")}
                  </th>
                  <th className="px-3 py-2 text-right font-medium text-gray-600 cursor-pointer select-none hover:bg-gray-100" onClick={() => handleSort("nb_sachets")}>
                    Sachets {getSortIndicator("nb_sachets")}
                  </th>
                  <th className="px-3 py-2 text-right font-medium text-gray-600 cursor-pointer select-none hover:bg-gray-100" onClick={() => handleSort("quantite_litres")}>
                    Quantité (L) {getSortIndicator("quantite_litres")}
                  </th>
                  <th className="px-3 py-2 text-left font-medium text-gray-600 cursor-pointer select-none hover:bg-gray-100" onClick={() => handleSort("destination")}>
                    Destination {getSortIndicator("destination")}
                  </th>
                  <th className="px-3 py-2 text-left font-medium text-gray-600 cursor-pointer select-none hover:bg-gray-100" onClick={() => handleSort("est_vendu")}>
                    Statut vente {getSortIndicator("est_vendu")}
                  </th>
                  <th className="px-3 py-2 text-right font-medium text-gray-600">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {recoltes.map((r) => {
                  const isHuilePerso = r.destination === "huile_perso"
                  const statutVenteLabel = isHuilePerso
                    ? "Non concernée"
                    : r.est_vendu
                    ? "Vendu"
                    : "Disponible"

                  return (
                    <tr key={r.id}>
                      <td className="px-3 py-2 text-gray-800">{formatDate(r.date)}</td>
                      <td className="px-3 py-2">
                        {renderParcelleBadge(r.parcelle_id)}
                      </td>
                      <td className="px-3 py-2">
                        {renderTypeBadge(r.type_olive)}
                      </td>
                      <td className="px-3 py-2 text-right text-gray-800">
                        {r.quantite_kg?.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kg
                      </td>
                      <td className="px-3 py-2 text-right text-gray-800">
                        {r.nb_sachets != null ? r.nb_sachets : "-"}
                      </td>
                      <td className="px-3 py-2 text-right text-gray-800">
                        {r.quantite_litres != null
                          ? `${r.quantite_litres.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} L`
                          : "-"}
                      </td>
                      <td className="px-3 py-2 text-gray-800">
                        {renderDestinationLabel(r.destination)}
                      </td>
                      <td className="px-3 py-2 text-gray-800">
                        {statutVenteLabel}
                      </td>
                      <td className="px-3 py-2 text-right space-x-2">
                        <button
                          type="button"
                          onClick={async () => {
                            if (r.est_vendu && !isHuilePerso) {
                              setRecolteAModifier(r)
                              setConfirmVenduStep(1)
                              setVenteAssociee(null)
                              setLoadingVenteAssociee(true)
                              setConfirmVenduModalOpen(true)
                              const { data } = await supabase
                                .from("vente")
                                .select("id, prix_kg_dt, acheteur, quantite_kg")
                                .eq("recolte_id", r.id)
                                .maybeSingle()
                              setVenteAssociee(data || null)
                              setLoadingVenteAssociee(false)
                              return
                            }
                            ouvrirModalEdition(r)
                          }}
                          className="text-xs font-medium text-olive-700 hover:text-olive-900"
                        >
                          Modifier
                        </button>

                        {!isHuilePerso &&
                          !r.est_vendu &&
                          onDemanderVente && (
                            <button
                              type="button"
                              onClick={() => onDemanderVente(r)}
                              className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-700 hover:bg-blue-200 transition-colors"
                            >
                              Vendre
                            </button>
                          )}

                        <button
                          type="button"
                          onClick={() => handleDelete(r.id)}
                          className="text-xs font-medium text-red-600 hover:text-red-800"
                        >
                          Supprimer
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>

          </div>
          {totalPagesRecoltes > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-2 mt-3 px-1">
              <p className="text-sm text-gray-500">
                {(pageCourante - 1) * ITEMS_PAR_PAGE + 1}–{Math.min(pageCourante * ITEMS_PAR_PAGE, totalCount)} sur {totalCount} récoltes
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
                  onClick={() => setPageCourante((p) => Math.min(totalPagesRecoltes, p + 1))}
                  disabled={pageCourante === totalPagesRecoltes}
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

      {/* Modal création / modification */}
      <Modal
        isOpen={modalOuvert}
        onClose={() => {
          setModalOuvert(false)
          setEditingId(null)
          setFormError("")
          setRecolteDoublon(null)
          setDoublonChoiceVisible(false)
          setEditingEstVendu(false)
        }}
        title={editingId ? "Modifier une récolte" : "Nouvelle récolte"}
        size="large"
      >
        {editingEstVendu && (
          <div className="mb-3 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            Cette récolte est <strong>déjà vendue</strong>.{" "}
            {modifierPrixVente ? (
              <>
                La <strong>quantité (kg)</strong>, le <strong>prix au kg</strong>{" "}
                et l&apos;<strong>acheteur</strong> sont modifiables. La vente
                sera recalculée automatiquement.
              </>
            ) : (
              <>
                Seule la <strong>quantité (kg)</strong> peut être modifiée. La
                vente associée sera mise à jour automatiquement.
              </>
            )}
          </div>
        )}

        {formError && (
          <div className="mb-3 rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800">
            {formError}
          </div>
        )}

        {doublonChoiceVisible &&
          recolteDoublon &&
          !recolteDoublon.est_vendu && (
            <div className="mb-3 rounded-md border border-yellow-300 bg-yellow-50 px-3 py-2 text-sm text-yellow-800 space-y-2">
              <p>
                Une récolte existe déjà pour cette date, cette parcelle, ce
                type d&apos;olive et cette destination.
              </p>
              <p className="text-xs text-gray-700">
                Vous pouvez corriger la nouvelle récolte ou modifier la
                récolte existante avec les valeurs saisies.
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setDoublonChoiceVisible(false)
                    setRecolteDoublon(null)
                    setFormError("")
                  }}
                  className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 shadow-sm hover:bg-gray-50"
                >
                  Corriger la nouvelle récolte
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditingId(recolteDoublon.id)
                    setDoublonChoiceVisible(false)
                    setRecolteDoublon(null)
                    setFormError("")
                  }}
                  className="rounded-md bg-olive-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-olive-700"
                >
                  Modifier la récolte existante
                </button>
              </div>
            </div>
          )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Date de récolte <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={dateRecolte || ""}
                onChange={(e) => { setDateRecolte(e.target.value); setErrors(prev => ({ ...prev, dateRecolte: "" })) }}
                onBlur={() => { if (!dateRecolte) setErrors(prev => ({ ...prev, dateRecolte: "La date est obligatoire" })) }}
                className={`mt-1 block w-full h-10 rounded-md border px-3 text-sm shadow-sm focus:ring-1 disabled:bg-gray-50 disabled:text-gray-500 ${errors.dateRecolte ? "border-red-300 focus:border-red-500 focus:ring-red-500" : "border-gray-300 focus:border-olive-500 focus:ring-olive-500"}`}
                disabled={editingEstVendu}
              />
              {errors.dateRecolte && <p className="mt-1 text-xs text-red-600">{errors.dateRecolte}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Parcelle <span className="text-red-500">*</span>
              </label>
              <SearchableSelect
                value={parcelleId}
                onChange={(val) => { setParcelleId(val); setErrors(prev => ({ ...prev, parcelleId: "" })) }}
                options={[{ value: "", label: "Sélectionner une parcelle" }, ...parcelles.map(p => ({ value: p.id, label: p.nom }))]}
                placeholder="Sélectionner une parcelle"
                disabled={editingEstVendu}
                className="mt-1 block w-full"
              />
              {errors.parcelleId && <p className="mt-1 text-xs text-red-600">{errors.parcelleId}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Type d&apos;olive
              </label>
              <select
                value={typeOlive}
                onChange={(e) => setTypeOlive(e.target.value)}
                className="mt-1 block w-full h-10 rounded-md border border-gray-300 px-3 text-sm shadow-sm focus:border-olive-500 focus:ring-olive-500 disabled:bg-gray-50 disabled:text-gray-500"
                required
                disabled={editingEstVendu}
              >
                <option value="hay">Hay</option>
                <option value="nchrira">Nchrira</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Quantité (kg) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min="0"
                step="0.1"
                value={quantiteKg}
                onChange={(e) => { setQuantiteKg(e.target.value); setErrors(prev => ({ ...prev, quantiteKg: "" })) }}
                onBlur={() => {
                  if (!quantiteKg) setErrors(prev => ({ ...prev, quantiteKg: "La quantité est obligatoire" }))
                  else if (Number(quantiteKg) <= 0) setErrors(prev => ({ ...prev, quantiteKg: "La quantité doit être positive" }))
                }}
                className={`mt-1 block w-full h-10 rounded-md border px-3 text-sm shadow-sm focus:ring-1 ${errors.quantiteKg ? "border-red-300 focus:border-red-500 focus:ring-red-500" : "border-gray-300 focus:border-olive-500 focus:ring-olive-500"}`}
              />
              {errors.quantiteKg && <p className="mt-1 text-xs text-red-600">{errors.quantiteKg}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Nombre de sachets
              </label>
              <input
                type="number"
                min="0"
                step="1"
                value={nbSachets}
                onChange={(e) => setNbSachets(e.target.value)}
                className="mt-1 block w-full h-10 rounded-md border border-gray-300 px-3 text-sm shadow-sm focus:border-olive-500 focus:ring-olive-500 disabled:bg-gray-50 disabled:text-gray-500"
                placeholder="Optionnel"
                disabled={editingEstVendu}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Destination
              </label>
              <select
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                className="mt-1 block w-full h-10 rounded-md border border-gray-300 px-3 text-sm shadow-sm focus:border-olive-500 focus:ring-olive-500 disabled:bg-gray-50 disabled:text-gray-500"
                required
                disabled={editingEstVendu}
              >
                <option value="vente_brut">Vente brute</option>
                <option value="huile_perso">Huile - Perso</option>
              </select>
            </div>

            {destination !== "vente_brut" && (
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Quantité d&apos;huile (L){destination === "huile_perso" && <span className="text-red-500 ml-1">*</span>}
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={quantiteL}
                  onChange={(e) => setQuantiteL(e.target.value)}
                  className="mt-1 block w-full h-10 rounded-md border border-gray-300 px-3 text-sm shadow-sm focus:border-olive-500 focus:ring-olive-500 disabled:bg-gray-50 disabled:text-gray-500"
                  placeholder={destination === "huile_perso" ? "Obligatoire" : "Optionnel"}
                  required={destination === "huile_perso"}
                  disabled={editingEstVendu}
                />
              </div>
            )}
          </div>

          {editingEstVendu && modifierPrixVente && (
            <div className="border-t border-gray-200 pt-4 space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Vente associée
              </p>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Prix au kg (DT)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.001"
                    value={ventePrixKg}
                    onChange={(e) => setVentePrixKg(e.target.value)}
                    className="mt-1 block w-full h-10 rounded-md border border-gray-300 px-3 text-sm shadow-sm focus:border-olive-500 focus:ring-olive-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Acheteur (optionnel)
                  </label>
                  <input
                    type="text"
                    value={venteAcheteur}
                    onChange={(e) => setVenteAcheteur(e.target.value)}
                    className="mt-1 block w-full h-10 rounded-md border border-gray-300 px-3 text-sm shadow-sm focus:border-olive-500 focus:ring-olive-500"
                    placeholder="Nom de l'acheteur"
                  />
                </div>
              </div>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => {
                setModalOuvert(false)
                setEditingId(null)
                setFormError("")
                setRecolteDoublon(null)
                setDoublonChoiceVisible(false)
                setEditingEstVendu(false)
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

      {/* Modal de confirmation de modification d'une récolte vendue */}
      <Modal
        isOpen={confirmVenduModalOpen}
        onClose={() => {
          setConfirmVenduModalOpen(false)
          setRecolteAModifier(null)
          setVenteAssociee(null)
          setConfirmVenduStep(1)
        }}
        title="Modifier une récolte vendue"
        size="medium"
      >
        {recolteAModifier && (
          <div className="space-y-4">

            {/* Étape 1 — avertissement + détails de la vente */}
            {confirmVenduStep === 1 && (
              <>
                <div className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                  <p className="font-semibold mb-2">Attention — récolte déjà vendue</p>
                  <p>
                    La récolte du{" "}
                    <span className="font-semibold">{formatDate(recolteAModifier.date)}</span>{" "}
                    ({nomParcelleDepuisId(recolteAModifier.parcelle_id)} —{" "}
                    {renderTypeLabel(recolteAModifier.type_olive)},{" "}
                    {recolteAModifier.quantite_kg?.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kg) est déjà vendue.
                  </p>

                  {loadingVenteAssociee ? (
                    <p className="mt-2 text-xs text-amber-700">Chargement de la vente...</p>
                  ) : venteAssociee ? (
                    <div className="mt-2 rounded-md bg-amber-100 px-2.5 py-2 text-xs space-y-0.5">
                      <p>
                        Quantité vendue :{" "}
                        <span className="font-semibold">
                          {venteAssociee.quantite_kg?.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kg
                        </span>
                      </p>
                      <p>
                        Prix au kg :{" "}
                        <span className="font-semibold">
                          {venteAssociee.prix_kg_dt?.toLocaleString("fr-FR", {
                            minimumFractionDigits: 3,
                            maximumFractionDigits: 3,
                          })}{" "}
                          DT/kg
                        </span>
                      </p>
                      {venteAssociee.acheteur && (
                        <p>
                          Acheteur :{" "}
                          <span className="font-semibold">{venteAssociee.acheteur}</span>
                        </p>
                      )}
                    </div>
                  ) : null}

                  <p className="mt-2">
                    Toute modification de la quantité mettra à jour la vente automatiquement.
                  </p>
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setConfirmVenduModalOpen(false)
                      setRecolteAModifier(null)
                      setVenteAssociee(null)
                      setConfirmVenduStep(1)
                    }}
                    className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
                  >
                    Annuler
                  </button>
                  <button
                    type="button"
                    disabled={loadingVenteAssociee}
                    onClick={() => setConfirmVenduStep(2)}
                    className="inline-flex items-center justify-center rounded-md bg-olive-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-olive-700 focus:outline-none focus:ring-2 focus:ring-olive-500 focus:ring-offset-2 disabled:opacity-50"
                  >
                    Continuer la modification
                  </button>
                </div>
              </>
            )}

            {/* Étape 2 — choix : modifier le prix aussi ? */}
            {confirmVenduStep === 2 && (
              <>
                <p className="text-sm text-gray-700">
                  Souhaitez-vous aussi modifier le <strong>prix au kg</strong>{" "}
                  et l&apos;<strong>acheteur</strong> de la vente associée ?
                </p>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      const r = recolteAModifier
                      setModifierPrixVente(false)
                      setConfirmVenduModalOpen(false)
                      setRecolteAModifier(null)
                      setVenteAssociee(null)
                      setConfirmVenduStep(1)
                      ouvrirModalEdition(r)
                    }}
                    className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
                  >
                    Non, uniquement la quantité
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const r = recolteAModifier
                      const v = venteAssociee
                      setModifierPrixVente(true)
                      setVentePrixKg(v ? String(v.prix_kg_dt ?? "") : "")
                      setVenteAcheteur(v ? (v.acheteur ?? "") : "")
                      setConfirmVenduModalOpen(false)
                      setRecolteAModifier(null)
                      setVenteAssociee(null)
                      setConfirmVenduStep(1)
                      ouvrirModalEdition(r)
                    }}
                    className="inline-flex items-center justify-center rounded-md bg-olive-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-olive-700 focus:outline-none focus:ring-2 focus:ring-olive-500 focus:ring-offset-2"
                  >
                    Oui, modifier le prix aussi
                  </button>
                </div>
              </>
            )}

          </div>
        )}
      </Modal>

      {/* Modal de confirmation de suppression */}
      <Modal
        isOpen={deleteModalOpen}
        onClose={() => {
          if (isDeleting) return
          setDeleteModalOpen(false)
          setRecolteASupprimer(null)
        }}
        title="Supprimer la récolte"
        size="medium"
      >
        {recolteASupprimer && (
          <div className="space-y-4">
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
              <p className="font-semibold mb-1">
                Vous êtes sur le point de supprimer la récolte du{" "}
                {formatDate(recolteASupprimer.date)}.
              </p>
              <p>
                Parcelle{" "}
                <span className="font-semibold">
                  {nomParcelleDepuisId(recolteASupprimer.parcelle_id)}
                </span>
                , type{" "}
                <span className="font-semibold">
                  {renderTypeLabel(recolteASupprimer.type_olive)}
                </span>{" "}
                ,{" "}
                <span className="font-semibold">
                  {recolteASupprimer.quantite_kg?.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kg
                </span>
                .
              </p>
              {recolteASupprimer.est_vendu && (
                <p className="mt-2">
                  Cette récolte est déjà{" "}
                  <span className="font-semibold">vendue</span>. La vente
                  associée sera également supprimée.
                </p>
              )}
            </div>
            <p className="text-sm text-gray-700">
              Confirmez-vous la suppression définitive de cette récolte
              {recolteASupprimer.est_vendu ? " et de la vente associée" : ""} ?
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  if (isDeleting) return
                  setDeleteModalOpen(false)
                  setRecolteASupprimer(null)
                }}
                className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 disabled:opacity-50"
                disabled={isDeleting}
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={confirmerSuppressionRecolte}
                disabled={isDeleting}
                className="inline-flex items-center justify-center rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50"
              >
                {isDeleting ? "Suppression..." : "Supprimer définitivement"}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}

export default FormulaireRecolte