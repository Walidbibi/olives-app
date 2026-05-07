function Spinner({ message }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px" }}>
      <div style={{
        border: "4px solid #f3f3f3",
        borderTop: "4px solid #3b82f6",
        borderRadius: "50%",
        width: "40px",
        height: "40px",
        animation: "spin 1s linear infinite"
      }}></div>
      <p style={{ marginTop: "16px", color: "#6b7280" }}>{message || "Chargement..."}</p>
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}

export default Spinner
