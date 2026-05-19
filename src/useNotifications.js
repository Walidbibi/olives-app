import { useMemo } from "react"

export function useNotifications({ campagnes, recoltes, charges, equipements }) {
  return useMemo(() => {
    const alerts = []

    // Plusieurs campagnes en cours
    const campagnesEnCours = campagnes.filter(c => c.statut === "en_cours")
    if (campagnesEnCours.length > 1) {
      alerts.push({
        id: "multi_campagnes",
        level: "urgent",
        message: `${campagnesEnCours.length} campagnes actives simultanément. Pensez à clôturer les anciennes.`,
      })
    }

    // Aucune campagne active
    if (campagnes.length > 0 && campagnesEnCours.length === 0) {
      alerts.push({
        id: "no_campagne",
        level: "urgent",
        message: "Aucune campagne en cours. Créez-en une pour commencer la saisie.",
      })
    }

    // Récoltes vente_brut non vendues
    const recoltesNonVendues = recoltes.filter(
      r => r.destination === "vente_brut" && !r.est_vendu
    )
    if (recoltesNonVendues.length > 0) {
      alerts.push({
        id: "recoltes_non_vendues",
        level: "urgent",
        message: `${recoltesNonVendues.length} récolte${recoltesNonVendues.length > 1 ? "s" : ""} en vente brute non encore vendue${recoltesNonVendues.length > 1 ? "s" : ""}.`,
      })
    }

    // Salaire chauffeur manquant pour M-1 (gestion multi-tracteur)
    const tracteurIds = [...new Set(
      charges
        .filter(c => c.sous_type === "salaire_chauffeur" && c.equipement_id)
        .map(c => c.equipement_id)
    )]
    if (tracteurIds.length > 0) {
      const now = new Date()
      const anneeM1 = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear()
      const moisM1 = now.getMonth() === 0 ? 12 : now.getMonth()
      const dernierJour = new Date(anneeM1, moisM1, 0).getDate()
      const debutM1Str = `${anneeM1}-${String(moisM1).padStart(2, "0")}-01`
      const finM1Str = `${anneeM1}-${String(moisM1).padStart(2, "0")}-${String(dernierJour).padStart(2, "0")}`
      const moisLabel = new Date(anneeM1, moisM1 - 1, 1).toLocaleString("fr-FR", { month: "long", year: "numeric" })
      const tracteursSaisis = new Set(
        charges
          .filter(c => c.sous_type === "salaire_chauffeur" && c.date >= debutM1Str && c.date <= finM1Str && c.equipement_id)
          .map(c => c.equipement_id)
      )
      const manquants = tracteurIds.filter(id => !tracteursSaisis.has(id))
      if (manquants.length > 0) {
        const nomsManquants = manquants.map(id => {
          const eq = equipements.find(e => String(e.id) === String(id))
          return eq ? eq.nom : `Tracteur ${id}`
        })
        alerts.push({
          id: "salaire_chauffeur_manquant",
          level: "urgent",
          message: `Salaire chauffeur du mois de ${moisLabel} non renseigné pour : ${nomsManquants.join(", ")}.`,
        })
      }
    }

    // Dons sans bénéficiaire
    const donsSansBeneficiaire = charges.filter(
      c => c.type_charge === "don" && !c.beneficiaire?.trim()
    )
    if (donsSansBeneficiaire.length > 0) {
      alerts.push({
        id: "dons_sans_beneficiaire",
        level: "info",
        message: `${donsSansBeneficiaire.length} charge${donsSansBeneficiaire.length > 1 ? "s" : ""} Don sans bénéficiaire renseigné.`,
      })
    }


    return alerts
  }, [campagnes, recoltes, charges, equipements])
}
