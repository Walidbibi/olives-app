const STYLES = {
  success: "border-green-300 bg-green-50 text-green-800",
  error:   "border-red-300 bg-red-50 text-red-800",
  info:    "border-yellow-300 bg-yellow-50 text-yellow-800",
}

function Notification({ message, type = "info", onDismiss }) {
  if (!message) return null
  return (
    <div className={`flex items-start justify-between gap-2 rounded-md border px-3 py-2 text-sm ${STYLES[type] ?? STYLES.info}`}>
      <span>{message}</span>
      {onDismiss && (
        <button type="button" onClick={onDismiss} className="shrink-0 opacity-50 hover:opacity-100">
          ✕
        </button>
      )}
    </div>
  )
}

export default Notification
