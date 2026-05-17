import { useEffect, useMemo, useState } from "react"
import { supabase } from "./supabase"
import Modal from "./Modal"
import Spinner from "./Spinner"
import Notification from "./Notification"
import { formatDate } from "./dateUtils"
import SearchableSelect from "./SearchableSelect"

const SOUS_TYPES_PAR_TYPE = {
  recolte: [
    { value: "salaire_ouvriers", label: "Salaire ouvriers" },
    { value: "repas_ouvriers", label: "Repas ouvriers" },
    { value: "transport_recolte", label: "Transport récolte" },
    { value: "autre_recolte", label: "Autre (préciser)" },
  ],
  equipement: [
    { value: "entretien", label: "Entretien" },
    { value: "reparation", label: "Réparation" },
    { value: "carburant", label: "Carburant" },
    { value: "assurance", label: "Assurance" },
    { value: "vignette", label: "Vignette" },
    { value: "salaire_chauffeur", label: "Salaire chauffeur" },
    { value: "achat_equipement", label: "Achat équipement" },
    { value: "autre_equipement", label: "Autre (préciser)" },
  ],
  don: [
    { value: "don_argent", label: "Don en argent" },
    { value: "don_nature", label: "Don en nature" },
    { value: "cadeau", label: "Cadeau" },
    { value: "autre_don", label: "Autre (préciser)" },
  ],
  transformation_huile: [],
}

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

const PAGE_SIZE = 10

