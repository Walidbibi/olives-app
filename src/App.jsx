import { useState, useEffect, useRef } from "react"
import { useAppData } from "./DataProvider"
import { useNotifications } from "./useNotifications"
import FormulaireCampagne from "./FormulaireCampagne"
import FormulaireRecolte from "./FormulaireRecolte"
import FormulaireVente from "./FormulaireVente"
import FormulaireCharges from "./FormulaireCharges"
import FormulaireTraitements from "./FormulaireTraitements"
import Resume from "./Resume"
import ProfilExploitation from "./ProfilExploitation"
import DashboardTracteur from "./DashboardTracteur"
import CarteExploitation from "./CarteExploitation"


const onglets = [
  { id: "resume", label: "Résumé", icon: "📊" },
  // { id: "dashboard", label: "Dashboard", icon: "📈" },
  { id: "campagnes", label: "Campagnes", icon: "🌿" },
  { id: "recolte", label: "Récolte", icon: "🫒" },
  { id: "ventes", label: "Ventes", icon: "💰" },
  { id: "charges", label: "Charges", icon: "📉" },
  { id: "traitements", label: "Traitements", icon: "🌱" },
  { id: "carte", label: "Carte", icon: "🗺️" },
  // IMPORTANT : pas d'entrée "profil" ici
]

