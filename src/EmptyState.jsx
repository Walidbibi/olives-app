function EmptyState({ icon, titre, sousTitre, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      {icon && <span className="text-4xl mb-3">{icon}</span>}
      <p className="text-sm font-semibold text-gray-700">{titre}</p>
      {sousTitre && <p className="mt-1 text-xs text-gray-400 max-w-xs">{sousTitre}</p>}
      {action && (
        <button
          type="button"
          onClick={action.onClick}
          className="mt-4 inline-flex items-center rounded-md bg-olive-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-olive-700"
        >
          {action.label}
        </button>
      )}
    </div>
  )
}

export default EmptyState
