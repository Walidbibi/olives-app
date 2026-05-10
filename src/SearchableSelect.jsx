import { useState, useRef, useEffect } from "react"

function SearchableSelect({ value, onChange, options, placeholder = "Sélectionner...", disabled = false, className = "" }) {
  const [search, setSearch] = useState("")
  const [open, setOpen] = useState(false)
  const containerRef = useRef(null)

  const selected = options.find(o => String(o.value) === String(value))
  const displayValue = open ? search : (selected ? selected.label : "")
  const filtered = search
    ? options.filter(o => o.label.toLowerCase().includes(search.toLowerCase()))
    : options

  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false)
        setSearch("")
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  function handleFocus() {
    setOpen(true)
    setSearch("")
  }

  function handleInputChange(e) {
    setSearch(e.target.value)
    if (!open) setOpen(true)
  }

  function handleSelect(optValue) {
    onChange(String(optValue))
    setOpen(false)
    setSearch("")
  }

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <input
        type="text"
        value={displayValue}
        onChange={handleInputChange}
        onFocus={handleFocus}
        placeholder={placeholder}
        disabled={disabled}
        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-olive-500 focus:outline-none focus:ring-1 focus:ring-olive-500 disabled:bg-gray-50 disabled:text-gray-500"
      />
      {open && (
        <ul
          className="absolute z-50 mt-1 max-h-60 w-full overflow-y-auto overscroll-contain rounded-md border border-gray-200 bg-white shadow-lg"
          onWheel={e => e.stopPropagation()}
        >
          {filtered.length === 0 ? (
            <li className="px-3 py-2.5 text-sm text-gray-400">Aucun résultat</li>
          ) : filtered.map(o => (
            <li
              key={String(o.value)}
              onMouseDown={() => handleSelect(o.value)}
              className={`cursor-pointer px-3 py-2.5 text-sm leading-snug hover:bg-olive-50 ${String(o.value) === String(value) ? "bg-olive-100 font-medium" : ""}`}
            >
              {o.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default SearchableSelect