function App() {
  const { loading: globalLoading, error: globalError, refetch, data } = useAppData()

  const notifications = useNotifications({
    campagnes: data?.campagnes ?? [],
    recoltes: data?.recoltes ?? [],
    charges: data?.charges ?? [],
    equipements: data?.equipements ?? [],
  })
  const hasUrgent = notifications.some(n => n.level === "urgent")
  const [notifOpen, setNotifOpen] = useState(false)
  const notifRef = useRef(null)

  useEffect(() => {
    if (!notifOpen) return
    function handleClick(e) {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setNotifOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [notifOpen])

  const [ongletActif, setOngletActif] = useState("resume")
  const [ongletPrecedent, setOngletPrecedent] = useState("resume")
  const [recoltePourVente, setRecoltePourVente] = useState(null)
  const [tracteurSelectionne, setTracteurSelectionne] = useState(null)
  const [parcelleCarteFocus, setParcelleCarteFocus] = useState(null)
  const changerOnglet = (id) => {
    setOngletActif(id)
  }

  if (globalLoading) {
    return (
      <div className="loading-screen">
        <div className="loading-olive-circle">
          <div className="spin-slow" style={{ fontSize: "3rem" }}>
            🫒
          </div>
        </div>
        <h1 className="loading-screen-title">Bonjour Said,</h1>
        <p className="loading-screen-subtitle">
          Bienvenue sur votre application de gestion de récolte de vos oliveraies.
        </p>
        <p className="loading-screen-message">
          <span className="dot-ping" />
          Veuillez patienter pendant le chargement des données...
        </p>
      </div>
    )
  }

  if (globalError) {
    return (
      <div className="loading-screen" style={{ background: "#fef2f2" }}>
        <h1 className="loading-screen-title" style={{ color: "#b91c1c" }}>
          Erreur de chargement
        </h1>
        <p className="loading-screen-subtitle" style={{ color: "#ef4444" }}>
          Impossible de charger les données depuis la base.
        </p>
        <p className="loading-screen-message" style={{ color: "#9ca3af", fontSize: "0.75rem" }}>
          {globalError.message || "Erreur inconnue"}
        </p>
        <button
          onClick={refetch}
          style={{
            marginTop: "1.5rem",
            padding: "0.5rem 1.5rem",
            background: "#b91c1c",
            color: "white",
            borderRadius: "0.5rem",
            border: "none",
            cursor: "pointer",
            fontSize: "0.875rem",
            fontWeight: 600,
          }}
        >
          Réessayer
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-olive-700 text-white shadow-lg">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="text-center sm:text-left">
            <h1 className="text-2xl font-bold">🫒 Olive App</h1>
            <p className="text-olive-200 text-sm">
              Gestion de Récolte d&apos;Oliviers
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* Cloche notifications */}
            <div className="relative" ref={notifRef}>
              <button
                type="button"
                onClick={() => setNotifOpen(o => !o)}
                className="relative inline-flex items-center justify-center w-9 h-9 rounded-full bg-olive-600 hover:bg-olive-500 focus:outline-none focus:ring-2 focus:ring-olive-300"
                aria-label="Notifications"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                {notifications.length > 0 && (
                  <span className={`absolute -top-1 -right-1 inline-flex items-center justify-center min-w-4.5 h-4.5 px-1 rounded-full text-xs font-bold text-white ${hasUrgent ? "bg-red-500" : "bg-blue-500"}`}>
                    {notifications.length}
                  </span>
                )}
              </button>

              {/* Panneau notifications */}
              {notifOpen && (
                <div className="absolute right-0 mt-2 w-80 rounded-xl bg-white shadow-xl border border-gray-200 z-200">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                    <p className="text-sm font-semibold text-gray-800">Notifications</p>
                    <button type="button" onClick={() => setNotifOpen(false)} className="text-gray-400 hover:text-gray-600 text-lg leading-none">✕</button>
                  </div>
                  {notifications.length === 0 ? (
                    <p className="px-4 py-6 text-sm text-gray-500 text-center">Aucune notification</p>
                  ) : (
                    <ul className="divide-y divide-gray-50 max-h-96 overflow-y-auto">
                      {notifications.map(n => (
                        <li key={n.id} className="flex items-start gap-3 px-4 py-3">
                          <span className={`mt-0.5 shrink-0 w-2.5 h-2.5 rounded-full ${n.level === "urgent" ? "bg-red-500" : "bg-blue-500"}`} />
                          <p className="text-sm text-gray-700 leading-snug">{n.message}</p>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>

            {/* Bouton Mon profil */}
            <button
              type="button"
              onClick={() => setOngletActif("profil")}
              className="inline-flex items-center gap-2 rounded-full bg-olive-600 px-3 py-1.5 text-xs sm:text-sm font-medium text-white shadow hover:bg-olive-500 focus:outline-none focus:ring-2 focus:ring-olive-300"
            >
              <span>👤</span>
              <span>Mon profil</span>
            </button>
          </div>
        </div>
      </header>

      {/* Navigation (sans profil) */}
      <nav className="bg-white shadow-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-2">
          <div className="grid grid-cols-3 sm:flex sm:flex-row gap-1 py-2">
            {onglets.map((o) => (
              <button
                key={o.id}
                onClick={() => changerOnglet(o.id)}
                className={
                  "flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-1 px-2 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors " +
                  (ongletActif === o.id
                    ? "bg-olive-600 text-white"
                    : "text-gray-600 hover:bg-olive-100")
                }
              >
                <span>{o.icon}</span>
                <span>{o.label}</span>
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* Contenu principal */}
      <main className="max-w-6xl mx-auto px-4 py-6">
        {ongletActif === "resume" && (
          <Resume
            onNavigateTracteur={(eq) => {
              setTracteurSelectionne(eq)
              setOngletPrecedent("resume")
              setOngletActif("dashboard_tracteur")
            }}
          />
        )}
        {ongletActif === "campagnes" && <FormulaireCampagne />}

        {ongletActif === "recolte" && (
          <FormulaireRecolte
            onDemanderVente={(recolte) => {
              setRecoltePourVente(recolte)
              setOngletActif("ventes")
            }}
          />
        )}

        {ongletActif === "ventes" && (
          <FormulaireVente
            recoltePourVente={recoltePourVente}
            clearRecoltePourVente={() => setRecoltePourVente(null)}
          />
        )}

        {ongletActif === "charges" && <FormulaireCharges />}

        {ongletActif === "traitements" && <FormulaireTraitements />}

        {ongletActif === "carte" && (
          <CarteExploitation
            focusParcelle={parcelleCarteFocus}
            onFocusDone={() => setParcelleCarteFocus(null)}
          />
        )}

        {ongletActif === "profil" && (
          <ProfilExploitation
            onVoirDashboardTracteur={(equipement) => {
              setTracteurSelectionne(equipement)
              setOngletPrecedent("profil")
              setOngletActif("dashboard_tracteur")
            }}
            onVoirSurCarte={(parcelle) => {
              setParcelleCarteFocus(parcelle)
              setOngletActif("carte")
            }}
          />
        )}
{ongletActif === "dashboard_tracteur" && (
  <DashboardTracteur
    equipement={tracteurSelectionne}
    onRetourProfil={() => setOngletActif(ongletPrecedent)}
  />
)}
      </main>

      {/* Footer */}
      <footer className="bg-gray-800 text-gray-300 text-center py-4 mt-8">
        <p className="text-sm">Olive App - &copy; 2026</p>
      </footer>
      {/* Assistant Panel */}
      
    </div>
  )
}

export default App