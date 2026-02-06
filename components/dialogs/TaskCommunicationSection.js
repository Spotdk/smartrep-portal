'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { 
  Phone, ChevronDown, ChevronRight, AlertCircle, CheckCircle,
  Loader2, X, Send, RefreshCw, Megaphone, MessageSquare, Users, Mail, Plus,
  Calendar, Key, Building2
} from 'lucide-react'
import { Switch } from '@/components/ui/switch'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { format } from 'date-fns'
import { da } from 'date-fns/locale'
import { api, BRAND_BLUE, STATUS_CONFIG } from '@/lib/constants'
import { taskAddressString } from '@/lib/utils'

const TaskCommunicationSection = ({ task, user }) => {
  const [expanded, setExpanded] = useState(false)
  const [communications, setCommunications] = useState([])
  const [bygherreCommunications, setBygherreCommunications] = useState([])
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [messageType, setMessageType] = useState('email')
  const [recipient, setRecipient] = useState('contact')
  const [message, setMessage] = useState('')
  const [twoWaySms, setTwoWaySms] = useState(false)
  const [showTwoWayConfirm, setShowTwoWayConfirm] = useState(false)
  const [pendingSend, setPendingSend] = useState(null)
  
  // Bygherre dialog states
  const [showBygherreDialog, setShowBygherreDialog] = useState(false)
  const [bygherreAction, setBygherreAction] = useState(null) // 'confirm', 'schedule_outdoor', 'schedule_indoor', 'final_confirm'
  const [proposedDates, setProposedDates] = useState([{ date: '', timeSlot: '08-10' }])
  const [sendingBygherre, setSendingBygherre] = useState(false)
  const [showSuccessPopup, setShowSuccessPopup] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')

  const loadCommunications = async () => {
    if (!expanded) return
    setLoading(true)
    try {
      const [commData, bygherreData] = await Promise.all([
        api.get('/communications'),
        api.get(`/bygherre/task/${task.id}`)
      ])
      setCommunications(commData.filter(c => c.taskId === task.id))
      setBygherreCommunications(bygherreData || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { 
    if (expanded) loadCommunications() 
  }, [expanded])

  const getRecipientInfo = () => {
    switch(recipient) {
      case 'contact': return { name: task.contactName, email: task.contactEmail, phone: task.contactPhone }
      case 'owner1': return { name: task.owner1Name, phone: task.owner1Phone }
      case 'owner2': return { name: task.owner2Name, phone: task.owner2Phone }
      default: return {}
    }
  }

  const doSendMessage = async (useTwoWay = false) => {
    const recipientInfo = getRecipientInfo()
    setSending(true)
    try {
      await api.post('/communications/send', {
        taskId: task.id,
        type: messageType,
        to: messageType === 'email' ? recipientInfo.email : recipientInfo.phone,
        toName: recipientInfo.name,
        message: message,
        subject: messageType === 'email' ? `SMARTREP: Vedr. opgave ${task.taskNumber}` : undefined,
        twoWay: messageType === 'sms' ? useTwoWay : undefined
      })
      alert('✅ Besked sendt!')
      setMessage('')
      loadCommunications()
    } catch (err) {
      alert('Fejl: ' + (err.message || 'Kunne ikke sende'))
    } finally {
      setSending(false)
      setPendingSend(null)
      setShowTwoWayConfirm(false)
    }
  }

  const sendMessage = () => {
    const recipientInfo = getRecipientInfo()
    if (messageType === 'email' && !recipientInfo.email) {
      alert('Modtager har ingen email')
      return
    }
    if (messageType === 'sms' && !recipientInfo.phone) {
      alert('Modtager har intet telefonnummer')
      return
    }
    if (!message.trim()) {
      alert('Indtast en besked')
      return
    }
    if (messageType === 'sms' && twoWaySms) {
      setPendingSend({ twoWay: true })
      setShowTwoWayConfirm(true)
      return
    }
    doSendMessage(twoWaySms)
  }

  // Bygherre actions
  const openBygherreDialog = (action) => {
    setBygherreAction(action)
    if (action === 'schedule_indoor') {
      setProposedDates([{ date: '', timeSlot: '08-10' }, { date: '', timeSlot: '08-10' }, { date: '', timeSlot: '08-10' }])
    } else {
      setProposedDates([{ date: '', timeSlot: '08-10' }])
    }
    setShowBygherreDialog(true)
  }

  const addDateSlot = () => {
    if (proposedDates.length < 3) {
      setProposedDates([...proposedDates, { date: '', timeSlot: '08-10' }])
    }
  }

  const removeDateSlot = (index) => {
    if (proposedDates.length > 1) {
      setProposedDates(proposedDates.filter((_, i) => i !== index))
    }
  }

  const updateDateSlot = (index, field, value) => {
    setProposedDates(proposedDates.map((d, i) => i === index ? { ...d, [field]: value } : d))
  }

  const sendBygherreCommunication = async () => {
    // Validation
    if (bygherreAction !== 'confirm') {
      const validDates = proposedDates.filter(d => d.date)
      if (validDates.length === 0) {
        alert('Vælg mindst én dato')
        return
      }
    }

    setSendingBygherre(true)
    try {
      const type = bygherreAction === 'confirm' ? 'confirm_task' 
        : bygherreAction === 'schedule_outdoor' ? 'schedule_outdoor' 
        : 'schedule_indoor'

      const result = await api.post('/bygherre/send', {
        taskId: task.id,
        type,
        proposedDates: proposedDates.filter(d => d.date)
      })

      setShowBygherreDialog(false)
      setSuccessMessage(bygherreAction === 'confirm' 
        ? 'SMS sendt til bygherre med bekræftelse af opgave'
        : `SMS sendt til bygherre med ${proposedDates.filter(d => d.date).length} datoforslag`)
      setShowSuccessPopup(true)
      setTimeout(() => setShowSuccessPopup(false), 4000)
      loadCommunications()
    } catch (err) {
      alert('Fejl: ' + (err.message || 'Kunne ikke sende'))
    } finally {
      setSendingBygherre(false)
    }
  }

  const sendFinalConfirmation = async (commId, date, timeSlot) => {
    setSendingBygherre(true)
    try {
      await api.post(`/bygherre/${commId}/confirm-final`, {
        confirmedDate: date,
        confirmedTimeSlot: timeSlot
      })
      setSuccessMessage('Endelig bekræftelse sendt til bygherre')
      setShowSuccessPopup(true)
      setTimeout(() => setShowSuccessPopup(false), 4000)
      loadCommunications()
    } catch (err) {
      alert('Fejl: ' + (err.message || 'Kunne ikke sende'))
    } finally {
      setSendingBygherre(false)
    }
  }

  const formatTimeSlot = (slot) => {
    switch(slot) {
      case '08-10': return '08:00 - 10:00'
      case '10-12': return '10:00 - 12:00'
      case '12-14': return '12:00 - 14:00'
      case '08-14': return '08:00 - 14:00'
      default: return slot
    }
  }

  const getStatusBadge = (comm) => {
    // confirm_task is just a notification - no response expected
    if (comm.type === 'confirm_task') {
      return <Badge className="bg-green-100 text-green-700">Sendt</Badge>
    }
    if (comm.finalConfirmationSent) return <Badge className="bg-green-100 text-green-700">Bekræftet</Badge>
    if (comm.response?.confirmed) return <Badge className="bg-blue-100 text-blue-700">Accepteret</Badge>
    if (comm.response && !comm.response.confirmed) return <Badge className="bg-orange-100 text-orange-700">Afvist</Badge>
    return <Badge className="bg-yellow-100 text-yellow-700">Afventer svar</Badge>
  }

  // Check if there's a pending bygherre comm that needs final confirmation
  const pendingFinalConfirm = bygherreCommunications.find(c => c.response && !c.finalConfirmationSent && c.type === 'schedule_indoor')

  return (
    <div className="border rounded-lg mt-4">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5" style={{ color: BRAND_BLUE }} />
          <span className="font-medium">Kommunikation</span>
          {(communications.length > 0 || bygherreCommunications.length > 0) && (
            <span className="text-xs bg-gray-200 px-2 py-0.5 rounded-full">
              {communications.length + bygherreCommunications.length}
            </span>
          )}
          {pendingFinalConfirm && (
            <span className="flex items-center gap-1 text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">
              <Megaphone className="w-3 h-3" />
              Afventer bekræftelse
            </span>
          )}
        </div>
        {expanded ? <ChevronDown className="w-5 h-5 text-gray-400" /> : <ChevronRight className="w-5 h-5 text-gray-400" />}
      </button>
      
      {expanded && (
        <div className="p-4 pt-0 border-t">
          {/* ===== BYGHERRE SECTION ===== */}
          {user?.role === 'admin' && (task.owner1Name || task.owner2Name) && (
            <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-100">
              <div className="flex items-center gap-2 mb-3">
                <Users className="w-5 h-5" style={{ color: BRAND_BLUE }} />
                <span className="font-semibold text-gray-900">Bygherre (Husejer)</span>
              </div>
              
              {/* Bygherre info */}
              <div className="mb-4 text-sm text-gray-600">
                {task.owner1Name && (
                  <div className="flex items-center gap-2">
                    <span>{task.owner1Name}</span>
                    {task.owner1Phone && (
                      <a href={`tel:${task.owner1Phone}`} className="flex items-center gap-1 text-blue-600 hover:underline">
                        <Phone className="w-3 h-3" />{task.owner1Phone}
                      </a>
                    )}
                  </div>
                )}
              </div>
              
              {/* CTA Buttons */}
              <div className="flex flex-wrap gap-2">
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => openBygherreDialog('confirm')}
                  className="bg-white"
                >
                  <CheckCircle className="w-4 h-4 mr-1" />
                  Bekræft opgave
                </Button>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => openBygherreDialog('schedule_outdoor')}
                  className="bg-white"
                >
                  <Calendar className="w-4 h-4 mr-1" />
                  Varsl besøg
                </Button>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => openBygherreDialog('schedule_indoor')}
                  className="bg-white"
                >
                  <Key className="w-4 h-4 mr-1" />
                  Send datoforslag
                </Button>
              </div>

              {/* Pending final confirmation alert */}
              {pendingFinalConfirm && (
                <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex items-center gap-2 text-yellow-800 mb-2">
                    <Megaphone className="w-5 h-5" />
                    <span className="font-semibold">Bygherre har svaret - afventer endelig bekræftelse</span>
                  </div>
                  <p className="text-sm text-yellow-700 mb-3">
                    {pendingFinalConfirm.response?.selectedDates?.length > 0 
                      ? `Bygherre har valgt ${pendingFinalConfirm.response.selectedDates.length} dato(er)`
                      : 'Bygherre har afvist alle foreslåede datoer'}
                  </p>
                  {pendingFinalConfirm.response?.selectedDates?.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {pendingFinalConfirm.response.selectedDates.map(idx => {
                        const dateItem = pendingFinalConfirm.proposedDates[idx]
                        return dateItem && (
                          <Button
                            key={idx}
                            size="sm"
                            onClick={() => sendFinalConfirmation(pendingFinalConfirm.id, dateItem.date, dateItem.timeSlot)}
                            disabled={sendingBygherre}
                            className="text-white"
                            style={{ backgroundColor: BRAND_BLUE }}
                          >
                            <CheckCircle className="w-4 h-4 mr-1" />
                            Bekræft {new Date(dateItem.date).toLocaleDateString('da-DK')}
                          </Button>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Bygherre communication history */}
              {bygherreCommunications.length > 0 && (
                <div className="mt-4 border-t border-blue-200 pt-3">
                  <Label className="text-xs text-gray-500 mb-2 block">Bygherre historik</Label>
                  <div className="space-y-3 max-h-60 overflow-y-auto">
                    {bygherreCommunications.map(comm => (
                      <div key={comm.id} className="p-3 bg-white rounded-lg border text-sm">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium">
                            {comm.type === 'confirm_task' ? 'Bekræft opgave' 
                              : comm.type === 'schedule_outdoor' ? 'Varsl besøg'
                              : 'Send datoforslag'}
                          </span>
                          {getStatusBadge(comm)}
                        </div>
                        
                        {/* Sendt dato */}
                        <div className="text-xs text-gray-500 mb-2">
                          <Calendar className="w-3 h-3 inline mr-1" />
                          Sendt {comm.createdAt ? format(new Date(comm.createdAt), 'dd/MM/yyyy HH:mm', { locale: da }) : ''}
                        </div>
                        
                        {/* Foreslåede datoer */}
                        {comm.proposedDates && comm.proposedDates.length > 0 && (
                          <div className="text-xs text-gray-600 mb-2 p-2 bg-gray-50 rounded">
                            <span className="font-medium">Foreslåede datoer:</span>
                            {comm.proposedDates.map((d, idx) => (
                              <div key={idx} className="ml-2">
                                • {d.date ? format(new Date(d.date), 'dd/MM/yyyy', { locale: da }) : '-'} 
                                ({formatTimeSlot(d.timeSlot)})
                              </div>
                            ))}
                          </div>
                        )}
                        
                        {/* Bygherres svar */}
                        {comm.response && (
                          <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded">
                            <div className="font-medium text-green-800 text-xs mb-1 flex items-center gap-1">
                              <CheckCircle className="w-3 h-3" />
                              Svar modtaget: {comm.respondedAt ? format(new Date(comm.respondedAt), 'dd/MM/yyyy HH:mm', { locale: da }) : ''}
                            </div>
                            
                            {/* Valgt dato (for datoforslag) */}
                            {comm.response.selectedDates && comm.response.selectedDates.length > 0 && comm.proposedDates && (
                              <div className="text-xs text-gray-700 mt-1">
                                <span className="font-medium">Valgt dato:</span> 
                                {comm.response.selectedDates.map(idx => {
                                  const selectedDate = comm.proposedDates[idx]
                                  return selectedDate ? (
                                    <span key={idx} className="ml-1 font-semibold text-green-700">
                                      {format(new Date(selectedDate.date), 'dd/MM/yyyy', { locale: da })} ({formatTimeSlot(selectedDate.timeSlot)})
                                    </span>
                                  ) : null
                                })}
                              </div>
                            )}
                            
                            {/* Adgangsmetode */}
                            {comm.response.accessMethod && (
                              <div className="text-xs text-gray-700 mt-1">
                                <span className="font-medium">Adgang:</span> 
                                {comm.response.accessMethod === 'home' 
                                  ? <span className="ml-1">Er hjemme</span>
                                  : <span className="ml-1">Nøgle: {comm.response.keyLocation || '-'}</span>
                                }
                              </div>
                            )}
                            
                            {/* Alternative datoer (hvis afvist) */}
                            {comm.response.alternativeDates && (
                              <div className="text-xs text-gray-700 mt-1">
                                <span className="font-medium">Foreslåede alternative datoer:</span> 
                                <span className="ml-1 italic">{comm.response.alternativeDates}</span>
                              </div>
                            )}
                            
                            {/* Bemærkninger */}
                            {comm.response.remarks && (
                              <div className="text-xs text-gray-700 mt-1">
                                <span className="font-medium">Bemærkninger:</span> 
                                <span className="ml-1 italic">"{comm.response.remarks}"</span>
                              </div>
                            )}
                            
                            {/* Telefon */}
                            {comm.response.phone && (
                              <div className="text-xs text-gray-700 mt-1">
                                <span className="font-medium">Telefon:</span> 
                                <a href={`tel:${comm.response.phone}`} className="ml-1 text-blue-600 hover:underline">{comm.response.phone}</a>
                              </div>
                            )}
                          </div>
                        )}
                        
                        {/* Endelig bekræftelse sendt */}
                        {comm.finalConfirmationSent && (
                          <div className="mt-2 p-2 bg-emerald-50 border border-emerald-200 rounded">
                            <div className="text-xs text-emerald-800 font-medium flex items-center gap-1">
                              <CheckCircle className="w-3 h-3" />
                              Endelig bekræftelse sendt: {comm.finalConfirmationSentAt ? format(new Date(comm.finalConfirmationSentAt), 'dd/MM/yyyy HH:mm', { locale: da }) : ''}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ===== KUNDE/KONTAKT SECTION ===== */}
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-3">
              <Building2 className="w-5 h-5" style={{ color: BRAND_BLUE }} />
              <span className="font-semibold text-gray-900">Kunde / Kontakt</span>
            </div>
            
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <Label className="text-xs">Type</Label>
                <Select value={messageType} onValueChange={setMessageType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="email"><div className="flex items-center gap-2"><Mail className="w-4 h-4" />Email</div></SelectItem>
                    <SelectItem value="sms"><div className="flex items-center gap-2"><Phone className="w-4 h-4" />SMS</div></SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Modtager</Label>
                <Select value={recipient} onValueChange={setRecipient}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="contact">Kontakt: {task.contactName || '-'}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {messageType === 'sms' && (
              <div className="flex items-center gap-2 mb-3">
                <Switch id="twoWay" checked={twoWaySms} onCheckedChange={setTwoWaySms} />
                <Label htmlFor="twoWay" className="text-sm">Aktivér 2-vejs (besked sendes fra 52517040, modtager kan besvare)</Label>
              </div>
            )}
            <div className="mb-4">
              <Textarea 
                value={message} 
                onChange={(e) => setMessage(e.target.value)} 
                placeholder="Skriv din besked..."
                rows={3}
              />
            </div>
            <Button onClick={sendMessage} disabled={sending} className="text-white" style={{ backgroundColor: BRAND_BLUE }}>
              {sending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
              Send {messageType === 'email' ? 'Email' : 'SMS'}
            </Button>
          </div>

          {/* 2-vejs bekræftelse */}
          <AlertDialog open={showTwoWayConfirm} onOpenChange={setShowTwoWayConfirm}>
            <AlertDialogContent>
              <AlertDialogTitle>2-vejs SMS</AlertDialogTitle>
              <AlertDialogDescription>
                Beskeden sendes fra 52517040. Modtager kan besvare. Alle SMS i denne tråd kører som 2-vejs kommunikation.
              </AlertDialogDescription>
              <AlertDialogFooter>
                <AlertDialogCancel>Annuller</AlertDialogCancel>
                <AlertDialogAction onClick={() => doSendMessage(true)}>OK</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          {/* Communication History */}
          {loading ? (
            <div className="flex justify-center py-4"><Loader2 className="w-6 h-6 animate-spin" /></div>
          ) : communications.length > 0 && (
            <div className="mt-4 border-t pt-4">
              <Label className="text-gray-500 text-xs mb-2 block">Historik (Kunde/Kontakt)</Label>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {communications.map((comm) => (
                  <div key={comm.id} className="flex items-start gap-2 p-2 bg-gray-50 rounded text-sm">
                    {comm.type === 'email' ? <Mail className="w-4 h-4 text-gray-400 mt-0.5" /> : <Phone className="w-4 h-4 text-gray-400 mt-0.5" />}
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{comm.to}</span>
                        <span className="text-xs text-gray-400">{comm.createdAt ? format(new Date(comm.createdAt), 'dd/MM HH:mm', { locale: da }) : ''}</span>
                      </div>
                      <p className="text-gray-600 truncate">{comm.message || comm.subject}</p>
                    </div>
                    <Badge variant={comm.status === 'sent' ? 'default' : 'destructive'} className="text-xs">
                      {comm.status === 'sent' ? '✓' : '✗'}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Bygherre Dialog */}
      <Dialog open={showBygherreDialog} onOpenChange={setShowBygherreDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {bygherreAction === 'confirm' && <><CheckCircle className="w-5 h-5" style={{ color: BRAND_BLUE }} /> Bekræft opgave</>}
              {bygherreAction === 'schedule_outdoor' && <><Calendar className="w-5 h-5" style={{ color: BRAND_BLUE }} /> Varsl besøg (udvendigt)</>}
              {bygherreAction === 'schedule_indoor' && <><Key className="w-5 h-5" style={{ color: BRAND_BLUE }} /> Send datoforslag (kræver adgang)</>}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Recipient info */}
            <div className="p-3 bg-gray-50 rounded-lg">
              <Label className="text-xs text-gray-500">Modtager (Bygherre)</Label>
              <p className="font-medium">{task.owner1Name}</p>
              <p className="text-sm text-gray-500">{task.owner1Phone}</p>
            </div>

            {/* SMS Preview for confirm */}
            {bygherreAction === 'confirm' && (
              <div className="p-3 bg-blue-50 rounded-lg border border-blue-100">
                <Label className="text-xs text-gray-500 mb-2 block">SMS der sendes:</Label>
                <p className="text-sm text-gray-700">
                  Hej {task.owner1Name}<br/><br/>
                  Vi er af {task.companyName} blevet bedt om at udføre en eller flere reparationer på {[taskAddressString(task), task.postalCode, task.city].filter(Boolean).join(', ')}.<br/><br/>
                  I behøver ikke foretage jer yderligere på nuværende tidspunkt. Vi kontakter jer igen, så snart det er muligt at planlægge udførsel.<br/><br/>
                  Mvh. SMARTREP
                </p>
              </div>
            )}

            {/* Date selection for scheduling */}
            {(bygherreAction === 'schedule_outdoor' || bygherreAction === 'schedule_indoor') && (
              <div>
                <Label className="text-sm font-medium mb-2 block">
                  {bygherreAction === 'schedule_indoor' ? 'Vælg op til 3 datoer' : 'Vælg dato'}
                </Label>
                <div className="space-y-3">
                  {proposedDates.map((dateItem, index) => (
                    <div key={index} className="flex gap-2 items-end">
                      <div className="flex-1">
                        <Label className="text-xs">Dato</Label>
                        <Input 
                          type="date" 
                          value={dateItem.date}
                          onChange={(e) => updateDateSlot(index, 'date', e.target.value)}
                        />
                      </div>
                      <div className="flex-1">
                        <Label className="text-xs">Estimeret ankomst</Label>
                        <Select value={dateItem.timeSlot} onValueChange={(v) => updateDateSlot(index, 'timeSlot', v)}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="08-10">08:00 - 10:00</SelectItem>
                            <SelectItem value="10-12">10:00 - 12:00</SelectItem>
                            <SelectItem value="12-14">12:00 - 14:00</SelectItem>
                            <SelectItem value="08-14">08:00 - 14:00</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      {proposedDates.length > 1 && (
                        <Button variant="ghost" size="icon" onClick={() => removeDateSlot(index)}>
                          <X className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
                {bygherreAction === 'schedule_indoor' && proposedDates.length < 3 && (
                  <Button variant="outline" size="sm" onClick={addDateSlot} className="mt-2">
                    <Plus className="w-4 h-4 mr-1" /> Tilføj dato
                  </Button>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBygherreDialog(false)}>Annuller</Button>
            <Button 
              onClick={sendBygherreCommunication} 
              disabled={sendingBygherre}
              className="text-white"
              style={{ backgroundColor: BRAND_BLUE }}
            >
              {sendingBygherre ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
              Send SMS
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Success Popup */}
      {showSuccessPopup && (
        <div className="fixed bottom-4 right-4 bg-green-500 text-white px-6 py-4 rounded-lg shadow-xl z-50 flex items-center gap-3 animate-in slide-in-from-bottom">
          <CheckCircle className="w-6 h-6" />
          <span className="font-medium">{successMessage}</span>
        </div>
      )}
    </div>
  )
}

export default TaskCommunicationSection
