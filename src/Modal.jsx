import { useEffect } from "react"

function Modal({ isOpen, onClose, title, children, size = "default" }) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = ""
    }
    return () => { document.body.style.overflow = "" }
  }, [isOpen])

  if (!isOpen) return null

  const maxWidth =
    size === "xlarge" ? "sm:max-w-5xl" :
    size === "large"  ? "sm:max-w-2xl" :
                        "sm:max-w-lg"

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      {/* Bottom sheet sur mobile, modale centrée sur desktop */}
      <div className={`relative z-10 w-full ${maxWidth} bg-white shadow-xl border border-gray-200 flex flex-col rounded-t-2xl sm:rounded-2xl max-h-[92vh] sm:max-h-[90vh]`}>

        {/* Poignée — mobile uniquement */}
        <div className="flex justify-center pt-3 pb-1 sm:hidden shrink-0">
          <div className="w-10 h-1 rounded-full bg-gray-300" />
        </div>

        {/* Header */}
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
