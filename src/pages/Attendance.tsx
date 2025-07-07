import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { supabase } from "@/integrations/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Calendar, Users, UserCheck, UserX, Plus, CheckCircle, Edit, Trash2, CalendarDays } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { format, startOfWeek, endOfWeek, startOfDay, endOfDay, parseISO } from "date-fns"
import { es } from "date-fns/locale"

interface Event {
  id: string
  name: string
  event_date: string
  invited_emails: string[]
  attended_emails: string[]
  description: string | null
  created_at: string
  updated_at: string
}

export default function Attendance() {
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null)
  const [showAllWeeks, setShowAllWeeks] = useState(false)
  const [newEvent, setNewEvent] = useState({
    name: '',
    event_date: '',
    invited_emails: '',
    description: ''
  })
  const [attendanceEmail, setAttendanceEmail] = useState('')
  const { toast } = useToast()
  const queryClient = useQueryClient()

  // Get current week boundaries (Monday to Sunday)
  const getCurrentWeekBounds = () => {
    const now = new Date()
    const monday = startOfWeek(now, { weekStartsOn: 1 }) // 1 = Monday
    const sunday = endOfWeek(now, { weekStartsOn: 1 })
    return {
      start: startOfDay(monday),
      end: endOfDay(sunday)
    }
  }

  const { start: weekStart, end: weekEnd } = getCurrentWeekBounds()

  // Fetch events
  const { data: allEvents, isLoading } = useQuery({
    queryKey: ['events'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .order('event_date', { ascending: false })
      
      if (error) throw error
      return data as Event[]
    }
  })

  // Filter events based on current view
  const events = showAllWeeks 
    ? allEvents 
    : allEvents?.filter(event => {
        const eventDate = parseISO(event.event_date)
        return eventDate >= weekStart && eventDate <= weekEnd
      })

  // Group events by week when showing all
  const groupEventsByWeek = (events: Event[]) => {
    const grouped: { [key: string]: Event[] } = {}
    events?.forEach(event => {
      const eventDate = parseISO(event.event_date)
      const monday = startOfWeek(eventDate, { weekStartsOn: 1 })
      const weekKey = format(monday, 'yyyy-MM-dd')
      if (!grouped[weekKey]) {
        grouped[weekKey] = []
      }
      grouped[weekKey].push(event)
    })
    
    // Sort events within each week by date (closest/most recent first)
    Object.keys(grouped).forEach(weekKey => {
      grouped[weekKey].sort((a, b) => 
        new Date(b.event_date).getTime() - new Date(a.event_date).getTime()
      )
    })
    
    return grouped
  }


  // Update event mutation
  const updateEventMutation = useMutation({
    mutationFn: async ({ id, eventData }: { id: string, eventData: typeof newEvent }) => {
      const invitedEmailsArray = eventData.invited_emails
        .split(',')
        .map(email => email.trim())
        .filter(email => email.length > 0)

      const { error } = await supabase
        .from('events')
        .update({
          name: eventData.name,
          event_date: eventData.event_date,
          invited_emails: invitedEmailsArray,
          description: eventData.description || null
        })
        .eq('id', id)
      
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] })
      setIsEditDialogOpen(false)
      setSelectedEvent(null)
      toast({
        title: "Evento actualizado",
        description: "El evento ha sido actualizado exitosamente."
      })
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "No se pudo actualizar el evento.",
        variant: "destructive"
      })
    }
  })

  // Delete event mutation
  const deleteEventMutation = useMutation({
    mutationFn: async (eventId: string) => {
      const { error } = await supabase
        .from('events')
        .delete()
        .eq('id', eventId)
      
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] })
      toast({
        title: "Evento eliminado",
        description: "El evento ha sido eliminado exitosamente."
      })
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "No se pudo eliminar el evento.",
        variant: "destructive"
      })
    }
  })

  // Mark attendance mutation
  const markAttendanceMutation = useMutation({
    mutationFn: async ({ eventId, email, attended }: { eventId: string, email: string, attended: boolean }) => {
      const event = events?.find(e => e.id === eventId)
      if (!event) throw new Error("Evento no encontrado")

      let updatedAttendedEmails = [...event.attended_emails]
      
      if (attended) {
        if (!updatedAttendedEmails.includes(email)) {
          updatedAttendedEmails.push(email)
        }
      } else {
        updatedAttendedEmails = updatedAttendedEmails.filter(e => e !== email)
      }

      const { error } = await supabase
        .from('events')
        .update({ attended_emails: updatedAttendedEmails })
        .eq('id', eventId)
      
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] })
      setAttendanceEmail('')
      toast({
        title: "Asistencia actualizada",
        description: "La asistencia ha sido actualizada exitosamente."
      })
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "No se pudo actualizar la asistencia.",
        variant: "destructive"
      })
    }
  })


  const handleEditEvent = (event: Event) => {
    setSelectedEvent(event)
    setNewEvent({
      name: event.name,
      event_date: event.event_date,
      invited_emails: event.invited_emails.join(', '),
      description: event.description || ''
    })
    setIsEditDialogOpen(true)
  }

  const handleUpdateEvent = () => {
    if (selectedEvent) {
      updateEventMutation.mutate({ id: selectedEvent.id, eventData: newEvent })
    }
  }

  const handleDeleteEvent = (eventId: string) => {
    if (confirm('¿Estás seguro de que quieres eliminar este evento?')) {
      deleteEventMutation.mutate(eventId)
    }
  }

  const markAttendance = (eventId: string, email: string, attended: boolean) => {
    markAttendanceMutation.mutate({ eventId, email, attended })
  }

  const getAttendanceRate = (event: Event) => {
    if (event.invited_emails.length === 0) return 0
    return Math.round((event.attended_emails.length / event.invited_emails.length) * 100)
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Asistencia de Alumnos</h1>
          <p className="text-muted-foreground">
            {showAllWeeks 
              ? "Todos los eventos agrupados por semana"
              : `Eventos de esta semana (${format(weekStart, 'dd/MM')} - ${format(weekEnd, 'dd/MM')})`
            }
          </p>
        </div>
        
        <Button 
          variant={showAllWeeks ? "default" : "outline"}
          onClick={() => setShowAllWeeks(!showAllWeeks)}
        >
          <CalendarDays className="mr-2 h-4 w-4" />
          {showAllWeeks ? "Ver Semana Actual" : "Ver Todas las Semanas"}
        </Button>
      </div>

      {events?.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center">
            <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              {showAllWeeks ? "No hay eventos creados aún" : "No hay eventos en esta semana"}
            </p>
          </CardContent>
        </Card>
      ) : showAllWeeks ? (
        <div className="space-y-8">
          {Object.entries(groupEventsByWeek(allEvents || [])).map(([weekStart, weekEvents]) => {
            const monday = parseISO(weekStart)
            const sunday = endOfWeek(monday, { weekStartsOn: 1 })
            return (
              <div key={weekStart} className="space-y-4">
                <h2 className="text-xl font-semibold border-b pb-2">
                  Semana del {format(monday, 'dd/MM/yyyy')} al {format(sunday, 'dd/MM/yyyy')}
                </h2>
                <div className="grid gap-4">
                  {weekEvents.map((event) => (
                    <Card key={event.id}>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <div>
                            <CardTitle className="flex items-center gap-2">
                              <Calendar className="h-5 w-5 text-primary" />
                              {event.name}
                            </CardTitle>
                            <CardDescription>
                              {format(new Date(event.event_date), 'PPP', { locale: es })}
                            </CardDescription>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">
                              {getAttendanceRate(event)}% asistencia
                            </Badge>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEditEvent(event)}
                            >
                              <Edit className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeleteEvent(event.id)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      
                      <CardContent>
                        {event.description && (
                          <p className="text-sm text-muted-foreground mb-4">{event.description}</p>
                        )}
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <p className="text-sm font-medium">Invitados</p>
                              <p className="text-sm text-muted-foreground">{event.invited_emails.length}</p>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <UserCheck className="h-4 w-4 text-green-600" />
                            <div>
                              <p className="text-sm font-medium">Asistieron</p>
                              <p className="text-sm text-muted-foreground">{event.attended_emails.length}</p>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <UserX className="h-4 w-4 text-red-600" />
                            <div>
                              <p className="text-sm font-medium">No Asistieron</p>
                              <p className="text-sm text-muted-foreground">
                                {event.invited_emails.length - event.attended_emails.length}
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-4">
                          <h4 className="font-medium">Lista de Asistencia</h4>
                          <div className="space-y-2 max-h-60 overflow-y-auto">
                            {event.invited_emails.map((email) => {
                              const hasAttended = event.attended_emails.includes(email)
                              return (
                                <div key={email} className="flex items-center justify-between p-2 border rounded">
                                  <span className="text-sm">{email}</span>
                                  <div className="flex items-center gap-2">
                                    {hasAttended ? (
                                      <Badge className="bg-green-100 text-green-800">
                                        <CheckCircle className="h-3 w-3 mr-1" />
                                        Asistió
                                      </Badge>
                                    ) : (
                                      <Badge variant="outline" className="text-red-600">
                                        No asistió
                                      </Badge>
                                    )}
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => markAttendance(event.id, email, !hasAttended)}
                                    >
                                      {hasAttended ? 'Marcar ausente' : 'Marcar presente'}
                                    </Button>
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="grid gap-6">
          {events?.map((event) => (
            <Card key={event.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Calendar className="h-5 w-5 text-primary" />
                      {event.name}
                    </CardTitle>
                    <CardDescription>
                      {format(new Date(event.event_date), 'PPP', { locale: es })}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">
                      {getAttendanceRate(event)}% asistencia
                    </Badge>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEditEvent(event)}
                    >
                      <Edit className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteEvent(event.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent>
                {event.description && (
                  <p className="text-sm text-muted-foreground mb-4">{event.description}</p>
                )}
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Invitados</p>
                      <p className="text-sm text-muted-foreground">{event.invited_emails.length}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <UserCheck className="h-4 w-4 text-green-600" />
                    <div>
                      <p className="text-sm font-medium">Asistieron</p>
                      <p className="text-sm text-muted-foreground">{event.attended_emails.length}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <UserX className="h-4 w-4 text-red-600" />
                    <div>
                      <p className="text-sm font-medium">No Asistieron</p>
                      <p className="text-sm text-muted-foreground">
                        {event.invited_emails.length - event.attended_emails.length}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-medium">Lista de Asistencia</h4>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {event.invited_emails.map((email) => {
                      const hasAttended = event.attended_emails.includes(email)
                      return (
                        <div key={email} className="flex items-center justify-between p-2 border rounded">
                          <span className="text-sm">{email}</span>
                          <div className="flex items-center gap-2">
                            {hasAttended ? (
                              <Badge className="bg-green-100 text-green-800">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Asistió
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-red-600">
                                No asistió
                              </Badge>
                            )}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => markAttendance(event.id, email, !hasAttended)}
                            >
                              {hasAttended ? 'Marcar ausente' : 'Marcar presente'}
                            </Button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Event Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Editar Evento</DialogTitle>
            <DialogDescription>
              Modifica los datos del evento.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-name">Nombre del Evento</Label>
              <Input
                id="edit-name"
                value={newEvent.name}
                onChange={(e) => setNewEvent({...newEvent, name: e.target.value})}
                placeholder="Ej: Clase de Marketing Digital"
              />
            </div>
            <div>
              <Label htmlFor="edit-date">Fecha</Label>
              <Input
                id="edit-date"
                type="date"
                value={newEvent.event_date}
                onChange={(e) => setNewEvent({...newEvent, event_date: e.target.value})}
              />
            </div>
            <div>
              <Label htmlFor="edit-emails">Emails de Invitados (separados por comas)</Label>
              <Textarea
                id="edit-emails"
                value={newEvent.invited_emails}
                onChange={(e) => setNewEvent({...newEvent, invited_emails: e.target.value})}
                placeholder="email1@ejemplo.com, email2@ejemplo.com"
                rows={3}
              />
            </div>
            <div>
              <Label htmlFor="edit-description">Descripción (opcional)</Label>
              <Textarea
                id="edit-description"
                value={newEvent.description}
                onChange={(e) => setNewEvent({...newEvent, description: e.target.value})}
                placeholder="Descripción del evento..."
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button 
              onClick={handleUpdateEvent}
              disabled={!newEvent.name || !newEvent.event_date || updateEventMutation.isPending}
            >
              {updateEventMutation.isPending ? "Actualizando..." : "Actualizar Evento"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}