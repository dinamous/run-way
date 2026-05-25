import { useRef, useEffect, useState, useCallback } from 'react'
import { Input } from '@/components/ui/Input'
import { UserCheck } from 'lucide-react'
import type { GoogleUser } from './types'

interface GoogleSearchInputProps {
  value: string
  onChange: (value: string, selectedUser: GoogleUser | null) => void
  onSearch: (query: string) => Promise<GoogleUser[]>
  placeholder?: string
  className?: string
  inputClassName?: string
}

export function GoogleSearchInput({
  value, onChange, onSearch,
  placeholder = 'Buscar email Google...', className, inputClassName,
}: GoogleSearchInputProps) {
  const [results, setResults] = useState<GoogleUser[]>([])
  const [loading, setLoading] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const search = useCallback(async (query: string) => {
    setLoading(true)
    const data = await onSearch(query)
    setResults(data)
    setShowDropdown(true)
    setLoading(false)
  }, [onSearch])

  const handleChange = (val: string) => {
    onChange(val, null)
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    timeoutRef.current = setTimeout(() => search(val), 300)
  }

  const handleSelect = (user: GoogleUser) => {
    onChange(user.email, user)
    setShowDropdown(false)
  }

  return (
    <div className={`relative ${className ?? ''}`} ref={dropdownRef}>
      <Input
        type="email"
        value={value}
        onChange={e => handleChange(e.target.value)}
        onFocus={() => { if (value) search(value) }}
        placeholder={placeholder}
        className={inputClassName ?? 'h-8 text-sm w-full'}
      />
      {loading && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          <div className="w-3.5 h-3.5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      )}
      {showDropdown && results.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-background border rounded-lg shadow-lg max-h-48 overflow-y-auto">
          {results.map(u => (
            <div
              key={u.id}
              className="flex items-center gap-2.5 px-3 py-2 hover:bg-muted cursor-pointer"
              onClick={() => handleSelect(u)}
            >
              <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden shrink-0">
                {u.avatarUrl
                  ? <img src={u.avatarUrl} alt="" className="w-full h-full object-cover" />
                  : <UserCheck className="w-3.5 h-3.5 text-primary" />
                }
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium truncate">{u.name}</p>
                <p className="text-xs text-muted-foreground truncate">{u.email}</p>
              </div>
            </div>
          ))}
        </div>
      )}
      {showDropdown && value && results.length === 0 && !loading && (
        <div className="absolute z-50 w-full mt-1 bg-background border rounded-lg shadow-lg px-3 py-2 text-xs text-muted-foreground">
          Nenhum utilizador Google encontrado
        </div>
      )}
    </div>
  )
}
