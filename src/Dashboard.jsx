import { useState, useEffect, useMemo } from "react"
import { supabase } from "./supabase"
import { useAppData } from "./DataProvider"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Legend } from "recharts"

function Dashboard() {
  const { data, loading } = useAppData()
  const [mainOeuvre, setMainOeuvre] = useState([])
  const [loadingMo, setLoadingMo] = useState(true)

  useEffect(() => {
    async function loadMo() {
      const { data: mo } = await supabase
        .from("main_oeuvre")
        .select("campagne_id, cout_total_dt")
      setMainOeuvre(mo || [])
      setLoadingMo(false)
    }
    loadMo()
  }, [])

  const chartData = useMemo(() => {
    const { campagnes, recoltes, ventes } = data

    const recolteMap = new Map()
    for (const r of recoltes) {
      recolteMap.set(r.campagne_id, (recolteMap.get(r.campagne_id) || 0) + (parseFloat(r.quantite_kg) || 0))
    }

    const venteKgMap = new Map()
    const venteCaMap = new Map()
    for (const v of ventes) {
      venteKgMap.set(v.campagne_id, (venteKgMap.get(v.campagne_id) || 0) + (parseFloat(v.quantite_kg) || 0))
      venteCaMap.set(v.campagne_id, (venteCaMap.get(v.campagne_id) || 0) + (parseFloat(v.montant_total_dt) || 0))
    }

    const moMap = new Map()
    for (const m of mainOeuvre) {
      moMap.set(m.campagne_id, (moMap.get(m.campagne_id) || 0) + (parseFloat(m.cout_total_dt) || 0))
    }

    return campagnes.map((camp) => {
      const totalRecolte = recolteMap.get(camp.id) || 0
      const totalVente = venteKgMap.get(camp.id) || 0
      const ca = venteCaMap.get(camp.id) || 0
      const coutMo = moMap.get(camp.id) || 0
      return {
        annee: camp.annee,
        recolte: totalRecolte,
        vendu: totalVente,
        reste: totalRecolte - totalVente,
        ca,
        cout_mo: coutMo,
        marge: ca - coutMo,
      }
    })
  }, [data, mainOeuvre])

  if (loading || loadingMo) return <p>Chargement du dashboard...</p>
  if (chartData.length === 0) return <p>Aucune donnee pour le dashboard</p>

  return (
    <div style={{ marginTop: "30px", padding: "20px", border: "1px solid #ccc", borderRadius: "8px" }}>
      <h2>Dashboard</h2>

      <h3>Recolte, Ventes et Reste a vendre (kg)</h3>
      <div style={{ width: "100%", height: 300 }}>
        <ResponsiveContainer>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="annee" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="recolte" fill="#8b5cf6" name="Recolte (kg)" />
            <Bar dataKey="vendu" fill="#3b82f6" name="Vendu (kg)" />
            <Bar dataKey="reste" fill="#f59e0b" name="Reste a vendre (kg)" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <h3>Chiffre d'affaires par campagne</h3>
      <div style={{ width: "100%", height: 300 }}>
        <ResponsiveContainer>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="annee" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="ca" fill="#8884d8" name="CA (DT)" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <h3>Marge nette par campagne</h3>
      <div style={{ width: "100%", height: 300 }}>
        <ResponsiveContainer>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="annee" />
            <YAxis />
            <Tooltip />
            <Line type="monotone" dataKey="marge" stroke="#82ca9d" name="Marge (DT)" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <h3>Resume</h3>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ background: "#eee" }}>
            <th style={{ padding: "8px", border: "1px solid #ccc" }}>Annee</th>
            <th style={{ padding: "8px", border: "1px solid #ccc" }}>Recolte (kg)</th>
            <th style={{ padding: "8px", border: "1px solid #ccc" }}>Vendu (kg)</th>
            <th style={{ padding: "8px", border: "1px solid #ccc" }}>Reste a vendre (kg)</th>
            <th style={{ padding: "8px", border: "1px solid #ccc" }}>CA (DT)</th>
            <th style={{ padding: "8px", border: "1px solid #ccc" }}>Cout MO (DT)</th>
            <th style={{ padding: "8px", border: "1px solid #ccc" }}>Marge (DT)</th>
          </tr>
        </thead>
        <tbody>
          {chartData.map((d) => (
            <tr key={d.annee}>
              <td style={{ padding: "8px", border: "1px solid #ccc", fontWeight: "bold" }}>{d.annee}</td>
              <td style={{ padding: "8px", border: "1px solid #ccc" }}>{d.recolte.toFixed(2)}</td>
              <td style={{ padding: "8px", border: "1px solid #ccc" }}>{d.vendu.toFixed(2)}</td>
              <td style={{ padding: "8px", border: "1px solid #ccc", fontWeight: "bold", color: d.reste > 0 ? "#f59e0b" : "#22c55e" }}>{d.reste.toFixed(2)}</td>
              <td style={{ padding: "8px", border: "1px solid #ccc" }}>{d.ca.toFixed(2)}</td>
              <td style={{ padding: "8px", border: "1px solid #ccc" }}>{d.cout_mo.toFixed(2)}</td>
              <td style={{ padding: "8px", border: "1px solid #ccc", color: d.marge >= 0 ? "green" : "red" }}>{d.marge.toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default Dashboard
