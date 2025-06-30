
import { useState, useEffect } from "react"
import { useQuery } from "@tanstack/react-query"
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { supabase } from "@/integrations/supabase/client"
import { Search, Users, CreditCard } from "lucide-react"
import { useNavigate } from "react-router-dom"

interface GlobalSearchProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function GlobalSearch({ open, onOpenChange }: GlobalSearchProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const navigate = useNavigate()

  const { data: searchResults, isLoading } = useQuery({
    queryKey: ['global-search', searchTerm],
    queryFn: async () => {
      if (!searchTerm || searchTerm.length < 2) return { clients: [], payments: [] }

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

      return {
        clients: clientsResult.data || [],
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

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput
        placeholder="Buscar clientes, pagos..."
        value={searchTerm}
        onValueChange={setSearchTerm}
      />
      <CommandList>
        <CommandEmpty>
          {isLoading ? "Buscando..." : "No se encontraron resultados."}
        </CommandEmpty>
        
        {searchResults?.clients && searchResults.clients.length > 0 && (
          <CommandGroup heading="Clientes">
            {searchResults.clients.map((client: any) => (
              <CommandItem
                key={client.id}
                onSelect={() => handleSelectClient(client.id)}
                className="flex items-center gap-2 cursor-pointer"
              >
                <Users className="h-4 w-4" />
                <div className="flex flex-col">
                  <span className="font-medium">{client.full_name}</span>
                  <span className="text-sm text-muted-foreground">{client.email}</span>
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {searchResults?.payments && searchResults.payments.length > 0 && (
          <CommandGroup heading="Pagos">
            {searchResults.payments.map((payment: any) => (
              <CommandItem
                key={payment.id}
                onSelect={() => handleSelectPayment(payment.subscriptions.clients.id)}
                className="flex items-center gap-2 cursor-pointer"
              >
                <CreditCard className="h-4 w-4" />
                <div className="flex flex-col">
                  <span className="font-medium">{payment.subscriptions.clients.full_name}</span>
                  <span className="text-sm text-muted-foreground">
                    ${payment.amount_usd} - {payment.status}
                  </span>
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
      </CommandList>
    </CommandDialog>
  )
}
