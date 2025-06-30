
import { useState, useEffect, useRef } from "react"
import { useQuery } from "@tanstack/react-query"
import { supabase } from "@/integrations/supabase/client"
import { Search, Users, CreditCard } from "lucide-react"
import { useNavigate } from "react-router-dom"
import { Input } from "@/components/ui/input"

interface GlobalSearchProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function GlobalSearch({ open, onOpenChange }: GlobalSearchProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const navigate = useNavigate()
  const searchRef = useRef<HTMLDivElement>(null)

  const { data: searchResults, isLoading } = useQuery({
    queryKey: ['global-search', searchTerm],
    queryFn: async () => {
      if (!searchTerm || searchTerm.length < 2) return { clients: [], payments: [] }

      console.log('Buscando con término:', searchTerm)

      // Normalize search term for better matching
      const normalizedSearch = searchTerm
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Remove accents
        .trim()

      const [clientsResult, paymentsResult] = await Promise.all([
        supabase
          .from('clients')
          .select('id, full_name, email, phone_number')
          .or(`full_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%,phone_number.ilike.%${searchTerm}%`)
          .limit(5),
        supabase
          .from('installments')
          .select(`
            id,
            amount_usd,
            due_date,
            status,
            subscriptions!inner(
              clients!inner(id, full_name, email)
            )
          `)
          .or(`subscriptions.clients.full_name.ilike.%${searchTerm}%,subscriptions.clients.email.ilike.%${searchTerm}%`)
          .limit(5)
      ])

      console.log('Resultados clientes:', clientsResult.data)
      console.log('Resultados pagos:', paymentsResult.data)

      // Additional client-side filtering for better accent/case matching
      const filteredClients = (clientsResult.data || []).filter(client => {
        const clientName = (client.full_name || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        const clientEmail = (client.email || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        const clientPhone = (client.phone_number || '').toLowerCase()
        
        return clientName.includes(normalizedSearch) || 
               clientEmail.includes(normalizedSearch) || 
               clientPhone.includes(normalizedSearch)
      })

      return {
        clients: filteredClients,
        payments: paymentsResult.data || []
      }
    },
    enabled: searchTerm.length >= 2
  })

  const handleSelectClient = (clientId: string) => {
    navigate(`/clients/${clientId}`)
    onOpenChange(false)
    setSearchTerm("")
  }

  const handleSelectPayment = (clientId: string) => {
    navigate(`/clients/${clientId}`)
    onOpenChange(false)
    setSearchTerm("")
  }

  useEffect(() => {
    if (!open) {
      setSearchTerm("")
    }
  }, [open])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        onOpenChange(false)
      }
    }

    if (open) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [open, onOpenChange])

  if (!open) return null

  const hasResults = searchResults && (searchResults.clients.length > 0 || searchResults.payments.length > 0)

  return (
    <div 
      ref={searchRef}
      className="absolute top-full left-0 right-0 z-50 bg-background border border-border rounded-lg shadow-lg mt-2 max-h-96 overflow-hidden"
    >
      <div className="p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar clientes, pagos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
            autoFocus
          />
        </div>
      </div>

      <div className="max-h-80 overflow-y-auto">
        {isLoading && (
          <div className="p-4 text-center text-muted-foreground">
            Buscando...
          </div>
        )}

        {!isLoading && searchTerm.length >= 2 && !hasResults && (
          <div className="p-4 text-center text-muted-foreground">
            No se encontraron resultados.
          </div>
        )}

        {searchResults?.clients && searchResults.clients.length > 0 && (
          <div className="p-2">
            <div className="px-2 py-1 text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Clientes
            </div>
            {searchResults.clients.map((client: any) => (
              <div
                key={client.id}
                onClick={() => handleSelectClient(client.id)}
                className="flex items-center gap-3 p-3 hover:bg-accent hover:text-accent-foreground cursor-pointer rounded-lg transition-colors"
              >
                <Users className="h-4 w-4 text-muted-foreground" />
                <div className="flex flex-col">
                  <span className="font-medium">{client.full_name}</span>
                  <span className="text-sm text-muted-foreground">{client.email}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {searchResults?.payments && searchResults.payments.length > 0 && (
          <div className="p-2">
            <div className="px-2 py-1 text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Pagos
            </div>
            {searchResults.payments.map((payment: any) => (
              <div
                key={payment.id}
                onClick={() => handleSelectPayment(payment.subscriptions.clients.id)}
                className="flex items-center gap-3 p-3 hover:bg-accent hover:text-accent-foreground cursor-pointer rounded-lg transition-colors"
              >
                <CreditCard className="h-4 w-4 text-muted-foreground" />
                <div className="flex flex-col">
                  <span className="font-medium">{payment.subscriptions.clients.full_name}</span>
                  <span className="text-sm text-muted-foreground">
                    ${payment.amount_usd} - {payment.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
