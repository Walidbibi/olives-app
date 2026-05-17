import { useEffect, useState } from "react"
import { supabase } from "./supabase"
import Modal from "./Modal"
import Spinner from "./Spinner"
import Notification from "./Notification"
import SearchableSelect from "./SearchableSelect"
import { formatDate } from "./dateUtils"

const TYPE_LABELS = {
  taille: "Taille",
  labour: "Labour",
  engrais: "Engrais",
  desherbage: "Désherbage",
  autre: "Autre",
}


function SortIcon({ sortKey, col, sortDir }) {
  if (sortKey !== col) return <span className="ml-1 text-gray-300">↕</span>
  return <span className="ml-1">{sortDir === "asc" ? "↑" : "↓"}</span>
}

function FormulaireTraitements() {
  const [campagnes, setCampagnes] = useState([])
  const [campagneId, setCampagneId] = useState("")
  const [loadingCampagnes, setLoadingCampagnes] = useState(true)

  const [parcelles, setParcelles] = useState([])

  const [traitements, setTraitements] = useState([])
  const [loadingTraitements, setLoadingTraitements] = useState(false)
  const [totalCount, setTotalCount] = useState(0)
  const [refreshKey, setRefreshKey] = useState(0)
  const ITEMS_PAR_PAGE = 10

  const [pageCourante, setPageCourante] = useState(1)

  const [sortKey, setSortKey] = useState("date")
  const [sortDir, setSortDir] = useState("desc")

  const [filtreDateDebut, setFiltreDateDebut] = useState("")
  const [filtreDateFin, setFiltreDateFin] = useState("")
  const [filtreParcelleId, setFiltreParcelleId] = useState("")
  const [filtreTypeAction, setFiltreTypeAction] = useState("")

  const [filtersModalOpen, setFiltersModalOpen] = useState(false)
  const [tempFiltreDateDebut, setTempFiltreDateDebut] = useState("")
  const [tempFiltreDateFin, setTempFiltreDateFin] = useState("")
  const [tempFiltreParcelleId, setTempFiltreParcelleId] = useState("")
  const [tempFiltreTypeAction, setTempFiltreTypeAction] = useState("")

  const [modalOuvert, setModalOuvert] = useState(false)
  const [editingId, setEditingId] = useState(null)

  const [date, setDate] = useState("")
  const [parcelleId, setParcelleId] = useState("")
  const [typeAction, setTypeAction] = useState("")
  const [notes, setNotes] = useState("")

  const [message, setMessage] = useState("")
  const [messageType, setMessageType] = useState("info")
  const [errors, setErrors] = useState({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [traitementASupprimer, setTraitementASupprimer] = useState(null)
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    if (!message) return
    const timer = setTimeout(() => setMessage(""), 5000)
    return () => clearTimeout(timer)
  }, [message])

  useEffect(() => {
    async function init() {
      setLoadingCampagnes(true)
      const [{ data: campagnesData }, { data: parcellesData }] = await Promise.all([
        supabase.from("campagne").select("*").order("annee", { ascending: false }),
        supabase.from("parcelles").select("id, nom").order("nom"),
      ])
      setCampagnes(campagnesData || [])
      setParcelles(parcellesData || [])
      const enCours = (campagnesData || []).find(c => c.statut === "en_cours")
      if (enCours) setCampagneId(String(enCours.id))
      setLoadingCampagnes(false)
    }
    init()
  }, [])

  useEffect(() => {
    if (!campagneId) {
      setTraitements([])
      setTotalCount(0)
      return
    }
    async function loadTraitements() {
      setLoadingTraitements(true)
      const from = (pageCourante - 1) * ITEMS_PAR_PAGE
      const to = from + ITEMS_PAR_PAGE - 1

      let query = supabase
        .from("traitements")
        .select("*, parcelles(nom)", { count: "exact" })
        .eq("campagne_id", campagneId)
        .order(sortKey, { ascending: sortDir === "asc" })
        .range(from, to)

      if (filtreDateDebut) query = query.gte("date", filtreDateDebut)
      if (filtreDateFin) query = query.lte("date", filtreDateFin)
      if (filtreParcelleId) query = query.eq("parcelle_id", filtreParcelleId)
      if (filtreTypeAction) query = query.eq("type_action", filtreTypeAction)

      const { data, count, error } = await query

      if (error) {
        console.error("Erreur chargement traitements:", error)
        setTraitements([])
        setTotalCount(0)
      } else {
        setTraitements(data || [])
        setTotalCount(count || 0)
      }
      setLoadingTraitements(false)
    }
    loadTraitements()
  }, [campagneId, pageCourante, sortKey, sortDir, filtreDateDebut, filtreDateFin, filtreParcelleId, filtreTypeAction, refreshKey])

  function resetForm() {
    setDate("")
    setParcelleId("")
    setTypeAction("")
    setNotes("")
    setEditingId(null)
    setErrors({})
    setIsSubmitting(false)
  }

  function ouvrirModalCreation() {
    resetForm()
    setModalOuvert(true)
  }

  function ouvrirModalEdition(t) {
    setEditingId(t.id)
    setDate(t.date || "")
    setParcelleId(t.parcelle_id || "")
    setTypeAction(t.type_action || "")
    setNotes(t.notes || "")
    setErrors({})
    setModalOuvert(true)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (isSubmitting) return
    setIsSubmitting(true)

    const newErrors = {}
    if (!date) newErrors.date = "La date est obligatoire"
    if (!parcelleId) newErrors.parcelleId = "La parcelle est obligatoire"
    if (!typeAction) newErrors.typeAction = "Le type d'action est obligatoire"
    if (typeAction === "autre" && !notes?.trim()) newErrors.notes = "La description est obligatoire pour le type Autre"
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      setIsSubmitting(false)
      return
    }

    const payload = {
      campagne_id: campagneId,
      parcelle_id: parcelleId,
      date,
      type_action: typeAction,
      notes: notes?.trim() || null,
    }

    let error
    if (editingId) {
      const { error: e } = await supabase.from("traitements").update(payload).eq("id", editingId)
      error = e
    } else {
      const { error: e } = await supabase.from("traitements").insert([payload])
      error = e
    }

    if (error) {
      console.error("Erreur enregistrement traitement:", error)
      setMessageType("error")
      setMessage("Erreur lors de l'enregistrement du traitement")
      setIsSubmitting(false)
      return
    }

    setRefreshKey(k => k + 1)
    if (!editingId) setPageCourante(1)
    setMessageType("success")
    setMessage(editingId ? "Traitement mis à jour" : "Traitement enregistré")
    setModalOuvert(false)
    setEditingId(null)
    setIsSubmitting(false)
  }

  async function confirmerSuppression() {
    if (!traitementASupprimer) return
    setIsDeleting(true)
    const { error } = await supabase.from("traitements").delete().eq("id", traitementASupprimer.id)
    if (error) {
      console.error("Erreur suppression traitement:", error)
      setMessageType("error")
      setMessage("Erreur lors de la suppression")
    } else {
      const itemsRestants = totalCount - 1
      const nouvellesPages = Math.ceil(itemsRestants / ITEMS_PAR_PAGE)
      setPageCourante(Math.min(pageCourante, Math.max(1, nouvellesPages)))
      setRefreshKey(k => k + 1)
      setMessageType("success")
      setMessage("Traitement supprimé")
    }
    setDeleteModalOpen(false)
    setTraitementASupprimer(null)
    setIsDeleting(false)
  }

  function nomParcelleDepuisId(id) {
    const p = parcelles.find(p => String(p.id) === String(id))
    return p ? p.nom : "—"
  }

  function renderParcelleBadge(parcelleId) {
    const COLORS = [
      "bg-blue-50 text-blue-700",
      "bg-amber-50 text-amber-700",
      "bg-emerald-50 text-emerald-700",
      "bg-violet-50 text-violet-700",
      "bg-rose-50 text-rose-700",
    ]
    const idx = parcelles.findIndex(p => String(p.id) === String(parcelleId))
    const nom = idx >= 0 ? parcelles[idx].nom : nomParcelleDepuisId(parcelleId)
    if (!nom || nom === "—") return <span className="text-gray-400">—</span>
    const colorClass = idx >= 0 ? COLORS[idx % COLORS.length] : "bg-gray-50 text-gray-700"
    const baseClass = "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
    return <span className={`${baseClass} ${colorClass}`}>{nom}</span>
  }

  function toggleSort(key) {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc")
    else { setSortKey(key); setSortDir("desc") }
  }

  const totalPages = Math.ceil(totalCount / ITEMS_PAR_PAGE)
  const filtresActifs = filtreDateDebut || filtreDateFin || filtreParcelleId || filtreTypeAction

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Traitements</h2>
          <p className="text-sm text-gray-500">Journal des actions terrain par campagne.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {loadingCampagnes ? (
            <Spinner message="Chargement..." />
          ) : (
            <select
              value={campagneId}
              onChange={(e) => { setCampagneId(e.target.value); setPageCourante(1) }}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-olive-500 focus:ring-olive-500"
            >
              <option value="">Sélectionner une campagne</option>
              {campagnes.map(c => (
                <option key={c.id} value={c.id}>
                  Campagne {c.annee} — {c.statut === "en_cours" ? "En cours" : "Terminée"}
                </option>
              ))}
            </select>
          )}
          <button
            type="button"
            onClick={ouvrirModalCreation}
            disabled={!campagneId}
            className="inline-flex items-center justify-center rounded-md bg-olive-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-olive-700 focus:outline-none focus:ring-2 focus:ring-olive-500 focus:ring-offset-2 disabled:opacity-50"
          >
            + Nouveau traitement
          </button>
        </div>
      </div>

      <Notification message={message} type={messageType} onDismiss={() => setMessage("")} />

      {/* Compteur */}
      {campagneId && !loadingTraitements && (
        <div className="rounded-md bg-white px-4 py-3 shadow-sm border border-gray-200 text-sm text-gray-700">
          Total : <span className="font-semibold">{totalCount}</span> traitement{totalCount > 1 ? "s" : ""}
        </div>
      )}

      {/* Barre filtres */}
      {campagneId && !loadingTraitements && (
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => {
              setTempFiltreDateDebut(filtreDateDebut)
              setTempFiltreDateFin(filtreDateFin)
              setTempFiltreParcelleId(filtreParcelleId)
              setTempFiltreTypeAction(filtreTypeAction)
              setFiltersModalOpen(true)
            }}
            className="inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
          >
            Filtres
            {filtresActifs && (
              <span className="ml-2 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-olive-600 px-1 text-xs font-semibold text-white">
                {[filtreDateDebut, filtreDateFin, filtreParcelleId, filtreTypeAction].filter(Boolean).length}
              </span>
            )}
          </button>
          {filtresActifs && (
            <button
              type="button"
              onClick={() => { setFiltreDateDebut(""); setFiltreDateFin(""); setFiltreParcelleId(""); setFiltreTypeAction(""); setPageCourante(1) }}
              className="inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
            >
              Réinitialiser les filtres
            </button>
          )}
        </div>
      )}

      {/* Liste */}
      {!campagneId ? (
        <p className="text-sm text-gray-500">Sélectionnez une campagne pour voir les traitements.</p>
      ) : loadingTraitements ? (
        <Spinner message="Chargement des traitements..." />
      ) : traitements.length === 0 ? (
        <p className="text-sm text-gray-500">
          {filtresActifs ? "Aucun traitement ne correspond aux filtres." : "Aucun traitement enregistré pour cette campagne."}
        </p>
      ) : (
        <>
          {/* Cards mobile */}
          <div className="md:hidden space-y-2">
            {traitements.map(t => (
              <div key={t.id} className="rounded-lg border border-gray-200 bg-white p-3 shadow-sm">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{formatDate(t.date)}</p>
                    <div className="mt-0.5">{renderParcelleBadge(t.parcelle_id)}</div>
                  </div>
                  <div className="flex gap-3">
                    <button type="button" onClick={() => ouvrirModalEdition(t)} className="text-xs font-medium text-olive-700 hover:text-olive-900">Modifier</button>
                    <button type="button" onClick={() => { setTraitementASupprimer(t); setDeleteModalOpen(true) }} className="text-xs font-medium text-red-600 hover:text-red-800">Supprimer</button>
                  </div>
                </div>
                <p className="text-xs text-gray-700">{TYPE_LABELS[t.type_action] || t.type_action}</p>
                {t.notes && <p className="mt-0.5 text-xs text-gray-500">{t.notes}</p>}
              </div>
            ))}
          </div>

          {/* Table desktop */}
          <div className="hidden md:block overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th
                    className="px-3 py-2 text-left font-medium text-gray-600 cursor-pointer select-none"
                    onClick={() => toggleSort("date")}
                  >
                    Date <SortIcon sortKey={sortKey} col="date" sortDir={sortDir} />
                  </th>
                  <th className="px-3 py-2 text-left font-medium text-gray-600">Parcelle</th>
                  <th
                    className="px-3 py-2 text-left font-medium text-gray-600 cursor-pointer select-none"
                    onClick={() => toggleSort("type_action")}
                  >
                    Action <SortIcon sortKey={sortKey} col="type_action" sortDir={sortDir} />
                  </th>
                  <th className="px-3 py-2 text-left font-medium text-gray-600">Notes</th>
                  <th className="px-3 py-2 text-right font-medium text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {traitements.map(t => (
                  <tr key={t.id}>
                    <td className="px-3 py-2 text-gray-800 whitespace-nowrap">{formatDate(t.date)}</td>
                    <td className="px-3 py-2">{renderParcelleBadge(t.parcelle_id)}</td>
                    <td className="px-3 py-2 text-gray-800">{TYPE_LABELS[t.type_action] || t.type_action}</td>
                    <td className="px-3 py-2 text-gray-600 max-w-xs truncate">{t.notes || "—"}</td>
                    <td className="px-3 py-2 text-right space-x-2 whitespace-nowrap">
                      <button type="button" onClick={() => ouvrirModalEdition(t)} className="text-xs font-medium text-olive-700 hover:text-olive-900">Modifier</button>
                      <button type="button" onClick={() => { setTraitementASupprimer(t); setDeleteModalOpen(true) }} className="text-xs font-medium text-red-600 hover:text-red-800">Supprimer</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between text-sm text-gray-600">
              <span>Page {pageCourante} / {totalPages} — {totalCount} résultat{totalCount > 1 ? "s" : ""}</span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setPageCourante(p => Math.max(1, p - 1))}
                  disabled={pageCourante === 1}
                  className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm disabled:opacity-40 hover:bg-gray-50"
                >
                  ← Précédent
                </button>
                <button
                  type="button"
                  onClick={() => setPageCourante(p => Math.min(totalPages, p + 1))}
                  disabled={pageCourante === totalPages}
                  className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm disabled:opacity-40 hover:bg-gray-50"
                >
                  Suivant →
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Modal ajout / modification */}
      <Modal
        isOpen={modalOuvert}
        onClose={() => { setModalOuvert(false); setEditingId(null) }}
        title={editingId ? "Modifier un traitement" : "Nouveau traitement"}
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
                Parcelle <span className="text-red-500">*</span>
              </label>
              <SearchableSelect
                value={parcelleId}
                onChange={(val) => { setParcelleId(val); setErrors(prev => ({ ...prev, parcelleId: "" })) }}
                options={[{ value: "", label: "Sélectionner une parcelle" }, ...parcelles.map(p => ({ value: p.id, label: p.nom }))]}
                placeholder="Sélectionner une parcelle"
                className="mt-1 block w-full"
              />
              {errors.parcelleId && <p className="mt-1 text-xs text-red-600">{errors.parcelleId}</p>}
            </div>

            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700">
                Type d&apos;action <span className="text-red-500">*</span>
              </label>
              <select
                value={typeAction}
                onChange={(e) => { setTypeAction(e.target.value); setErrors(prev => ({ ...prev, typeAction: "", notes: "" })) }}
                onBlur={() => { if (!typeAction) setErrors(prev => ({ ...prev, typeAction: "Le type d'action est obligatoire" })) }}
                className={`mt-1 block w-full rounded-md border px-3 py-2 text-sm shadow-sm focus:ring-1 ${errors.typeAction ? "border-red-300 focus:border-red-500 focus:ring-red-500" : "border-gray-300 focus:border-olive-500 focus:ring-olive-500"}`}
              >
                <option value="">Sélectionner</option>
                <option value="taille">Taille</option>
                <option value="labour">Labour</option>
                <option value="engrais">Engrais</option>
                <option value="desherbage">Désherbage</option>
                <option value="autre">Autre</option>
              </select>
              {errors.typeAction && <p className="mt-1 text-xs text-red-600">{errors.typeAction}</p>}
            </div>

            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700">
                Notes
                {typeAction === "autre"
                  ? <span className="text-red-500 ml-1">*</span>
                  : <span className="text-gray-400 text-xs ml-1">(optionnel)</span>
                }
              </label>
              <textarea
                value={notes}
                onChange={(e) => { setNotes(e.target.value); setErrors(prev => ({ ...prev, notes: "" })) }}
                onBlur={() => {
                  if (typeAction === "autre" && !notes?.trim())
                    setErrors(prev => ({ ...prev, notes: "La description est obligatoire pour le type Autre" }))
                }}
                rows={3}
                placeholder={typeAction === "autre" ? "Précisez le type de traitement..." : "Détails optionnels..."}
                className={`mt-1 block w-full rounded-md border px-3 py-2 text-sm shadow-sm focus:ring-1 resize-none ${errors.notes ? "border-red-300 focus:border-red-500 focus:ring-red-500" : "border-gray-300 focus:border-olive-500 focus:ring-olive-500"}`}
              />
              {errors.notes && <p className="mt-1 text-xs text-red-600">{errors.notes}</p>}
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => { setModalOuvert(false); setEditingId(null) }}
              className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center justify-center rounded-md bg-olive-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-olive-700 focus:outline-none focus:ring-2 focus:ring-olive-500 focus:ring-offset-2 disabled:opacity-50"
            >
              {isSubmitting ? "Enregistrement..." : editingId ? "Mettre à jour" : "Enregistrer"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal filtres */}
      <Modal
        isOpen={filtersModalOpen}
        onClose={() => setFiltersModalOpen(false)}
        title="Filtrer les traitements"
        size="medium"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700">Date début</label>
              <input
                type="date"
                value={tempFiltreDateDebut}
                onChange={(e) => setTempFiltreDateDebut(e.target.value)}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-olive-500 focus:ring-olive-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Date fin</label>
              <input
                type="date"
                value={tempFiltreDateFin}
                onChange={(e) => setTempFiltreDateFin(e.target.value)}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-olive-500 focus:ring-olive-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Parcelle</label>
              <SearchableSelect
                value={tempFiltreParcelleId}
                onChange={setTempFiltreParcelleId}
                options={[{ value: "", label: "Toutes les parcelles" }, ...parcelles.map(p => ({ value: p.id, label: p.nom }))]}
                placeholder="Toutes les parcelles"
                className="mt-1 block w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Type d&apos;action</label>
              <select
                value={tempFiltreTypeAction}
                onChange={(e) => setTempFiltreTypeAction(e.target.value)}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-olive-500 focus:ring-olive-500"
              >
                <option value="">Tous</option>
                <option value="taille">Taille</option>
                <option value="labour">Labour</option>
                <option value="engrais">Engrais</option>
                <option value="desherbage">Désherbage</option>
                <option value="autre">Autre</option>
              </select>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={() => { setTempFiltreDateDebut(""); setTempFiltreDateFin(""); setTempFiltreParcelleId(""); setTempFiltreTypeAction("") }}
              className="text-sm text-gray-500 hover:text-gray-700 underline"
            >
              Réinitialiser
            </button>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setFiltersModalOpen(false)}
                className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={() => {
                  setFiltreDateDebut(tempFiltreDateDebut)
                  setFiltreDateFin(tempFiltreDateFin)
                  setFiltreParcelleId(tempFiltreParcelleId)
                  setFiltreTypeAction(tempFiltreTypeAction)
                  setPageCourante(1)
                  setFiltersModalOpen(false)
                }}
                className="rounded-md bg-olive-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-olive-700"
              >
                Appliquer
              </button>
            </div>
          </div>
        </div>
      </Modal>

      {/* Modal suppression */}
      <Modal
        isOpen={deleteModalOpen}
        onClose={() => { if (!isDeleting) { setDeleteModalOpen(false); setTraitementASupprimer(null) } }}
        title="Supprimer le traitement"
        size="medium"
      >
        {traitementASupprimer && (
          <div className="space-y-4">
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
              Vous êtes sur le point de supprimer le traitement du{" "}
              <span className="font-semibold">{formatDate(traitementASupprimer.date)}</span>{" "}
              ({TYPE_LABELS[traitementASupprimer.type_action]}) sur{" "}
              <span className="font-semibold">
                {traitementASupprimer.parcelles?.nom || nomParcelleDepuisId(traitementASupprimer.parcelle_id)}
              </span>. Cette action est définitive.
            </div>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => { setDeleteModalOpen(false); setTraitementASupprimer(null) }}
                disabled={isDeleting}
                className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 disabled:opacity-50"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={confirmerSuppression}
                disabled={isDeleting}
                className="inline-flex items-center justify-center rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-red-700 disabled:opacity-50"
              >
                {isDeleting ? "Suppression..." : "Supprimer"}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}

export default FormulaireTraitements
