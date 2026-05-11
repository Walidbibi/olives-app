import { useState, useEffect, useMemo, useRef } from "react"
import { supabase } from "./supabase"
import Modal from "./Modal"
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts"

const SOUS_TYPE_LABELS = {
  salaire_chauffeur: "Salaire chauffeur",
  carburant: "Carburant",
  entretien: "Entretien",
  reparation: "Réparation",
  assurance: "Assurance",
  vignette: "Vignette",
  achat_equipement: "Achat équipement",
  autre_equipement: "Autre charge équipement",
}

function DashboardTracteur({ equipement, onRetourProfil }) {
  // Menu d'actions et modales
  const [actionsOpen, setActionsOpen] = useState(false)
  const actionsRef = useRef(null)

  useEffect(() => {
    if (!actionsOpen) return
    function handleClickOutside(e) {
      if (actionsRef.current && !actionsRef.current.contains(e.target)) {
        setActionsOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [actionsOpen])
  const [activiteModalOpen, setActiviteModalOpen] = useState(false)
  const [editingActivite, setEditingActivite] = useState(null)

  // Panneaux de détail togglables
  const [showActivitesDetail, setShowActivitesDetail] = useState(false)
  const [showChargesDetail, setShowChargesDetail] = useState(false)
  const [showRecettesDetail, setShowRecettesDetail] = useState(false)

  // Campagnes
  const [campagnes, setCampagnes] = useState([])
  const [campagneId, setCampagneId] = useState("")
  const [loadingCampagnes, setLoadingCampagnes] = useState(true)
  const [campagnesError, setCampagnesError] = useState(null)

  // Formulaire d'activité
  const [form, setForm] = useState({
    date_activite: new Date().toISOString().slice(0, 10),
    type_activite: "propre",
    nb_oliviers: "",
    prix_par_olivier: "",
    commentaire: "",
    campagne_id: "",
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [deletingId, setDeletingId] = useState(null)

  // Compteur pour déclencher le rechargement après toute mutation
  const [refreshKey, setRefreshKey] = useState(0)

  // Équipement complet (recharge prix_achat si manquant dans le prop)
  const [equipementFull, setEquipementFull] = useState(equipement)
  useEffect(() => {
    setEquipementFull(equipement)
    if (equipement?.id && equipement.prix_achat === undefined) {
      supabase.from("equipements").select("*").eq("id", equipement.id).single()
        .then(({ data }) => { if (data) setEquipementFull(data) })
    }
  }, [equipement])

  // Activités tracteur
  const [activites, setActivites] = useState([])
  const [loadingActivites, setLoadingActivites] = useState(false)
  const [activitesError, setActivitesError] = useState(null)
  const [activitePage, setActivitePage] = useState(0)
  const ACTIVITES_PAGE_SIZE = 10

  // Modal charge salaire chauffeur
  const [chargeModalOpen, setChargeModalOpen] = useState(false)
  const [chargeForm, setChargeForm] = useState({ date: "", montant_dt: "", description: "", campagne_id: "", sous_type: "salaire_chauffeur" })
  const [savingCharge, setSavingCharge] = useState(false)
  const [chargeFormError, setChargeFormError] = useState(null)

  // Charges tracteurs (liste complète pour total + détail)
  const [chargesDetail, setChargesDetail] = useState([])
  const [tracteurNomMap, setTracteurNomMap] = useState({})
  const [loadingCharges, setLoadingCharges] = useState(false)
  const [chargesError, setChargesError] = useState(null)

  // KPI dérivés des activités
  const totalOliviersTracteur = useMemo(
    () => activites.reduce((sum, a) => sum + (parseInt(a.nb_oliviers, 10) || 0), 0),
    [activites]
  )

  const recettesLocation = useMemo(
    () =>
      activites
        .filter((a) => a.type_activite === "sous_traitance")
        .reduce(
          (sum, a) =>
            sum + (parseInt(a.nb_oliviers, 10) || 0) * (parseFloat(a.prix_par_olivier) || 0),
          0
        ),
    [activites]
  )

  // Total charges dérivé de la liste complète
  const totalChargesTracteurs = useMemo(
    () => chargesDetail.reduce((sum, c) => sum + (parseFloat(c.montant_dt) || 0), 0),
    [chargesDetail]
  )

  const gainNet = loadingCharges ? null : recettesLocation - totalChargesTracteurs

  // Ce que j'aurais payé pour louer un tracteur externe pour mes propres parcelles
  const economiesHypothetiques = useMemo(
    () =>
      activites
        .filter((a) => a.type_activite === "propre")
        .reduce(
          (sum, a) =>
            sum + (parseInt(a.nb_oliviers, 10) || 0) * (parseFloat(a.prix_par_olivier) || 0),
          0
        ),
    [activites]
  )

  // Gain total d'avoir le tracteur vs ne pas l'avoir
  const impactTracteur = loadingCharges ? null : economiesHypothetiques + recettesLocation - totalChargesTracteurs

  const oliviersParType = useMemo(() => {
    const propre = activites
      .filter((a) => a.type_activite === "propre")
      .reduce((sum, a) => sum + (parseInt(a.nb_oliviers, 10) || 0), 0)
    const sousTrait = activites
      .filter((a) => a.type_activite === "sous_traitance")
      .reduce((sum, a) => sum + (parseInt(a.nb_oliviers, 10) || 0), 0)
    return [
      { name: "Mes parcelles", value: propre },
      { name: "Sous-traitance", value: sousTrait },
    ].filter((d) => d.value > 0)
  }, [activites])

  const chargesParSousType = useMemo(() => {
    const totaux = {}
    chargesDetail.forEach((c) => {
      const k = c.sous_type || "autre"
      totaux[k] = (totaux[k] || 0) + (parseFloat(c.montant_dt) || 0)
    })
    return Object.entries(totaux)
      .map(([key, value]) => ({ name: SOUS_TYPE_LABELS[key] ?? key, value }))
      .filter((d) => d.value > 0)
      .sort((a, b) => b.value - a.value)
  }, [chargesDetail])

  const campagneMap = useMemo(
    () => campagnes.reduce((acc, c) => { acc[c.id] = c.annee; return acc }, {}),
    [campagnes]
  )

  // Charger les campagnes
  useEffect(() => {
    async function loadCampagnes() {
      setLoadingCampagnes(true)
      setCampagnesError(null)
      const { data, error } = await supabase
        .from("campagne")
        .select("id, annee, statut")
        .order("annee", { ascending: false })
      setLoadingCampagnes(false)
      if (error) { setCampagnesError("Impossible de charger les campagnes."); return }
      setCampagnes(data || [])
    }
    loadCampagnes()
  }, [])

  // Charger les activités de ce tracteur
  useEffect(() => {
    async function loadActivites() {
      if (!equipement) { setActivites([]); return }
      setLoadingActivites(true)
      setActivitesError(null)
      let query = supabase
        .from("activite_tracteur")
        .select("*")
        .eq("equipement_id", equipement.id)
        .order("date_activite", { ascending: false })
      if (campagneId) query = query.eq("campagne_id", campagneId)
      const { data, error } = await query
      setLoadingActivites(false)
      if (error) { setActivitesError("Impossible de charger les activités."); return }
      setActivites(data || [])
    }
    loadActivites()
  }, [equipement, campagneId, refreshKey])

  useEffect(() => { setActivitePage(0) }, [activites])

  // Charger les charges de tous les tracteurs (détail complet)
  useEffect(() => {
    async function loadCharges() {
      setLoadingCharges(true)
      setChargesError(null)

      const { data: tracteurs, error: errTracteurs } = await supabase
        .from("equipements")
        .select("id, nom")
        .eq("type", "Tracteur")

      if (errTracteurs) {
        setChargesError("Impossible de charger les charges.")
        setLoadingCharges(false)
        return
      }
      if (!tracteurs?.length) {
        setChargesDetail([])
        setLoadingCharges(false)
        return
      }

      const nomMap = tracteurs.reduce((acc, t) => { acc[t.id] = t.nom; return acc }, {})
      setTracteurNomMap(nomMap)

      const tracteurIds = tracteurs.map((t) => t.id)
      let query = supabase
        .from("charge")
        .select("id, date, sous_type, montant_dt, description, equipement_id")
        .eq("type_charge", "equipement")
        .in("equipement_id", tracteurIds)
        .order("date", { ascending: false })
      if (campagneId) query = query.eq("campagne_id", campagneId)

      const { data, error } = await query
      setLoadingCharges(false)
      if (error) { setChargesError("Impossible de charger les charges."); return }
      setChargesDetail(data || [])
    }
    loadCharges()
  }, [campagneId, refreshKey])

  const resetForm = () => {
    setForm({
      date_activite: new Date().toISOString().slice(0, 10),
      type_activite: "propre",
      nb_oliviers: "",
      prix_par_olivier: "",
      commentaire: "",
      campagne_id: campagneId || "",
    })
    setError(null)
    setSaving(false)
    setEditingActivite(null)
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleOpenActiviteModal = () => { resetForm(); setActiviteModalOpen(true) }

  const handleOpenEditModal = (activite) => {
    setEditingActivite(activite)
    setForm({
      date_activite: activite.date_activite,
      type_activite: activite.type_activite,
      nb_oliviers: String(activite.nb_oliviers),
      prix_par_olivier: String(activite.prix_par_olivier),
      commentaire: activite.commentaire || "",
      campagne_id: activite.campagne_id || "",
    })
    setError(null)
    setSaving(false)
    setActiviteModalOpen(true)
  }

  const handleCloseActiviteModal = () => { if (!saving) setActiviteModalOpen(false) }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)

    if (!equipement) { setError("Aucun tracteur sélectionné."); return }
    if (!form.campagne_id) { setError("Veuillez sélectionner une campagne."); return }
    const nb = parseInt(form.nb_oliviers, 10)
    if (isNaN(nb) || nb <= 0) { setError("Le nombre d'oliviers doit être un entier positif."); return }
    const prix = parseFloat(form.prix_par_olivier)
    if (isNaN(prix) || prix < 0) { setError("Le prix par olivier doit être un nombre positif."); return }

    setSaving(true)
    const payload = {
      equipement_id: equipement.id,
      campagne_id: form.campagne_id,
      date_activite: form.date_activite,
      type_activite: form.type_activite,
      nb_oliviers: nb,
      prix_par_olivier: prix,
      commentaire: form.commentaire || null,
    }

    let dbError
    if (editingActivite) {
      const { error } = await supabase.from("activite_tracteur").update(payload).eq("id", editingActivite.id)
      dbError = error
    } else {
      const { error } = await supabase.from("activite_tracteur").insert([payload])
      dbError = error
    }
    setSaving(false)

    if (dbError) { console.error(dbError); setError("Erreur lors de l'enregistrement. Réessaie."); return }
    setActiviteModalOpen(false)
    setRefreshKey((k) => k + 1)
  }

  const handleDelete = async (activite) => {
    if (!window.confirm(`Supprimer l'activité du ${activite.date_activite} (${activite.nb_oliviers} oliviers) ?`)) return
    setDeletingId(activite.id)
    const { error } = await supabase.from("activite_tracteur").delete().eq("id", activite.id)
    setDeletingId(null)
    if (error) { console.error(error); return }
    setRefreshKey((k) => k + 1)
  }

  const handleOpenChargeModal = (sous_type = "salaire_chauffeur") => {
    setChargeForm({ date: new Date().toISOString().slice(0, 10), montant_dt: "", description: "", campagne_id: campagneId || "", sous_type })
    setChargeFormError(null)
    setSavingCharge(false)
    setChargeModalOpen(true)
  }

  const handleSubmitCharge = async (e) => {
    e.preventDefault()
    setChargeFormError(null)
    if (!chargeForm.campagne_id) { setChargeFormError("Veuillez sélectionner une campagne."); return }
    const montant = parseFloat(chargeForm.montant_dt)
    if (isNaN(montant) || montant <= 0) { setChargeFormError("Le montant doit être un nombre positif."); return }

    setSavingCharge(true)
    const { error } = await supabase.from("charge").insert([{
      campagne_id: chargeForm.campagne_id,
      date: chargeForm.date,
      type_charge: "equipement",
      sous_type: chargeForm.sous_type,
      montant_dt: montant,
      equipement_id: equipement.id,
      description: chargeForm.description || null,
    }])
    setSavingCharge(false)

    if (error) { console.error(error); setChargeFormError("Erreur lors de l'enregistrement. Réessaie."); return }
    setChargeModalOpen(false)
    setRefreshKey((k) => k + 1)
  }

  const fmt = (n, decimals = 2) =>
    n.toLocaleString("fr-FR", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {onRetourProfil && (
        <button onClick={onRetourProfil} className="mb-4 text-xs text-olive-700 hover:underline">
          ✕ Fermer
        </button>
      )}

      {/* En-tête */}
      <header className="mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Dashboard tracteur</h1>
            {equipement ? (
              <p className="text-sm text-gray-600">{equipement.nom} ({equipement.type})</p>
            ) : (
              <p className="text-sm text-gray-500">Aucun équipement sélectionné (mode debug).</p>
            )}
            <p className="text-xs text-gray-400 mt-1">Suivi du gain sur investissement pour ce tracteur.</p>
          </div>

          {/* Sélecteur de campagne + Actions */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <div>
              <p className="text-[11px] font-medium text-gray-600 mb-0.5">Campagne</p>
              {loadingCampagnes ? (
                <p className="text-[11px] text-gray-500">Chargement des campagnes...</p>
              ) : campagnesError ? (
                <p className="text-[11px] text-red-600">{campagnesError}</p>
              ) : (
                <select
                  value={campagneId}
                  onChange={(e) => setCampagneId(e.target.value)}
                  className="rounded-md border border-gray-300 px-2 py-1 text-xs shadow-sm focus:border-olive-500 focus:ring-olive-500"
                >
                  <option value="">Toutes les campagnes</option>
                  {campagnes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.annee} {c.statut ? `- ${c.statut}` : ""}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div className="relative" ref={actionsRef}>
              <button
                type="button"
                onClick={() => setActionsOpen((v) => !v)}
                className="inline-flex items-center gap-2 rounded-md bg-olive-600 px-3 py-2 text-xs font-medium text-white shadow-sm hover:bg-olive-500"
              >
                <span className="text-base">+</span>
                <span>Actions</span>
              </button>
              {actionsOpen && (
                <div className="absolute right-0 mt-2 w-64 rounded-md border border-gray-200 bg-white shadow-lg z-10">
                  <button
                    type="button"
                    onClick={() => { setActionsOpen(false); handleOpenActiviteModal() }}
                    className="w-full text-left px-3 py-2 text-xs text-gray-700 hover:bg-gray-50"
                  >
                    ➕ Ajouter une activité tracteur
                  </button>
                  <button
                    type="button"
                    onClick={() => { setActionsOpen(false); handleOpenChargeModal("salaire_chauffeur") }}
                    className="w-full text-left px-3 py-2 text-xs text-gray-700 hover:bg-gray-50"
                  >
                    ➕ Ajouter charge — Salaire chauffeur
                  </button>
                  <button
                    type="button"
                    onClick={() => { setActionsOpen(false); handleOpenChargeModal("entretien") }}
                    className="w-full text-left px-3 py-2 text-xs text-gray-700 hover:bg-gray-50"
                  >
                    ➕ Ajouter charge — Entretien tracteur
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Grille 4 KPI */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">

        {/* Gain net */}
        <div className="bg-white border border-gray-200 rounded-lg px-3 py-3 shadow-sm">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Gain net</p>
          {loadingActivites || loadingCharges ? (
            <p className="mt-2 text-sm text-gray-500">Chargement des données...</p>
          ) : activitesError || chargesError ? (
            <p className="mt-2 text-xs text-red-600">Erreur de calcul</p>
          ) : (
            <p className={`mt-2 text-xl font-semibold ${gainNet >= 0 ? "text-emerald-700" : "text-red-600"}`}>
              {fmt(gainNet)} DT
            </p>
          )}
          <p className="mt-1 text-xs text-gray-500">Recettes location – charges tracteur</p>
        </div>

        {/* Recettes location */}
        <div className="bg-white border border-gray-200 rounded-lg px-3 py-3 shadow-sm">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Recettes location</p>
          {loadingActivites ? (
            <p className="mt-2 text-sm text-gray-500">Chargement des activités...</p>
          ) : activitesError ? (
            <p className="mt-2 text-xs text-red-600">{activitesError}</p>
          ) : (
            <p className="mt-2 text-xl font-semibold text-gray-900">{fmt(recettesLocation)} DT</p>
          )}
          <p className="mt-1 text-xs text-gray-500">Oliviers traités chez d&apos;autres agriculteurs</p>
          <button
            type="button"
            onClick={() => setShowRecettesDetail((v) => !v)}
            className="mt-2 text-left text-xs text-olive-700 hover:underline"
          >
            {showRecettesDetail ? "Masquer le détail" : "Afficher le détail"}
          </button>
        </div>

        {/* Total charges */}
        <div className="bg-white border border-gray-200 rounded-lg px-3 py-3 shadow-sm flex flex-col">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Total charges</p>
          {loadingCharges ? (
            <p className="mt-2 text-sm text-gray-500">Chargement des charges...</p>
          ) : chargesError ? (
            <p className="mt-2 text-xs text-red-600">{chargesError}</p>
          ) : (
            <p className="mt-2 text-xl font-semibold text-gray-900">{fmt(totalChargesTracteurs)} DT</p>
          )}
          <p className="mt-1 text-xs text-gray-500">Salaire chauffeur, carburant, entretien...</p>
          <button
            type="button"
            onClick={() => setShowChargesDetail((v) => !v)}
            className="mt-2 text-left text-xs text-olive-700 hover:underline"
          >
            {showChargesDetail ? "Masquer le détail" : "Afficher le détail"}
          </button>
        </div>

        {/* Oliviers traités */}
        <div className="bg-white border border-gray-200 rounded-lg px-3 py-3 shadow-sm flex flex-col">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Oliviers traités</p>
          {loadingActivites ? (
            <p className="mt-2 text-sm text-gray-500">Chargement des activités...</p>
          ) : activitesError ? (
            <p className="mt-2 text-xs text-red-600">{activitesError}</p>
          ) : (
            <p className="mt-2 text-xl font-semibold text-gray-900">
              {totalOliviersTracteur.toLocaleString("fr-FR")} oliviers
            </p>
          )}
          <p className="mt-1 text-xs text-gray-500">
            {campagneId ? "Campagne sélectionnée." : "Toutes campagnes."}
          </p>
          <button
            type="button"
            onClick={() => setShowActivitesDetail((v) => !v)}
            className="mt-2 text-left text-xs text-olive-700 hover:underline"
          >
            {showActivitesDetail ? "Masquer le détail" : "Afficher le détail"}
          </button>
        </div>
      </section>

      {/* MODAL détail : recettes location */}
      <Modal isOpen={showRecettesDetail} onClose={() => setShowRecettesDetail(false)} title="Détail des recettes location" size="xlarge">
        {loadingActivites ? (
          <p className="py-6 text-sm text-gray-500">Chargement des activités...</p>
        ) : activites.filter((a) => a.type_activite === "sous_traitance").length === 0 ? (
          <p className="py-6 text-sm text-gray-400 text-center">Aucune activité de sous-traitance pour cette sélection.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-50 text-gray-500 uppercase tracking-wide">
                  <th className="px-3 py-2 text-left font-medium">Date</th>
                  <th className="px-3 py-2 text-left font-medium">Campagne</th>
                  <th className="px-3 py-2 text-right font-medium">Oliviers</th>
                  <th className="px-3 py-2 text-right font-medium">Prix/olivier</th>
                  <th className="px-3 py-2 text-right font-medium">Montant</th>
                  <th className="px-3 py-2 text-left font-medium">Commentaire</th>
                  <th className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {activites.filter((a) => a.type_activite === "sous_traitance").map((a) => {
                  const montant = (parseInt(a.nb_oliviers, 10) || 0) * (parseFloat(a.prix_par_olivier) || 0)
                  return (
                    <tr key={a.id} className="hover:bg-gray-50">
                      <td className="px-3 py-2 text-gray-800 whitespace-nowrap">{a.date_activite}</td>
                      <td className="px-3 py-2 text-gray-600">{campagneMap[a.campagne_id] ?? "-"}</td>
                      <td className="px-3 py-2 text-right text-gray-800">{Number(a.nb_oliviers).toLocaleString("fr-FR")}</td>
                      <td className="px-3 py-2 text-right text-gray-600">{fmt(parseFloat(a.prix_par_olivier) || 0)} DT</td>
                      <td className="px-3 py-2 text-right font-medium text-gray-800">{fmt(montant)} DT</td>
                      <td className="px-3 py-2 text-gray-500 max-w-40 truncate">{a.commentaire || "—"}</td>
                      <td className="px-3 py-2 whitespace-nowrap text-right">
                        <button type="button" onClick={() => { setShowRecettesDetail(false); handleOpenEditModal(a) }} className="text-indigo-600 hover:underline mr-3">Modifier</button>
                        <button type="button" onClick={() => handleDelete(a)} disabled={deletingId === a.id} className="text-red-500 hover:underline disabled:opacity-50">
                          {deletingId === a.id ? "..." : "Supprimer"}
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot>
                <tr className="bg-gray-50 font-semibold">
                  <td colSpan={4} className="px-3 py-2 text-xs text-gray-700">Total</td>
                  <td className="px-3 py-2 text-right text-xs text-gray-900">{fmt(recettesLocation)} DT</td>
                  <td colSpan={2} />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </Modal>

      {/* MODAL détail : charges tracteurs */}
      <Modal isOpen={showChargesDetail} onClose={() => setShowChargesDetail(false)} title="Détail des charges tracteur" size="xlarge">
        {loadingCharges ? (
          <p className="py-6 text-sm text-gray-500">Chargement des charges...</p>
        ) : chargesDetail.length === 0 ? (
          <p className="py-6 text-sm text-gray-400 text-center">Aucune charge enregistrée pour cette sélection.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-50 text-gray-500 uppercase tracking-wide">
                  <th className="px-3 py-2 text-left font-medium">Date</th>
                  <th className="px-3 py-2 text-left font-medium">Tracteur</th>
                  <th className="px-3 py-2 text-left font-medium">Sous-type</th>
                  <th className="px-3 py-2 text-right font-medium">Montant</th>
                  <th className="px-3 py-2 text-left font-medium">Description</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {chargesDetail.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50">
                    <td className="px-3 py-2 text-gray-800 whitespace-nowrap">{c.date}</td>
                    <td className="px-3 py-2 text-gray-600">{tracteurNomMap[c.equipement_id] ?? "-"}</td>
                    <td className="px-3 py-2 text-gray-800">{SOUS_TYPE_LABELS[c.sous_type] ?? c.sous_type ?? "-"}</td>
                    <td className="px-3 py-2 text-right font-medium text-gray-800">{fmt(parseFloat(c.montant_dt) || 0)} DT</td>
                    <td className="px-3 py-2 text-gray-500 max-w-40 truncate">{c.description || "—"}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-gray-50 font-semibold">
                  <td colSpan={3} className="px-3 py-2 text-xs text-gray-700">Total</td>
                  <td className="px-3 py-2 text-right text-xs text-gray-900">{fmt(totalChargesTracteurs)} DT</td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </Modal>

      {/* MODAL détail : activités (oliviers traités) */}
      <Modal isOpen={showActivitesDetail} onClose={() => setShowActivitesDetail(false)} title="Détail des activités tracteur" size="xlarge">
        {loadingActivites ? (
          <p className="py-6 text-sm text-gray-500">Chargement des activités...</p>
        ) : activites.length === 0 ? (
          <p className="py-6 text-sm text-gray-400 text-center">Aucune activité enregistrée pour cette sélection.</p>
        ) : (() => {
          const totalPages = Math.ceil(activites.length / ACTIVITES_PAGE_SIZE)
          const pageActivites = activites.slice(activitePage * ACTIVITES_PAGE_SIZE, (activitePage + 1) * ACTIVITES_PAGE_SIZE)
          return (
            <>
              {/* Vue cartes — mobile uniquement */}
              <div className="md:hidden space-y-2 mb-2">
                {pageActivites.map((a) => {
                  const montant = (parseInt(a.nb_oliviers, 10) || 0) * (parseFloat(a.prix_par_olivier) || 0)
                  return (
                    <div key={a.id} className="rounded-lg border border-gray-200 bg-white p-3 shadow-sm">
                      <div className="flex items-start justify-between mb-1">
                        <p className="text-sm font-semibold text-gray-900">{a.date_activite}</p>
                        <div className="text-right">
                          <p className="text-xl font-bold text-gray-900">{Number(a.nb_oliviers).toLocaleString("fr-FR")} oliviers</p>
                          <p className="text-xs text-gray-500">{fmt(parseFloat(a.prix_par_olivier) || 0)} DT/olivier</p>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mb-2">
                        {a.type_activite === "sous_traitance" ? (
                          <span className="inline-flex items-center rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-medium text-indigo-700">Sous-traitance</span>
                        ) : (
                          <span className="inline-flex items-center rounded-full bg-olive-50 px-2 py-0.5 text-[10px] font-medium text-olive-700">Mes parcelles</span>
                        )}
                        <span className="text-xs text-gray-500">{campagneMap[a.campagne_id] ?? "-"}</span>
                        <span className="ml-auto text-sm font-semibold text-gray-900">{fmt(montant)} DT</span>
                      </div>
                      {a.commentaire && (
                        <p className="text-xs text-gray-400 mb-2 truncate">{a.commentaire}</p>
                      )}
                      <div className="flex items-center gap-3 pt-2 border-t border-gray-100">
                        <button type="button" onClick={() => { setShowActivitesDetail(false); handleOpenEditModal(a) }} className="text-xs font-medium text-indigo-600 hover:text-indigo-800">Modifier</button>
                        <button type="button" onClick={() => handleDelete(a)} disabled={deletingId === a.id} className="text-xs font-medium text-red-600 hover:text-red-800 ml-auto disabled:opacity-50">
                          {deletingId === a.id ? "..." : "Supprimer"}
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Vue tableau — desktop uniquement */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-gray-50 text-gray-500 uppercase tracking-wide">
                      <th className="px-3 py-2 text-left font-medium">Date</th>
                      <th className="px-3 py-2 text-left font-medium">Campagne</th>
                      <th className="px-3 py-2 text-left font-medium">Type</th>
                      <th className="px-3 py-2 text-right font-medium">Oliviers</th>
                      <th className="px-3 py-2 text-right font-medium">Prix/olivier</th>
                      <th className="px-3 py-2 text-right font-medium">Montant</th>
                      <th className="px-3 py-2 text-left font-medium">Commentaire</th>
                      <th className="px-3 py-2"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {pageActivites.map((a) => {
                      const montant = (parseInt(a.nb_oliviers, 10) || 0) * (parseFloat(a.prix_par_olivier) || 0)
                      return (
                        <tr key={a.id} className="hover:bg-gray-50">
                          <td className="px-3 py-2 text-gray-800 whitespace-nowrap">{a.date_activite}</td>
                          <td className="px-3 py-2 text-gray-600">{campagneMap[a.campagne_id] ?? "-"}</td>
                          <td className="px-3 py-2">
                            {a.type_activite === "sous_traitance" ? (
                              <span className="inline-flex items-center rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-medium text-indigo-700">Sous-traitance</span>
                            ) : (
                              <span className="inline-flex items-center rounded-full bg-olive-50 px-2 py-0.5 text-[10px] font-medium text-olive-700">Mes parcelles</span>
                            )}
                          </td>
                          <td className="px-3 py-2 text-right text-gray-800">{Number(a.nb_oliviers).toLocaleString("fr-FR")}</td>
                          <td className="px-3 py-2 text-right text-gray-600">{fmt(parseFloat(a.prix_par_olivier) || 0)} DT</td>
                          <td className="px-3 py-2 text-right font-medium text-gray-800">{fmt(montant)} DT</td>
                          <td className="px-3 py-2 text-gray-500 max-w-40 truncate">{a.commentaire || "—"}</td>
                          <td className="px-3 py-2 whitespace-nowrap text-right">
                            <button type="button" onClick={() => { setShowActivitesDetail(false); handleOpenEditModal(a) }} className="text-indigo-600 hover:underline mr-3">Modifier</button>
                            <button type="button" onClick={() => handleDelete(a)} disabled={deletingId === a.id} className="text-red-500 hover:underline disabled:opacity-50">
                              {deletingId === a.id ? "..." : "Supprimer"}
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="bg-gray-50 font-semibold">
                      <td colSpan={3} className="px-3 py-2 text-xs text-gray-700">Total</td>
                      <td className="px-3 py-2 text-right text-xs text-gray-900">{totalOliviersTracteur.toLocaleString("fr-FR")} oliviers</td>
                      <td />
                      <td className="px-3 py-2 text-right text-xs text-gray-900">{fmt(recettesLocation)} DT</td>
                      <td colSpan={2} />
                    </tr>
                  </tfoot>
                </table>
              </div>
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
                  <p className="text-xs text-gray-500">
                    {activitePage * ACTIVITES_PAGE_SIZE + 1}–{Math.min((activitePage + 1) * ACTIVITES_PAGE_SIZE, activites.length)} sur {activites.length} activités
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setActivitePage((p) => p - 1)}
                      disabled={activitePage === 0}
                      className="px-2 py-1 text-xs rounded border border-gray-300 text-gray-600 disabled:opacity-40 hover:bg-gray-50"
                    >
                      ← Précédent
                    </button>
                    <span className="px-2 py-1 text-xs text-gray-500">
                      {activitePage + 1} / {totalPages}
                    </span>
                    <button
                      type="button"
                      onClick={() => setActivitePage((p) => p + 1)}
                      disabled={activitePage >= totalPages - 1}
                      className="px-2 py-1 text-xs rounded border border-gray-300 text-gray-600 disabled:opacity-40 hover:bg-gray-50"
                    >
                      Suivant →
                    </button>
                  </div>
                </div>
              )}
            </>
          )
        })()}
      </Modal>

      {/* Impact tracteur sur le CA */}
      <section className="bg-white border border-gray-200 rounded-lg px-4 py-4 shadow-sm mb-4">
        <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Impact du tracteur sur votre CA</p>
        {loadingActivites || loadingCharges ? (
          <p className="text-sm text-gray-500">Chargement des données...</p>
        ) : (
          <>
            <p className={`text-2xl font-semibold ${impactTracteur >= 0 ? "text-emerald-700" : "text-red-600"}`}>
              {impactTracteur >= 0 ? "+" : ""}{fmt(impactTracteur)} DT
            </p>
            <p className="text-xs text-gray-500 mt-1">
              par rapport à ne pas avoir de tracteur et en louer un
            </p>
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs text-gray-600 border-t border-gray-100 pt-3">
              <div>
                <span className="text-gray-400">Économies location externe</span>
                <p className="font-medium text-gray-800 mt-0.5">+{fmt(economiesHypothetiques)} DT</p>
                <p className="text-[10px] text-gray-400">oliviers "mes parcelles" × prix/olivier</p>
              </div>
              <div>
                <span className="text-gray-400">Recettes location</span>
                <p className="font-medium text-gray-800 mt-0.5">+{fmt(recettesLocation)} DT</p>
                <p className="text-[10px] text-gray-400">revenus sous-traitance</p>
              </div>
              <div>
                <span className="text-gray-400">Charges tracteur</span>
                <p className="font-medium text-gray-800 mt-0.5">−{fmt(totalChargesTracteurs)} DT</p>
                <p className="text-[10px] text-gray-400">salaire, carburant, entretien...</p>
              </div>
            </div>
          </>
        )}
      </section>

      {/* Amortissement — toutes campagnes uniquement */}
      {!campagneId && equipementFull?.prix_achat > 0 && impactTracteur !== null && (
        <section className="mb-4">
          <div className="bg-white border border-gray-200 rounded-lg px-4 py-4 shadow-sm">
            <h2 className="text-sm font-semibold text-gray-900 mb-1">Amortissement du tracteur</h2>
            <p className="text-xs text-gray-400 mb-4">Toutes campagnes confondues — gain net cumulé vs prix d'achat</p>
            {(() => {
              const prixAchat = equipementFull.prix_achat
              // récupéré = gains nets opérationnels (le prix d'achat étant déjà dans les charges)
              const recupere = impactTracteur + prixAchat
              const pct = Math.min(100, Math.max(0, (recupere / prixAchat) * 100))
              const restant = prixAchat - recupere
              const estAmorti = recupere >= prixAchat

              const campagneIdsAvecActivite = [...new Set(activites.map((a) => a.campagne_id))]
              const nbCampagnes = campagneIdsAvecActivite.length
              const gainMoyen = nbCampagnes > 0 ? recupere / nbCampagnes : null
              const anneeMax = campagneIdsAvecActivite.reduce((max, id) => {
                const annee = campagneMap[id]
                return annee > max ? annee : max
              }, 0)

              let forecastNode = null
              if (!estAmorti && (gainMoyen === null || gainMoyen <= 0)) {
                forecastNode = (
                  <p className="text-xs text-orange-600 bg-orange-50 border border-orange-100 rounded px-3 py-2">
                    Au rythme actuel, les charges opérationnelles dépassent les gains — vérifiez vos données.
                  </p>
                )
              } else if (!estAmorti && gainMoyen > 0) {
                const campagnesRestantes = Math.ceil(restant / gainMoyen)
                const anneeEstimee = anneeMax + campagnesRestantes
                forecastNode = (
                  <p className="text-xs text-gray-500 bg-gray-50 border border-gray-100 rounded px-3 py-2">
                    À ce rythme (<span className="font-medium text-gray-800">+{fmt(gainMoyen)} DT/campagne</span>), le tracteur sera amorti à la <span className="font-semibold text-gray-900">campagne {anneeEstimee}</span>{" "}
                    (dans {campagnesRestantes} campagne{campagnesRestantes > 1 ? "s" : ""})
                  </p>
                )
              }

              return (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                    <span>Gain net cumulé : <span className="font-medium text-gray-900">{fmt(recupere)} DT</span></span>
                    <span>Prix d'achat : <span className="font-medium text-gray-900">{fmt(prixAchat)} DT</span></span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-4 overflow-hidden">
                    <div
                      className={`h-4 rounded-full transition-all`}
                      style={{ width: `${pct}%`, backgroundColor: estAmorti ? "#10b981" : "#5a7a3a" }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className={`font-semibold text-base ${estAmorti ? "text-emerald-600" : "text-gray-800"}`}>
                      {pct.toFixed(1)}% amorti
                    </span>
                    {estAmorti ? (
                      <span className="text-emerald-600 font-medium">Tracteur rentabilisé ✓</span>
                    ) : (
                      <span className="text-gray-500">Reste <span className="font-medium text-gray-800">{fmt(restant)} DT</span> à récupérer</span>
                    )}
                  </div>
                  {forecastNode}
                </div>
              )
            })()}
          </div>
        </section>
      )}

      {/* Sections placeholder */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <div className="bg-white border border-gray-200 rounded-lg px-4 py-4 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-900 mb-3">Répartition des oliviers traités</h2>
          {oliviersParType.length === 0 ? (
            <p className="text-xs text-gray-400">Aucune activité enregistrée.</p>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie
                  data={oliviersParType}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="52%"
                  outerRadius={75}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  <Cell fill="#5a7a3a" />
                  <Cell fill="#c9a840" />
                </Pie>
                <Tooltip
                  formatter={(value) => [value.toLocaleString("fr-FR") + " oliviers", ""]}
                  separator=""
                />
                <Legend iconType="circle" iconSize={10} wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
        <div className="bg-white border border-gray-200 rounded-lg px-4 py-4 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-900 mb-1">Répartition des charges</h2>
          <p className="text-xs text-gray-400 mb-3">
            {campagneId ? `Campagne ${campagneMap[campagneId] ?? ""}` : "Toutes campagnes confondues"}
          </p>
          {chargesParSousType.length === 0 ? (
            <p className="text-xs text-gray-400">Aucune charge enregistrée.</p>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie
                  data={chargesParSousType}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="52%"
                  outerRadius={75}
                >
                  {chargesParSousType.map((_, i) => (
                    <Cell
                      key={i}
                      fill={["#5a7a3a","#c9a840","#4a90d9","#e07b39","#9b59b6","#1abc9c","#e74c3c","#95a5a6"][i % 8]}
                    />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value) => {
                    const total = chargesParSousType.reduce((s, d) => s + d.value, 0)
                    const pct = total > 0 ? ((value / total) * 100).toFixed(0) : 0
                    return [`${value.toLocaleString("fr-FR")} DT (${pct}%)`, ""]
                  }}
                  separator=""
                />
                <Legend iconType="circle" iconSize={10} wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </section>

      {/* MODALE : Ajouter / Modifier une activité tracteur */}
      <Modal
        isOpen={activiteModalOpen}
        onClose={handleCloseActiviteModal}
        title={editingActivite ? "Modifier l'activité tracteur" : "Ajouter une activité tracteur"}
        size="medium"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">{error}</div>
          )}

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Campagne</label>
            {loadingCampagnes ? (
              <p className="text-xs text-gray-500">Chargement des campagnes...</p>
            ) : campagnes.length === 0 ? (
              <p className="text-xs text-red-600">Aucune campagne disponible.</p>
            ) : (
              <select
                name="campagne_id"
                value={form.campagne_id}
                onChange={handleChange}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-olive-500 focus:ring-olive-500"
                required
              >
                <option value="">Sélectionner une campagne</option>
                {campagnes.map((c) => (
                  <option key={c.id} value={c.id}>{c.annee} {c.statut ? `- ${c.statut}` : ""}</option>
                ))}
              </select>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Date</label>
              <input type="date" name="date_activite" value={form.date_activite} onChange={handleChange}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-olive-500 focus:ring-olive-500" required />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Type d&apos;activité</label>
              <select name="type_activite" value={form.type_activite} onChange={handleChange}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-olive-500 focus:ring-olive-500">
                <option value="propre">Mes parcelles</option>
                <option value="sous_traitance">Sous-traitance</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Nombre d&apos;oliviers</label>
              <input type="number" name="nb_oliviers" min="1" value={form.nb_oliviers} onChange={handleChange}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-olive-500 focus:ring-olive-500" required />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Prix par olivier (DT)</label>
              <input type="number" step="0.01" min="0" name="prix_par_olivier" value={form.prix_par_olivier} onChange={handleChange}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-olive-500 focus:ring-olive-500" required />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Commentaire (optionnel)</label>
            <input type="text" name="commentaire" value={form.commentaire} onChange={handleChange}
              placeholder="Matin, parcelle A, météo..."
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-olive-500 focus:ring-olive-500" />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={handleCloseActiviteModal} disabled={saving}
              className="px-3 py-1.5 text-xs rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50">
              Annuler
            </button>
            <button type="submit" disabled={saving}
              className="px-3 py-1.5 text-xs rounded-md bg-olive-600 text-white hover:bg-olive-700 disabled:opacity-60">
              {saving ? "Enregistrement..." : editingActivite ? "Enregistrer les modifications" : "Enregistrer l'activité"}
            </button>
          </div>
        </form>
      </Modal>

      {/* MODALE : Ajouter charge tracteur */}
      <Modal
        isOpen={chargeModalOpen}
        onClose={() => { if (!savingCharge) setChargeModalOpen(false) }}
        title={`Ajouter charge — ${SOUS_TYPE_LABELS[chargeForm.sous_type] ?? chargeForm.sous_type}`}
        size="medium"
      >
        <form onSubmit={handleSubmitCharge} className="space-y-4">
          {chargeFormError && (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">{chargeFormError}</div>
          )}

          <div className="rounded-md bg-gray-50 border border-gray-200 px-3 py-2 text-xs text-gray-600 space-y-1">
            <p><span className="font-medium">Équipement :</span> {equipement?.nom}</p>
            <p><span className="font-medium">Type de charge :</span> Équipement</p>
            <p><span className="font-medium">Sous-type :</span> {SOUS_TYPE_LABELS[chargeForm.sous_type] ?? chargeForm.sous_type}</p>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Campagne</label>
            {loadingCampagnes ? (
              <p className="text-xs text-gray-500">Chargement des campagnes...</p>
            ) : (
              <select value={chargeForm.campagne_id}
                onChange={(e) => setChargeForm((p) => ({ ...p, campagne_id: e.target.value }))}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-olive-500 focus:ring-olive-500" required>
                <option value="">Sélectionner une campagne</option>
                {campagnes.map((c) => (
                  <option key={c.id} value={c.id}>{c.annee} {c.statut ? `- ${c.statut}` : ""}</option>
                ))}
              </select>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Date</label>
              <input type="date" value={chargeForm.date}
                onChange={(e) => setChargeForm((p) => ({ ...p, date: e.target.value }))}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-olive-500 focus:ring-olive-500" required />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Montant (DT)</label>
              <input type="number" step="0.01" min="0.01" value={chargeForm.montant_dt}
                onChange={(e) => setChargeForm((p) => ({ ...p, montant_dt: e.target.value }))}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-olive-500 focus:ring-olive-500" required />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Description (optionnel)</label>
            <input type="text" value={chargeForm.description}
              onChange={(e) => setChargeForm((p) => ({ ...p, description: e.target.value }))}
              placeholder="Ex : journée du 05/05, période mars-avril..."
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-olive-500 focus:ring-olive-500" />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setChargeModalOpen(false)} disabled={savingCharge}
              className="px-3 py-1.5 text-xs rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50">
              Annuler
            </button>
            <button type="submit" disabled={savingCharge}
              className="px-3 py-1.5 text-xs rounded-md bg-olive-600 text-white hover:bg-olive-700 disabled:opacity-60">
              {savingCharge ? "Enregistrement..." : "Enregistrer la charge"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

export default DashboardTracteur