function FormulaireCharges() {
  const [campagnes, setCampagnes] = useState([])
  const [campagneId, setCampagneId] = useState("")
  const [charges, setCharges] = useState([])
  const [equipements, setEquipements] = useState([])

  const [editingId, setEditingId] = useState(null)
  const [date, setDate] = useState("")
  const [typeCharge, setTypeCharge] = useState("")
  const [sousType, setSousType] = useState("")
  const [montantDt, setMontantDt] = useState("")
  const [nbOuvriers, setNbOuvriers] = useState("")
  const [description, setDescription] = useState("")
  const [beneficiaire, setBeneficiaire] = useState("")
  const [equipementId, setEquipementId] = useState("")

  const [loadingCampagnes, setLoadingCampagnes] = useState(true)
  const [loadingCharges, setLoadingCharges] = useState(false)
  const [loadingEquipements, setLoadingEquipements] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  const [message, setMessage] = useState("")
  const [messageType, setMessageType] = useState("info")
  const [errors, setErrors] = useState({})

  const [modalOuvert, setModalOuvert] = useState(false)

  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [chargeASupprimer, setChargeASupprimer] = useState(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Filtres appliqués
  const [filtreDateDebut, setFiltreDateDebut] = useState("")
  const [filtreDateFin, setFiltreDateFin] = useState("")
  const [filtreTypeCharge, setFiltreTypeCharge] = useState("")
  const [filtreSousType, setFiltreSousType] = useState("")
  const [filtreEquipementId, setFiltreEquipementId] = useState("")

  // Popup de filtres
  const [filtersModalOpen, setFiltersModalOpen] = useState(false)
  const [tempFiltreDateDebut, setTempFiltreDateDebut] = useState("")
  const [tempFiltreDateFin, setTempFiltreDateFin] = useState("")
  const [tempFiltreTypeCharge, setTempFiltreTypeCharge] = useState("")
  const [tempFiltreSousType, setTempFiltreSousType] = useState("")
  const [tempFiltreEquipementId, setTempFiltreEquipementId] = useState("")

  // Tri
  const [sortConfig, setSortConfig] = useState({
    key: "date",
    direction: "asc",
  })

  // Pagination serveur
  const [page, setPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [totalMontantGlobal, setTotalMontantGlobal] = useState(0)
  const [totalMontantFiltre, setTotalMontantFiltre] = useState(0)
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    if (!message) return
    const timer = setTimeout(() => setMessage(""), 5000)
    return () => clearTimeout(timer)
  }, [message])

  function normalizeBeneficiaire(value) {
    if (!value) return ""
    return value
      .trim()
      .toLowerCase()
      .replace(/\s+/g, " ")
      .split(" ")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ")
  }

  // Campagnes
  useEffect(() => {
    async function loadCampagnes() {
      setLoadingCampagnes(true)
      const { data, error } = await supabase
        .from("campagne")
        .select("*")
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

  // Equipements
  useEffect(() => {
    async function loadEquipements() {
      setLoadingEquipements(true)
      const { data, error } = await supabase
        .from("equipements")
        .select("*")
        .order("nom", { ascending: true })

      if (error) {
        console.error("Erreur chargement équipements:", error)
        setMessageType("error")
        setMessage("Erreur lors du chargement des équipements")
      } else {
        setEquipements(data || [])
      }
      setLoadingEquipements(false)
    }
    loadEquipements()
  }, [])

  // Charges — paginées + filtrées + triées côté serveur
  useEffect(() => {
    async function loadCharges() {
      if (!campagneId) {
        setCharges([])
        setTotalCount(0)
        setTotalMontantGlobal(0)
        setTotalMontantFiltre(0)
        return
      }
      setLoadingCharges(true)

      const from = (page - 1) * PAGE_SIZE
      const to = from + PAGE_SIZE - 1
      const sortKeyDb = sortConfig.key === "equipement" ? "equipement_id" : sortConfig.key

      let pageQuery = supabase
        .from("charge")
        .select("*", { count: "exact" })
        .eq("campagne_id", campagneId)
        .order(sortKeyDb, { ascending: sortConfig.direction === "asc" })
        .range(from, to)

      let globalQuery = supabase
        .from("charge")
        .select("montant_dt")
        .eq("campagne_id", campagneId)

      let filtreQuery = supabase
        .from("charge")
        .select("montant_dt")
        .eq("campagne_id", campagneId)

      if (filtreDateDebut) {
        pageQuery = pageQuery.gte("date", filtreDateDebut)
        filtreQuery = filtreQuery.gte("date", filtreDateDebut)
      }
      if (filtreDateFin) {
        pageQuery = pageQuery.lte("date", filtreDateFin)
        filtreQuery = filtreQuery.lte("date", filtreDateFin)
      }
      if (filtreTypeCharge) {
        pageQuery = pageQuery.eq("type_charge", filtreTypeCharge)
        filtreQuery = filtreQuery.eq("type_charge", filtreTypeCharge)
      }
      if (filtreSousType) {
        pageQuery = pageQuery.eq("sous_type", filtreSousType)
        filtreQuery = filtreQuery.eq("sous_type", filtreSousType)
      }
      if (filtreEquipementId) {
        pageQuery = pageQuery.eq("equipement_id", filtreEquipementId).eq("type_charge", "equipement")
        filtreQuery = filtreQuery.eq("equipement_id", filtreEquipementId).eq("type_charge", "equipement")
      }

      const [
        { data: pageData, error, count },
        { data: globalData },
        { data: filtreData },
      ] = await Promise.all([pageQuery, globalQuery, filtreQuery])

      if (error) {
        console.error("Erreur chargement charges:", error)
        setMessageType("error")
        setMessage("Erreur lors du chargement des charges")
      } else {
        setCharges(pageData || [])
        setTotalCount(count || 0)
        setTotalMontantGlobal((globalData || []).reduce((s, c) => s + (Number(c.montant_dt) || 0), 0))
        setTotalMontantFiltre((filtreData || []).reduce((s, c) => s + (Number(c.montant_dt) || 0), 0))
      }
      setLoadingCharges(false)
    }
    loadCharges()
  }, [campagneId, page, filtreDateDebut, filtreDateFin, filtreTypeCharge, filtreSousType, filtreEquipementId, sortConfig, refreshKey])

  function reloadCharges() {
    setRefreshKey(k => k + 1)
  }

  function resetForm() {
    setEditingId(null)
    setDate("")
    setTypeCharge("")
    setSousType("")
    setMontantDt("")
    setNbOuvriers("")
    setDescription("")
    setBeneficiaire("")
    setEquipementId("")
    setSubmitting(false)
    setErrors({})
  }

  function ouvrirModalCreation() {
    resetForm()
    setModalOuvert(true)
  }

  function ouvrirModalEdition(charge) {
    setEditingId(charge.id)
    setDate(charge.date || "")
    setTypeCharge(charge.type_charge || "")
    setSousType(charge.sous_type || "")
    setMontantDt(
      charge.montant_dt != null ? String(charge.montant_dt) : ""
    )
    setNbOuvriers(
      charge.nb_ouvriers != null ? String(charge.nb_ouvriers) : ""
    )
    setDescription(charge.description || "")
    setBeneficiaire(charge.beneficiaire || "")
    setEquipementId(charge.equipement_id || "")
    setErrors({})
    setModalOuvert(true)
  }

  // Valeur dérivée — pas de state, pas d'effet
  const avertissementPrixAchat = useMemo(() => {
    if (sousType === "achat_equipement" && equipementId) {
      const eq = equipements.find((e) => String(e.id) === String(equipementId))
      if (eq && eq.prix_achat != null) return { nom: eq.nom, prix: eq.prix_achat }
    }
    return null
  }, [sousType, equipementId, equipements])

  const sousTypesDisponibles =
    typeCharge && SOUS_TYPES_PAR_TYPE[typeCharge]
      ? SOUS_TYPES_PAR_TYPE[typeCharge]
      : []

  async function handleSubmit(e) {
    e.preventDefault()
    if (submitting) return
    setSubmitting(true)
    setMessage("")

    if (!campagneId) {
      setMessageType("error")
      setMessage("Veuillez sélectionner une campagne.")
      setSubmitting(false)
      return
    }
    const newErrors = {}
    if (!date) newErrors.date = "La date est obligatoire"
    if (!typeCharge) newErrors.typeCharge = "Le type de charge est obligatoire"
    if (!montantDt) {
      newErrors.montantDt = "Le montant est obligatoire"
    } else {
      const montantNumber = parseFloat(montantDt)
      if (Number.isNaN(montantNumber) || montantNumber <= 0) newErrors.montantDt = "Le montant doit être positif"
    }
    if (typeCharge === "equipement" && !equipementId) newErrors.equipementId = "Veuillez sélectionner un équipement"
    if (typeCharge !== "transformation_huile" && sousTypesDisponibles.length > 0 && !sousType) newErrors.sousType = "Le sous-type est obligatoire"
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      setSubmitting(false)
      return
    }

    const montantNumber = parseFloat(montantDt)

    const payload = {
      campagne_id: campagneId,
      date,
      type_charge: typeCharge,
      sous_type: sousType || null,
      montant_dt: montantNumber,
      nb_ouvriers:
        typeCharge === "recolte" && nbOuvriers
          ? parseInt(nbOuvriers, 10)
          : null,
      description: description || null,
      beneficiaire:
        typeCharge === "don" && beneficiaire
          ? normalizeBeneficiaire(beneficiaire)
          : null,
      equipement_id:
        typeCharge === "equipement" && equipementId
          ? equipementId
          : null,
    }

    let error
    if (editingId) {
      const res = await supabase
        .from("charge")
        .update(payload)
        .eq("id", editingId)
      error = res.error
    } else {
      const res = await supabase.from("charge").insert([payload])
      error = res.error
    }

    if (error) {
      console.error("Erreur enregistrement charge:", error)
      setMessageType("error")
      setMessage("Erreur lors de l'enregistrement de la charge.")
      setSubmitting(false)
      return
    }

    if (typeCharge === "equipement" && sousType === "achat_equipement" && equipementId) {
      await supabase
        .from("equipements")
        .update({ prix_achat: montantNumber })
        .eq("id", equipementId)
    }

    await reloadCharges()
    setMessageType("success")
    setMessage(
      editingId
        ? "Charge modifiée avec succès"
        : "Charge enregistrée avec succès"
    )
    resetForm()
    setModalOuvert(false)
  }

  function demanderSuppression(charge) {
    setChargeASupprimer(charge)
    setDeleteModalOpen(true)
  }

  async function confirmerSuppression() {
    if (!chargeASupprimer) return
    setIsDeleting(true)

    const { error } = await supabase
      .from("charge")
      .delete()
      .eq("id", chargeASupprimer.id)

    if (error) {
      console.error("Erreur suppression charge:", error)
      setMessageType("error")
      setMessage("Erreur lors de la suppression de la charge.")
    } else {
      await reloadCharges()
      setMessageType("success")
      setMessage("Charge supprimée avec succès")
    }

    setIsDeleting(false)
    setDeleteModalOpen(false)
    setChargeASupprimer(null)
  }

  function formatTypeLabel(type) {
    switch (type) {
      case "recolte":
        return "Récolte"
      case "equipement":
        return "Équipement"
      case "don":
        return "Don"
      case "transformation_huile":
        return "Transformation huile"
      default:
        return type
    }
  }

  function formatSousTypeLabel(type, sousType) {
    if (!sousType) return "-"
    const liste = SOUS_TYPES_PAR_TYPE[type] || []
    const found = liste.find((st) => st.value === sousType)
    return found ? found.label : sousType
  }

  function formatMontant(value) {
    if (value == null) return "-"
    return `${Number(value).toFixed(3)} DT`
  }

  // Map id -> nom d'équipement
  const equipementMap = useMemo(
    () =>
      equipements.reduce((acc, eq) => {
        acc[eq.id] = eq.nom
        return acc
      }, {}),
    [equipements]
  )

  // Gestion du tri client
  function requestSort(key) {
    setSortConfig((prev) => {
      if (prev.key === key) {
        return { key, direction: prev.direction === "asc" ? "desc" : "asc" }
      }
      return { key, direction: "asc" }
    })
    setPage(1)
  }

  function getSortIndicator(key) {
    if (sortConfig.key !== key) return <span className="ml-1 text-gray-400 text-xs">↕</span>
    return <span className="ml-1 text-xs">{sortConfig.direction === "asc" ? "↑" : "↓"}</span>
  }

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE))

  function getPageNumbers() {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1)
    const pages = [1]
    if (page > 3) pages.push("…")
    for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) pages.push(i)
    if (page < totalPages - 2) pages.push("…")
    pages.push(totalPages)
    return pages
  }

  // Sous-types disponibles dans la modal de filtres (statiques par type)
  const sousTypesPourFiltreModal = SOUS_TYPES_PAR_TYPE[tempFiltreTypeCharge] || []

  // Équipements pour le filtre
  const equipementsPourFiltre = equipements

  const hasActiveFilters = !!(
    filtreDateDebut ||
    filtreDateFin ||
    filtreTypeCharge ||
    filtreSousType ||
    filtreEquipementId
  )

  const nombreFiltresActifs = [
    filtreDateDebut,
    filtreDateFin,
    filtreTypeCharge,
    filtreSousType,
    filtreEquipementId,
  ].filter(Boolean).length

  function handleResetFilters() {
    setFiltreDateDebut("")
    setFiltreDateFin("")
    setFiltreTypeCharge("")
    setFiltreSousType("")
    setFiltreEquipementId("")
    setPage(1)
  }

  function openFiltersModal() {
    setTempFiltreDateDebut(filtreDateDebut || "")
    setTempFiltreDateFin(filtreDateFin || "")
    setTempFiltreTypeCharge(filtreTypeCharge || "")
    setTempFiltreSousType(filtreSousType || "")
    setTempFiltreEquipementId(filtreEquipementId || "")
    setFiltersModalOpen(true)
  }

  function applyFiltersFromModal() {
    setFiltreDateDebut(tempFiltreDateDebut || "")
    setFiltreDateFin(tempFiltreDateFin || "")
    setFiltreTypeCharge(tempFiltreTypeCharge || "")
    setFiltreSousType(tempFiltreSousType || "")
    setFiltreEquipementId(tempFiltreEquipementId || "")
    setPage(1)
    setFiltersModalOpen(false)
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">
            Charges de campagne
          </h2>
          <p className="text-sm text-gray-500">
            Saisissez les charges liées à la récolte, aux équipements, aux dons
            et à la transformation de l'huile.
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              Campagne
            </label>
            {loadingCampagnes ? (
              <div className="text-sm text-gray-500">Chargement des campagnes...</div>
            ) : campagnes.length === 0 ? (
              <div className="text-sm text-red-500">
                Aucune campagne disponible.
              </div>
            ) : (
              <select
                value={campagneId}
                onChange={(e) => { setCampagneId(e.target.value); setPage(1) }}
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
            + Ajouter une charge
          </button>
        </div>
      </div>

      {/* Messages */}
      <Notification message={message} type={messageType} onDismiss={() => setMessage("")} />

      {/* Résumé */}
      <div className="rounded-md bg-white px-4 py-3 shadow-sm border border-gray-200">
        <p className="text-sm text-gray-700">
          Total des charges pour la campagne{" "}
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
          <p className="mt-1 text-xs text-gray-500">
            Total sur les filtres courants :{" "}
            <span className="font-semibold">
              {totalMontantFiltre.toLocaleString("fr-FR", {
                minimumFractionDigits: 3,
                maximumFractionDigits: 3,
              })}{" "}
              DT
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
            {filtreDateDebut && (
              <Tag
                text={`Du : ${formatDate(filtreDateDebut)}`}
                onRemove={() => setFiltreDateDebut("")}
              />
            )}
            {filtreDateFin && (
              <Tag
                text={`Au : ${formatDate(filtreDateFin)}`}
                onRemove={() => setFiltreDateFin("")}
              />
            )}
            {filtreTypeCharge && (
              <Tag
                text={`Type : ${formatTypeLabel(filtreTypeCharge)}`}
                onRemove={() => {
                  setFiltreTypeCharge("")
                  setFiltreSousType("")
                  setFiltreEquipementId("")
                }}
              />
            )}
            {filtreSousType && (
              <Tag
                text={`Sous-type : ${formatSousTypeLabel(filtreTypeCharge, filtreSousType)}`}
                onRemove={() => setFiltreSousType("")}
              />
            )}
            {filtreEquipementId && (
              <Tag
                text={`Équipement : ${equipementMap[filtreEquipementId] || filtreEquipementId}`}
                onRemove={() => setFiltreEquipementId("")}
              />
            )}
          </div>
        )}
      </div>

      {/* Modal de filtres */}
      <Modal
        isOpen={filtersModalOpen}
        onClose={() => setFiltersModalOpen(false)}
        title="Filtres des charges"
        size="medium"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-gray-600">
                Du
              </label>
              <input
                type="date"
                value={tempFiltreDateDebut}
                onChange={(e) => setTempFiltreDateDebut(e.target.value)}
                className="mt-1 block w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm shadow-sm focus:border-olive-500 focus:ring-olive-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600">
                Au
              </label>
              <input
                type="date"
                value={tempFiltreDateFin}
                onChange={(e) => setTempFiltreDateFin(e.target.value)}
                className="mt-1 block w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm shadow-sm focus:border-olive-500 focus:ring-olive-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600">
                Type de charge
              </label>
              <select
                value={tempFiltreTypeCharge}
                onChange={(e) => {
                  setTempFiltreTypeCharge(e.target.value)
                  setTempFiltreSousType("")
                  setTempFiltreEquipementId("")
                }}
                className="mt-1 block w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm shadow-sm focus:border-olive-500 focus:ring-olive-500"
              >
                <option value="">Tous les types</option>
                <option value="recolte">Récolte</option>
                <option value="equipement">Équipement</option>
                <option value="don">Don</option>
                <option value="transformation_huile">
                  Transformation huile
                </option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600">
                Sous-type
              </label>
              <select
                value={tempFiltreSousType}
                onChange={(e) => setTempFiltreSousType(e.target.value)}
                className="mt-1 block w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm shadow-sm focus:border-olive-500 focus:ring-olive-500"
              >
                <option value="">Tous les sous-types</option>
                {sousTypesPourFiltreModal.map((st) => (
                  <option key={st.value} value={st.value}>
                    {st.label}
                  </option>
                ))}
              </select>
            </div>

            {(!tempFiltreTypeCharge || tempFiltreTypeCharge === "equipement") && (
              <div>
                <label className="block text-xs font-medium text-gray-600">
                  Équipement
                </label>
                <SearchableSelect
                  value={tempFiltreEquipementId}
                  onChange={setTempFiltreEquipementId}
                  options={[{ value: "", label: "Tous les équipements" }, ...equipementsPourFiltre.map(eq => ({ value: eq.id, label: eq.nom }))]}
                  placeholder="Tous les équipements"
                  className="mt-1 block w-full"
                />
              </div>
            )}
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

      {/* Tableau triable */}
      <div className="mt-4">
        {loadingCharges ? (
          <Spinner message="Chargement des charges..." />
        ) : totalCount === 0 ? (
          <p className="text-sm text-gray-500">
            Aucune charge ne correspond aux filtres pour cette campagne.
          </p>
        ) : (
          <>
          {/* Vue cartes — mobile uniquement */}
          <div className="md:hidden space-y-2 mb-2">
            {charges.map((ch) => (
              <div key={ch.id} className="rounded-lg border border-gray-200 bg-white p-3 shadow-sm">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-semibold text-gray-900">{formatDate(ch.date)}</span>
                  <span className="text-base font-bold text-gray-900">{formatMontant(ch.montant_dt)}</span>
                </div>
                <div className="text-xs text-gray-500 mb-2">
                  {formatTypeLabel(ch.type_charge)}
                  {ch.sous_type ? ` · ${formatSousTypeLabel(ch.type_charge, ch.sous_type)}` : ""}
                  {ch.type_charge === "equipement" && ch.equipement_id ? ` · ${equipementMap[ch.equipement_id] || ""}` : ""}
                </div>
                {(ch.beneficiaire || ch.description) && (
                  <p className="text-xs text-gray-400 mb-2 truncate">{ch.beneficiaire || ch.description}</p>
                )}
                <div className="flex items-center gap-3 pt-2 border-t border-gray-100">
                  <button type="button" onClick={() => ouvrirModalEdition(ch)} className="text-xs font-medium text-olive-700 hover:text-olive-900">Modifier</button>
                  <button type="button" onClick={() => demanderSuppression(ch)} className="text-xs font-medium text-red-600 hover:text-red-800 ml-auto">Supprimer</button>
                </div>
              </div>
            ))}
          </div>

          {/* Vue tableau — desktop uniquement */}
          <div className="hidden md:block overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th
                    className="px-3 py-2 text-left font-medium text-gray-600 cursor-pointer select-none whitespace-nowrap"
                    onClick={() => requestSort("date")}
                  >
                    Date {getSortIndicator("date")}
                  </th>
                  <th
                    className="px-3 py-2 text-left font-medium text-gray-600 cursor-pointer select-none whitespace-nowrap"
                    onClick={() => requestSort("type_charge")}
                  >
                    Type {getSortIndicator("type_charge")}
                  </th>
                  <th
                    className="px-3 py-2 text-left font-medium text-gray-600 cursor-pointer select-none whitespace-nowrap"
                    onClick={() => requestSort("sous_type")}
                  >
                    Sous-type {getSortIndicator("sous_type")}
                  </th>
                  <th
                    className="px-3 py-2 text-left font-medium text-gray-600 cursor-pointer select-none whitespace-nowrap"
                    onClick={() => requestSort("equipement")}
                  >
                    Équipement {getSortIndicator("equipement")}
                  </th>
                  <th
                    className="px-3 py-2 text-right font-medium text-gray-600 cursor-pointer select-none whitespace-nowrap"
                    onClick={() => requestSort("montant_dt")}
                  >
                    Montant {getSortIndicator("montant_dt")}
                  </th>
                  <th
                    className="px-3 py-2 text-right font-medium text-gray-600 cursor-pointer select-none whitespace-nowrap"
                    onClick={() => requestSort("nb_ouvriers")}
                  >
                    Nb ouvriers {getSortIndicator("nb_ouvriers")}
                  </th>
                  <th
                    className="px-3 py-2 text-left font-medium text-gray-600 cursor-pointer select-none whitespace-nowrap"
                    onClick={() => requestSort("beneficiaire")}
                  >
                    Bénéficiaire {getSortIndicator("beneficiaire")}
                  </th>
                  <th className="px-3 py-2 text-left font-medium text-gray-600">
                    Description
                  </th>
                  <th className="px-3 py-2 text-right font-medium text-gray-600">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {charges.map((ch) => (
                  <tr key={ch.id}>
                    <td className="px-3 py-2 text-gray-800">{formatDate(ch.date)}</td>
                    <td className="px-3 py-2 text-gray-800">
                      {formatTypeLabel(ch.type_charge)}
                    </td>
                    <td className="px-3 py-2 text-gray-800">
                      {formatSousTypeLabel(ch.type_charge, ch.sous_type)}
                    </td>
                    <td className="px-3 py-2 text-gray-800">
                      {ch.type_charge === "equipement" && ch.equipement_id
                        ? equipementMap[ch.equipement_id] || "-"
                        : "-"}
                    </td>
                    <td className="px-3 py-2 text-right text-gray-800">
                      {formatMontant(ch.montant_dt)}
                    </td>
                    <td className="px-3 py-2 text-right text-gray-800">
                      {ch.nb_ouvriers ?? "-"}
                    </td>
                    <td className="px-3 py-2 text-gray-800">
                      {ch.beneficiaire || "-"}
                    </td>
                    <td className="px-3 py-2 text-gray-600">
                      {ch.description || "-"}
                    </td>
                    <td className="px-3 py-2 text-right space-x-2">
                      <button
                        type="button"
                        onClick={() => ouvrirModalEdition(ch)}
                        className="text-xs font-medium text-olive-700 hover:text-olive-900"
                      >
                        Modifier
                      </button>
                      <button
                        type="button"
                        onClick={() => demanderSuppression(ch)}
                        className="text-xs font-medium text-red-600 hover:text-red-800"
                      >
                        Supprimer
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-2 mt-3 px-1">
              <p className="text-sm text-gray-500">
                {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, totalCount)} sur {totalCount} charges
              </p>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
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
                      onClick={() => setPage(p)}
                      className={`rounded-md border px-2.5 py-1 text-sm font-medium ${
                        p === page
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
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
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

      {/* Modal ajout / modification */}
      <Modal
        isOpen={modalOuvert}
        onClose={() => {
          setModalOuvert(false)
          resetForm()
        }}
        title={editingId ? "Modifier une charge" : "Ajouter une charge"}
        size="medium"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => { setDate(e.target.value); setErrors(prev => ({ ...prev, date: "" })) }}
                onBlur={() => { if (!date) setErrors(prev => ({ ...prev, date: "La date est obligatoire" })) }}
                className={`mt-1 block w-full rounded-md border px-3 py-2 text-sm shadow-sm focus:ring-1 ${errors.date ? "border-red-300 focus:border-red-500 focus:ring-red-500" : "border-gray-300 focus:border-olive-500 focus:ring-olive-500"}`}
              />
              {errors.date && <p className="mt-1 text-xs text-red-600">{errors.date}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Type de charge <span className="text-red-500">*</span>
              </label>
              <select
                value={typeCharge}
                onChange={(e) => {
                  const value = e.target.value
                  setTypeCharge(value)
                  setSousType("")
                  setErrors(prev => ({ ...prev, typeCharge: "", sousType: "", equipementId: "" }))
                  if (value !== "equipement") setEquipementId("")
                  if (value !== "recolte") setNbOuvriers("")
                  if (value !== "don") setBeneficiaire("")
                }}
                onBlur={() => { if (!typeCharge) setErrors(prev => ({ ...prev, typeCharge: "Le type de charge est obligatoire" })) }}
                className={`mt-1 block w-full rounded-md border px-3 py-2 text-sm shadow-sm focus:ring-1 ${errors.typeCharge ? "border-red-300 focus:border-red-500 focus:ring-red-500" : "border-gray-300 focus:border-olive-500 focus:ring-olive-500"}`}
              >
                <option value="">Sélectionner</option>
                <option value="recolte">Récolte</option>
                <option value="equipement">Équipement</option>
                <option value="don">Don</option>
                <option value="transformation_huile">
                  Transformation huile
                </option>
              </select>
              {errors.typeCharge && <p className="mt-1 text-xs text-red-600">{errors.typeCharge}</p>}
            </div>

            {/* Sous-type */}
            {typeCharge &&
              typeCharge !== "transformation_huile" &&
              sousTypesDisponibles.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Sous-type <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={sousType}
                    onChange={(e) => {
                      const val = e.target.value
                      setSousType(val)
                      setErrors(prev => ({ ...prev, sousType: "" }))
                      if (val === "achat_equipement" && equipementId && !editingId) {
                        const eq = equipements.find((eq) => String(eq.id) === String(equipementId))
                        if (eq && eq.prix_achat != null) setMontantDt(String(eq.prix_achat))
                      }
                    }}
                    onBlur={() => { if (!sousType) setErrors(prev => ({ ...prev, sousType: "Le sous-type est obligatoire" })) }}
                    className={`mt-1 block w-full rounded-md border px-3 py-2 text-sm shadow-sm focus:ring-1 ${errors.sousType ? "border-red-300 focus:border-red-500 focus:ring-red-500" : "border-gray-300 focus:border-olive-500 focus:ring-olive-500"}`}
                  >
                    <option value="">Sélectionner</option>
                    {sousTypesDisponibles.map((st) => (
                      <option key={st.value} value={st.value}>
                        {st.label}
                      </option>
                    ))}
                  </select>
                  {errors.sousType && <p className="mt-1 text-xs text-red-600">{errors.sousType}</p>}
                </div>
              )}

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Montant total (DT) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={montantDt}
                onChange={(e) => { setMontantDt(e.target.value); setErrors(prev => ({ ...prev, montantDt: "" })) }}
                onBlur={() => {
                  if (!montantDt) setErrors(prev => ({ ...prev, montantDt: "Le montant est obligatoire" }))
                  else if (parseFloat(montantDt) <= 0) setErrors(prev => ({ ...prev, montantDt: "Le montant doit être positif" }))
                }}
                className={`mt-1 block w-full rounded-md border px-3 py-2 text-sm shadow-sm focus:ring-1 ${errors.montantDt ? "border-red-300 focus:border-red-500 focus:ring-red-500" : "border-gray-300 focus:border-olive-500 focus:ring-olive-500"}`}
              />
              {errors.montantDt && <p className="mt-1 text-xs text-red-600">{errors.montantDt}</p>}
            </div>

            {typeCharge === "recolte" && (
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Nombre d&apos;ouvriers
                </label>
                <input
                  type="number"
                  min="0"
                  value={nbOuvriers}
                  onChange={(e) => setNbOuvriers(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-olive-500 focus:ring-olive-500"
                  placeholder="Ex: 5"
                />
              </div>
            )}

            {typeCharge === "equipement" && (
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Équipement
                </label>
                {loadingEquipements ? (
                  <div className="mt-1 text-sm text-gray-500">
                    Chargement des équipements...
                  </div>
                ) : equipements.length === 0 ? (
                  <div className="mt-1 text-sm text-red-500">
                    Aucun équipement enregistré. Ajoutez-les dans le profil
                    exploitation.
                  </div>
                ) : (
                  <>
                    <SearchableSelect
                      value={equipementId}
                      onChange={(val) => {
                        setEquipementId(val)
                        setErrors(prev => ({ ...prev, equipementId: "" }))
                        if (sousType === "achat_equipement" && val && !editingId) {
                          const eq = equipements.find((eq) => String(eq.id) === String(val))
                          if (eq && eq.prix_achat != null) setMontantDt(String(eq.prix_achat))
                        }
                      }}
                      options={[{ value: "", label: "Sélectionner un équipement" }, ...equipements.map(eq => ({ value: eq.id, label: eq.nom }))]}
                      placeholder="Sélectionner un équipement"
                      className="mt-1 block w-full"
                    />
                    {errors.equipementId && <p className="mt-1 text-xs text-red-600">{errors.equipementId}</p>}
                  </>
                )}
              </div>
            )}

            {typeCharge === "don" && (
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Bénéficiaire
                </label>
                <input
                  type="text"
                  value={beneficiaire}
                  onChange={(e) => setBeneficiaire(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-olive-500 focus:ring-olive-500"
                  placeholder="Ex: Mosquée, association, personne..."
                />
              </div>
            )}
          </div>

          {avertissementPrixAchat && (
            <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
              Le prix d&apos;achat de{" "}
              <span className="font-semibold">&laquo; {avertissementPrixAchat.nom} &raquo;</span>{" "}
              ({Number(avertissementPrixAchat.prix).toLocaleString("fr-FR", { minimumFractionDigits: 3, maximumFractionDigits: 3 })} DT) est déjà enregistré.
              Tout changement du montant mettra à jour la charge existante et le prix d&apos;achat de l&apos;équipement.
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Description (optionnelle)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-olive-500 focus:ring-olive-500"
              placeholder="Détail de la charge (facultatif)"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => {
                setModalOuvert(false)
                resetForm()
              }}
              className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center justify-center rounded-md bg-olive-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-olive-700 focus:outline-none focus:ring-2 focus:ring-olive-500 focus:ring-offset-2 disabled:opacity-50"
            >
              {submitting
                ? "Enregistrement..."
                : editingId
                ? "Mettre à jour"
                : "Enregistrer la charge"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal confirmation suppression */}
      <Modal
        isOpen={deleteModalOpen}
        onClose={() => {
          if (!isDeleting) {
            setDeleteModalOpen(false)
            setChargeASupprimer(null)
          }
        }}
        title="Supprimer la charge"
        size="medium"
      >
        {chargeASupprimer && (
          <div className="space-y-4">
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
              <p className="font-semibold mb-1">
                Vous êtes sur le point de supprimer cette charge :
              </p>
              <p>
                {formatDate(chargeASupprimer.date)} —{" "}
                {formatTypeLabel(chargeASupprimer.type_charge)} —{" "}
                <span className="font-semibold">
                  {formatMontant(chargeASupprimer.montant_dt)}
                </span>
              </p>
              {chargeASupprimer.description && (
                <p className="mt-1 text-xs text-red-700">
                  {chargeASupprimer.description}
                </p>
              )}
            </div>
            <p className="text-sm text-gray-700">
              Cette action est irréversible.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => {
                  setDeleteModalOpen(false)
                  setChargeASupprimer(null)
                }}
                className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 disabled:opacity-50"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={confirmerSuppression}
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

export default FormulaireCharges
