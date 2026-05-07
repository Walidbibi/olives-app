import { createContext, useContext, useEffect, useState } from "react"
import { supabase } from "./supabase"

const DataContext = createContext(null)

export function DataProvider({ children }) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [data, setData] = useState({
    ventes: [],
    recoltes: [],
    charges: [],
    campagnes: [],
    parcelles: [],
  })

  async function loadAllData() {
    setLoading(true)
    setError(null)
    try {
      const [
        { data: ventes = [], error: ventesError },
        { data: recoltes = [], error: recoltesError },
        { data: charges = [], error: chargesError },
        { data: campagnes = [], error: campagnesError },
        { data: parcelles = [], error: parcellesError },
      ] = await Promise.all([
        supabase
          .from("vente")
          .select("id, recolte_id, montant_total_dt, campagne_id, quantite_kg"),
        supabase
          .from("recolte_journaliere")
          .select(
            "id, quantite_kg, parcelle_id, type_olive, campagne_id, date"
          ),
        supabase
          .from("charge")
          .select("montant_dt, type_charge, campagne_id"),
        supabase.from("campagne").select("id, annee"),
        supabase.from("parcelles").select("id, nom"),
      ])

      const firstError =
        ventesError ||
        recoltesError ||
        chargesError ||
        campagnesError ||
        parcellesError

      if (firstError) {
        throw firstError
      }

      setData({
        ventes,
        recoltes,
        charges,
        campagnes,
        parcelles,
      })
    } catch (err) {
      console.error("Erreur loadAllData:", err)
      setError(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAllData()
  }, [])

  return (
    <DataContext.Provider
      value={{
        loading,
        error,
        data,
        refetch: loadAllData,
      }}
    >
      {children}
    </DataContext.Provider>
  )
}

export function useAppData() {
  const ctx = useContext(DataContext)
  if (!ctx) {
    throw new Error("useAppData must be used inside DataProvider")
  }
  return ctx
}