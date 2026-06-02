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
  { id: "recolte", label: "Récolte", icon: "🫒" },
  { id: "ventes", label: "Ventes", icon: "💰" },
  { id: "charges", label: "Charges", icon: "📉" },
  { id: "traitements", label: "Traitements", icon: "🌱" },
]

const ongletsPrincipaux = onglets.map(o => o.id)

const menuExploitation = [
  { id: "profil", label: "Profil & équipements", icon: "👤" },
  { id: "campagnes", label: "Gérer les campagnes", icon: "🌿" },
  { id: "dashboard_tracteur", label: "Dashboard Tracteur", icon: "🚜" },
  { id: "carte", label: "Carte de l'exploitation", icon: "🗺️" },
  { id: "rentabilite", label: "Tableau de rentabilité", icon: "📊" },
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
  const [exploitationOpen, setExploitationOpen] = useState(false)
  const exploitationRef = useRef(null)

  const [campagneActiveId, setCampagneActiveId] = useState("all")

  useEffect(() => {
    if (!data?.campagnes?.length || campagneActiveId !== "all") return
    const enCours = [...data.campagnes]
      .sort((a, b) => b.annee - a.annee)
      .find(c => c.statut === "en_cours")
    if (enCours) setCampagneActiveId(String(enCours.id))
  }, [data?.campagnes])

  useEffect(() => {
    if (!notifOpen) return
    function handleClick(e) {
      if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false)
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [notifOpen])

  useEffect(() => {
    if (!exploitationOpen) return
    function handleClick(e) {
      if (exploitationRef.current && !exploitationRef.current.contains(e.target)) setExploitationOpen(false)
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [exploitationOpen])

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
        <div className="max-w-6xl mx-auto px-4 py-3 flex flex-wrap items-center gap-3">
          <div className="flex-1 min-w-0">
            <h1
              className="text-xl font-bold cursor-pointer hover:text-olive-200 transition-colors"
              onClick={() => changerOnglet("resume")}
            >
              🫒 Olive App
            </h1>
          </div>

          {/* Sélecteur campagne — visible uniquement sur les onglets principaux */}
          {(data?.campagnes ?? []).length > 0 && ongletsPrincipaux.includes(ongletActif) && (
            <select
              value={campagneActiveId}
              onChange={e => setCampagneActiveId(e.target.value)}
              className="order-last w-full sm:order-none sm:w-auto rounded-md bg-olive-600 border border-olive-500 text-white px-3 py-1.5 text-sm font-medium shadow-sm focus:outline-none focus:ring-2 focus:ring-olive-300 cursor-pointer"
            >
              <option value="all" className="text-gray-800 bg-white">Toutes les campagnes</option>
              {[...(data?.campagnes ?? [])].sort((a, b) => a.annee - b.annee).map(c => (
                <option key={c.id} value={c.id} className="text-gray-800 bg-white">
                  Campagne {c.annee} — {c.statut === "en_cours" ? "En cours" : "Terminée"}
                </option>
              ))}
            </select>
          )}

          <div className="flex items-center gap-2">
            {/* Cloche notifications */}
            <div className="relative" ref={notifRef}>
              <button
                type="button"
                onClick={() => setNotifOpen(o => !o)}
                className="relative inline-flex items-center justify-center w-11 h-11 rounded-full bg-olive-600 hover:bg-olive-500 focus:outline-none focus:ring-2 focus:ring-olive-300"
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
                <div className="absolute right-0 mt-2 w-80 rounded-xl bg-white shadow-xl border border-gray-200 z-9999">
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

            {/* Menu Mon exploitation */}
            <div className="relative" ref={exploitationRef}>
              <button
                type="button"
                onClick={() => setExploitationOpen(o => !o)}
                className={`inline-flex items-center justify-center gap-1.5 rounded-full w-11 h-11 sm:w-auto sm:h-auto sm:px-4 sm:py-2.5 text-xs sm:text-sm font-medium shadow focus:outline-none focus:ring-2 focus:ring-olive-300 ${!ongletsPrincipaux.includes(ongletActif) ? "bg-white text-olive-700" : "bg-olive-600 text-white hover:bg-olive-500"}`}
              >
                <span>⚙️</span>
                <span className="hidden sm:inline">Mon exploitation</span>
              </button>

              {exploitationOpen && (
                <div className="absolute right-0 mt-2 w-64 rounded-xl bg-white shadow-xl border border-gray-200 z-9999 overflow-hidden">
                  <p className="px-4 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wide border-b border-gray-100">Mon exploitation</p>
                  {menuExploitation.map(item => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        if (item.id === "dashboard_tracteur") {
                          const premier = (data?.equipements ?? []).find(e => e.type === "Tracteur") ?? (data?.equipements ?? [])[0]
                          if (premier) setTracteurSelectionne(premier)
                          setOngletPrecedent(ongletActif)
                        }
                        setOngletActif(item.id)
                        setExploitationOpen(false)
                      }}
                      className={`w-full flex items-center gap-3 px-4 py-3 text-sm text-left hover:bg-olive-50 transition-colors ${ongletActif === item.id ? "bg-olive-50 text-olive-700 font-medium" : "text-gray-700"}`}
                    >
                      <span className="text-lg">{item.icon}</span>
                      <span>{item.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>{/* fin boutons */}
          </div>{/* fin div ligne 1 flex items-center */}
        </div>
      </header>

      {/* Navigation principale — masquée sur les pages Mon exploitation */}
      <nav className={`bg-white shadow-md sticky top-0 z-50${ongletsPrincipaux.includes(ongletActif) ? "" : " hidden"}`}>
        <div className="max-w-6xl mx-auto px-2">
          <div className="grid grid-cols-5 sm:flex sm:flex-row gap-1 py-2">
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
        {/* Onglets principaux — toujours montés pour préserver l'état (filtres, pagination) */}
        <div className={ongletActif === "resume" ? "" : "hidden"}>
          <Resume
            campagneId={campagneActiveId}
            onNavigateTracteur={(eq) => {
              setTracteurSelectionne(eq)
              setOngletPrecedent("resume")
              setOngletActif("dashboard_tracteur")
            }}
          />
        </div>

        <div className={ongletActif === "recolte" ? "" : "hidden"}>
          <FormulaireRecolte
            campagneId={campagneActiveId}
            onDemanderVente={(recolte) => {
              setRecoltePourVente(recolte)
              setOngletActif("ventes")
            }}
          />
        </div>

        <div className={ongletActif === "ventes" ? "" : "hidden"}>
          <FormulaireVente
            campagneId={campagneActiveId}
            recoltePourVente={recoltePourVente}
            clearRecoltePourVente={() => setRecoltePourVente(null)}
          />
        </div>

        <div className={ongletActif === "charges" ? "" : "hidden"}>
          <FormulaireCharges campagneId={campagneActiveId} />
        </div>

        <div className={ongletActif === "traitements" ? "" : "hidden"}>
          <FormulaireTraitements campagneId={campagneActiveId} />
        </div>

        {/* Sections secondaires — montées à la demande */}
        {ongletActif === "rentabilite" && (
          <Resume
            campagneId="all"
            autoOpenRentabilite={true}
            onFermerRentabilite={() => setOngletActif("resume")}
            onNavigateTracteur={(eq) => {
              setTracteurSelectionne(eq)
              setOngletPrecedent("rentabilite")
              setOngletActif("dashboard_tracteur")
            }}
          />
        )}
        {ongletActif === "campagnes" && <FormulaireCampagne onRetour={() => changerOnglet("resume")} />}

        {ongletActif === "carte" && (
          <CarteExploitation
            focusParcelle={parcelleCarteFocus}
            onFocusDone={() => setParcelleCarteFocus(null)}
          />
        )}

        {ongletActif === "profil" && (
          <ProfilExploitation
            onRetour={() => changerOnglet("resume")}
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
    ongletPrecedent={ongletPrecedent}
    onRetourProfil={() => setOngletActif(ongletPrecedent)}
  />
)}
      </main>

    </div>
  )
}

export default App