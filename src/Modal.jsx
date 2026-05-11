function Modal({ isOpen, onClose, title, children, size = "default" }) {
  if (!isOpen) return null

  const maxWidth = size === "xlarge" ? "max-w-5xl" : size === "large" ? "max-w-2xl" : "max-w-lg"

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
      />

      {/* Modal content */}
      <div className={`relative z-10 w-full ${maxWidth} bg-white rounded-2xl shadow-xl border border-gray-200 flex flex-col max-h-[90vh]`}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50 rounded-t-2xl shrink-0">
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl"
          >
            ✕
          </button>
        </div>

        <div className="px-6 py-5 overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  )
}

export default Modal
