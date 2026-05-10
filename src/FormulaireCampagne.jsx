import { useEffect, useState } from "react"
import { supabase } from "./supabase"
import Modal from "./Modal"
import Spinner from "./Spinner"

function FormulaireCampagne() {
  const [campagnes, setCampagnes] = useState([])
  const [loadingCampagnes, setLoadingCampagnes] = useState(true)

  const [modalOuvert, setModalOuvert] = useState(false)
  const [editingId, setEditingId] = useState(null)

  const [annee, setAnnee] = useState("")
  const [dateDebut, setDateDebut] = useState("")
  const [dateFin, setDateFin] = useState("")
  const [statut, setStatut] = useState("en_cours")
  const [notes, setNotes] = useState("")

  const [message, setMessage] = useState("")
  const [messageType, setMessageType] = useState("info")
  const [formError, setFormError] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [campagneASupprimer, setCampagneASupprimer] = useState(null)
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    if (!message) return
    const timer = setTimeout(() => setMessage(""), 5000)
    return () => clearTimeout(timer)
  }, [message])

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
      setCampagnes([])
    } else {
      setCampagnes(data || [])
    }
    setLoadingCampagnes(false)
  }

  useEffect(() => {
    loadCampagnes()
  }, [])

  function resetForm() {
    setAnnee("")
    setDateDebut("")
    setDateFin("")
    setStatut("en_cours")
    setNotes("")
    setEditingId(null)
    setFormError("")
    setIsSubmitting(false)
  }

  function ouvrirModalCreation() {
    resetForm()
    setModalOuvert(true)
  }

  function ouvrirModalEdition(c) {
    setEditingId(c.id)
    setAnnee(c.annee ? String(c.annee) : "")
    setDateDebut(c.date_debut || "")
    setDateFin(c.date_fin || "")
    setStatut(c.statut || "en_cours") // valeur en base : "en_cours" ou "terminee"
    setNotes(c.notes || "")
    setFormError("")
    setIsSubmitting(false)
    setModalOuvert(true)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (isSubmitting) return
    setIsSubmitting(true)
    setFormError("")
    setMessage("")

    try {
      if (!annee || !dateDebut) {
        setFormError("Année et date de début sont obligatoires.")
        return
      }

      const payload = {
        annee: parseInt(annee, 10),
        date_debut: dateDebut,
        statut, // "en_cours" ou "terminee"
        notes: notes || null,
      }

      if (dateFin) {
        payload.date_fin = dateFin
      } else {
        payload.date_fin = null
      }

      let errorRequete
      if (editingId) {
        const { error } = await supabase
          .from("campagne")
          .update(payload)
          .eq("id", editingId)
        errorRequete = error
      } else {
        const { error } = await supabase.from("campagne").insert([payload])
        errorRequete = error
      }

      if (errorRequete) {
        console.error("Erreur enregistrement campagne:", errorRequete)
        setFormError("Erreur lors de l'enregistrement de la campagne.")
        return
      }

      await loadCampagnes()

      setMessageType("success")
      setMessage(
        editingId
          ? "Campagne mise à jour avec succès"
          : "Campagne créée avec succès"
      )
      setModalOuvert(false)
      setEditingId(null)
    } finally {
      setIsSubmitting(false)
    }
  }

  function demanderSuppression(campagne) {
    setCampagneASupprimer(campagne)
    setDeleteModalOpen(true)
  }

  async function confirmerSuppressionCampagne() {
    if (!campagneASupprimer) return
    setIsDeleting(true)
    setMessage("")
    setMessageType("info")

    const campagneId = campagneASupprimer.id

    try {
      const { error: ventesError } = await supabase
        .from("vente")
        .delete()
        .eq("campagne_id", campagneId)

      if (ventesError) {
        console.error("Erreur suppression ventes de la campagne:", ventesError)
        setMessageType("error")
        setMessage("Erreur lors de la suppression des ventes liées à la campagne.")
        setIsDeleting(false)
        return
      }

      const { error: recoltesError } = await supabase
        .from("recolte_journaliere")
        .delete()
        .eq("campagne_id", campagneId)

      if (recoltesError) {
        console.error(
          "Erreur suppression récoltes de la campagne:",
          recoltesError
        )
        setMessageType("error")
        setMessage("Erreur lors de la suppression des récoltes liées à la campagne.")
        setIsDeleting(false)
        return
      }

      const { error: campagneError } = await supabase
        .from("campagne")
        .delete()
        .eq("id", campagneId)

      if (campagneError) {
        console.error("Erreur suppression campagne:", campagneError)
        setMessageType("error")
        setMessage("Erreur lors de la suppression de la campagne.")
        setIsDeleting(false)
        return
      }

      await loadCampagnes()

      setMessageType("success")
      setMessage(
        `Campagne ${campagneASupprimer.annee} et toutes les récoltes et ventes associées ont été supprimées.`
      )
      setDeleteModalOpen(false)
      setCampagneASupprimer(null)
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">
            Campagnes
          </h2>
          <p className="text-sm text-gray-500">
            Gère les campagnes (années, dates, statut et notes).
          </p>
        </div>

        <button
          type="button"
          onClick={ouvrirModalCreation}
          className="inline-flex items-center justify-center rounded-md bg-olive-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-olive-700 focus:outline-none focus:ring-2 focus:ring-olive-500 focus:ring-offset-2"
        >
          + Nouvelle campagne
        </button>
      </div>

      {/* Messages globaux */}
      {message && (
        <div
          className={
            messageType === "success"
              ? "rounded-md border border-green-300 bg-green-50 px-3 py-2 text-sm text-green-800"
              : messageType === "error"
              ? "rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800"
              : "rounded-md border border-yellow-300 bg-yellow-50 px-3 py-2 text-sm text-yellow-800"
          }
        >
          {message}
        </div>
      )}

      {/* Résumé simple */}
      <div className="rounded-md bg-white px-4 py-3 shadow-sm border border-gray-200 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-gray-700">
          Nombre total de campagnes :{" "}
          <span className="font-semibold">{campagnes.length}</span>
        </p>
        <p className="text-sm text-gray-700">
          Campagnes en cours :{" "}
          <span className="font-semibold">
            {campagnes.filter((c) => c.statut === "en_cours").length}
          </span>
        </p>
      </div>

      {/* Tableau des campagnes */}
      <div className="mt-4">
        {loadingCampagnes ? (
          <Spinner message="Chargement des campagnes..." />
        ) : campagnes.length === 0 ? (
          <p className="text-sm text-gray-500">
            Aucune campagne enregistrée pour le moment.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left font-medium text-gray-600">
                    Année
                  </th>
                  <th className="px-3 py-2 text-left font-medium text-gray-600">
                    Date début
                  </th>
                  <th className="px-3 py-2 text-left font-medium text-gray-600">
                    Date fin
                  </th>
                  <th className="px-3 py-2 text-left font-medium text-gray-600">
                    Statut
                  </th>
                  <th className="px-3 py-2 text-left font-medium text-gray-600">
                    Notes
                  </th>
                  <th className="px-3 py-2 text-right font-medium text-gray-600">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {campagnes.map((c) => (
                  <tr key={c.id}>
                    <td className="px-3 py-2 text-gray-800">{c.annee}</td>
                    <td className="px-3 py-2 text-gray-800">
                      {c.date_debut || "-"}
                    </td>
                    <td className="px-3 py-2 text-gray-800">
                      {c.date_fin || "-"}
                    </td>
                    <td className="px-3 py-2 text-gray-800">
                      {c.statut === "en_cours" ? (
                        <span className="inline-flex items-center rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-800 border border-green-200">
                          En cours
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-gray-50 px-2 py-0.5 text-xs font-medium text-gray-700 border border-gray-200">
                          Terminée
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-gray-800 max-w-xs truncate">
                      {c.notes || "-"}
                    </td>
                    <td className="px-3 py-2 text-right space-x-2">
                      <button
                        type="button"
                        onClick={() => ouvrirModalEdition(c)}
                        className="text-xs font-medium text-olive-700 hover:text-olive-900"
                      >
                        Modifier
                      </button>
                      <button
                        type="button"
                        onClick={() => demanderSuppression(c)}
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
        )}
      </div>

      {/* Modal création / édition */}
      <Modal
        isOpen={modalOuvert}
        onClose={() => {
          setModalOuvert(false)
          setEditingId(null)
          setFormError("")
        }}
        title={editingId ? "Modifier une campagne" : "Nouvelle campagne"}
        size="large"
      >
        {formError && (
          <div className="mb-3 rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800">
            {formError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Année
              </label>
              <input
                type="number"
                value={annee}
                onChange={(e) => setAnnee(e.target.value)}
                required
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-olive-500 focus:ring-olive-500"
                placeholder="2026"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Date de début
              </label>
              <input
                type="date"
                value={dateDebut || ""}
                onChange={(e) => setDateDebut(e.target.value)}
                required
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-olive-500 focus:ring-olive-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Date de fin <span className="text-gray-400 text-xs">(optionnel)</span>
              </label>
              <input
                type="date"
                value={dateFin || ""}
                onChange={(e) => setDateFin(e.target.value)}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-olive-500 focus:ring-olive-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Statut
              </label>
              <select
                value={statut}
                onChange={(e) => setStatut(e.target.value)}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-olive-500 focus:ring-olive-500"
              >
                <option value="en_cours">En cours</option>
                <option value="terminee">Terminée</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-olive-500 focus:ring-olive-500 resize-none"
              placeholder="Notes sur cette campagne..."
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => {
                setModalOuvert(false)
                setEditingId(null)
                setFormError("")
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

      {/* Modal de confirmation de suppression */}
      <Modal
        isOpen={deleteModalOpen}
        onClose={() => {
          if (isDeleting) return
          setDeleteModalOpen(false)
          setCampagneASupprimer(null)
        }}
        title="Supprimer la campagne"
        size="medium"
      >
        {campagneASupprimer && (
          <div className="space-y-4">
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
              <p className="font-semibold mb-1">
                Vous êtes sur le point de supprimer la campagne {campagneASupprimer.annee}.
              </p>
              <p>
                Cette action supprimera également{" "}
                <span className="font-semibold">toutes les récoltes et toutes les ventes</span>{" "}
                associées à cette campagne. Cette opération est définitive.
              </p>
            </div>
            <p className="text-sm text-gray-700">
              Confirmez-vous la suppression de cette campagne et de toutes les données liées ?
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  if (isDeleting) return
                  setDeleteModalOpen(false)
                  setCampagneASupprimer(null)
                }}
                className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 disabled:opacity-50"
                disabled={isDeleting}
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={confirmerSuppressionCampagne}
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

export default FormulaireCampagne