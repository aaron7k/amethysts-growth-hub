import { useQuery } from "@tanstack/react-query"
import { supabase } from "@/integrations/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import { DollarSign } from "lucide-react"

export const MonthlyRevenueChart = () => {
  const { data: revenueData, isLoading } = useQuery({
    queryKey: ['monthly-revenue'],
    queryFn: async () => {
      // Obtener todos los pagos realizados agrupados por mes
      const { data, error } = await supabase
        .from('installments')
        .select(`
          payment_date,
          amount_usd,
          subscriptions!inner(
            clients(full_name)
          )
        `)
        .eq('status', 'paid')
        .not('payment_date', 'is', null)
        .order('payment_date', { ascending: true })

      if (error) throw error

      // Agrupar por mes
      const monthlyRevenue = data.reduce((acc: any[], payment) => {
        const date = new Date(payment.payment_date!)
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
        const monthName = date.toLocaleDateString('es-ES', { year: 'numeric', month: 'long' })
        
        const existingMonth = acc.find(item => item.month === monthKey)
        if (existingMonth) {
          existingMonth.revenue += Number(payment.amount_usd)
          existingMonth.payments += 1
        } else {
          acc.push({
            month: monthKey,
            monthName,
            revenue: Number(payment.amount_usd),
            payments: 1
          })
        }
        
        return acc
      }, [])

      return monthlyRevenue.sort((a, b) => a.month.localeCompare(b.month))
    }
  })

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Facturación Mensual
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center">
            <div className="text-muted-foreground">Cargando datos...</div>
          </div>
        </CardContent>
      </Card>
    )
  }

  const totalRevenue = revenueData?.reduce((sum, item) => sum + item.revenue, 0) || 0
  const totalPayments = revenueData?.reduce((sum, item) => sum + item.payments, 0) || 0

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="h-5 w-5" />
          Facturación Mensual
        </CardTitle>
        <div className="text-sm text-muted-foreground">
          Total: ${totalRevenue.toLocaleString()} USD | {totalPayments} pagos
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={revenueData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="monthName" 
                tick={{ fontSize: 12 }}
                angle={-45}
                textAnchor="end"
                height={60}
              />
              <YAxis 
                tick={{ fontSize: 12 }}
                tickFormatter={(value) => `$${value.toLocaleString()}`}
              />
              <Tooltip 
                formatter={(value: any) => [`$${value.toLocaleString()}`, 'Facturación']}
                labelFormatter={(label) => `Mes: ${label}`}
              />
              <Bar 
                dataKey="revenue" 
                fill="hsl(var(--primary))"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}