'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { 
  MessageSquare, Loader2, Send, Camera, CheckCircle, Bell
} from 'lucide-react'
import { format } from 'date-fns'
import { da } from 'date-fns/locale'
import { api, BRAND_BLUE, pushNotificationManager } from '@/lib/constants'

export default function MessagesView({ user, onMessagesRead }) {
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(true)
  const [newMessage, setNewMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [selectedCompanyId, setSelectedCompanyId] = useState(null)
  const [companies, setCompanies] = useState([])
  const [pushEnabled, setPushEnabled] = useState(false)
  const [pushSupported, setPushSupported] = useState(false)
  const fileInputRef = useRef(null)
  const messagesEndRef = useRef(null)

  // Initialize push notifications
  useEffect(() => {
    const initPush = async () => {
      if ('serviceWorker' in navigator && 'PushManager' in window) {
        setPushSupported(true)
        await pushNotificationManager.init()
        
        // Check if already subscribed
        if (Notification.permission === 'granted') {
          const reg = await navigator.serviceWorker.ready
          const sub = await reg.pushManager.getSubscription()
          if (sub) setPushEnabled(true)
        }
      }
    }
    initPush()
  }, [])

  // Enable push notifications
  const enablePushNotifications = async () => {
    const granted = await pushNotificationManager.requestPermission()
    if (granted) {
      await pushNotificationManager.init()
      const subscription = await pushNotificationManager.subscribe()
      if (subscription) {
        await pushNotificationManager.sendToServer(subscription, user?.id)
        setPushEnabled(true)
        alert('✅ Push-notifikationer aktiveret! Du modtager nu notifikationer når der er nye beskeder.')
      }
    } else {
      alert('Push-notifikationer blev afvist. Du kan aktivere dem i browserens indstillinger.')
    }
  }

  // Mark messages as read when admin selects a company
  const selectCompanyAndMarkRead = async (companyId) => {
    setSelectedCompanyId(companyId)
    
    // Mark all messages from this company as read
    if (user?.role === 'admin' && companyId) {
      try {
        await api.post('/messages/mark-read-by-company', { companyId })
        // Notify parent to refresh notification counts
        if (onMessagesRead) {
          onMessagesRead()
        }
      } catch (err) {
        console.error('Error marking messages as read:', err)
      }
    }
  }

  const loadMessages = async () => {
    try {
      const data = await api.get('/messages')
      // Sort oldest to newest for chat display
      setMessages(data.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt)))
      
      // For admin, load companies list
      if (user?.role === 'admin') {
        const companiesData = await api.get('/companies')
        setCompanies(companiesData)
        
        // Group messages by company and auto-select first with messages
        const companiesWithMessages = [...new Set(data.map(m => m.companyId).filter(Boolean))]
        if (!selectedCompanyId && companiesWithMessages.length > 0) {
          selectCompanyAndMarkRead(companiesWithMessages[0])
        }
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { 
    loadMessages()
    // Poll for new messages every 10 seconds
    const interval = setInterval(loadMessages, 10000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    // Scroll to bottom when new messages arrive
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = async (content, imageUrl = null) => {
    if (!content?.trim() && !imageUrl) return
    
    setSending(true)
    try {
      const payload = {
        content: content?.trim() || '',
        imageUrl: imageUrl
      }
      
      // If admin is replying to a specific company conversation, include the target companyId
      if (user?.role === 'admin' && selectedCompanyId) {
        payload.toCompanyId = selectedCompanyId
      }
      
      await api.post('/messages', payload)
      setNewMessage('')
      loadMessages()
    } catch (err) {
      alert('Fejl ved afsendelse: ' + err.message)
    } finally {
      setSending(false)
    }
  }

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      alert('Kun billeder er tilladt')
      return
    }

    setUploadingImage(true)
    try {
      const token = localStorage.getItem('smartrep_token')
      const formData = new FormData()
      formData.append('file', file)
      formData.append('photoType', 'message_image')

      const response = await fetch('/api/upload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      })

      if (!response.ok) throw new Error('Upload fejlede')
      
      const result = await response.json()
      
      // Send message with image
      await sendMessage(newMessage || 'Billede', result.file.url)
    } catch (err) {
      alert('Fejl ved upload: ' + err.message)
    } finally {
      setUploadingImage(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage(newMessage)
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-8 h-8 animate-spin" style={{ color: BRAND_BLUE }} />
    </div>
  )

  // Filter messages for display
  const displayMessages = user?.role === 'admin' && selectedCompanyId
    ? messages.filter(m => m.companyId === selectedCompanyId)
    : messages

  // Get unique companies with messages for admin sidebar
  const companiesWithMessages = user?.role === 'admin' 
    ? [...new Set(messages.map(m => m.companyId).filter(Boolean))].map(companyId => {
        const company = companies.find(c => c.id === companyId)
        const companyMessages = messages.filter(m => m.companyId === companyId)
        const unreadCount = companyMessages.filter(m => !m.read && m.fromUserRole === 'customer').length
        const lastMessage = companyMessages[companyMessages.length - 1]
        return { companyId, companyName: company?.name || 'Ukendt', unreadCount, lastMessage }
      })
    : []

  return (
    <div className="h-[calc(100vh-200px)] flex flex-col">
      {/* Header */}
      <div className="mb-4 flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Beskeder</h2>
          <p className="text-gray-500">
            {user?.role === 'admin' ? 'Se og besvar kundebeskeder' : 'Send beskeder direkte til SMARTREP kontoret'}
          </p>
        </div>
        {/* Push notification toggle for customers */}
        {user?.role === 'customer' && pushSupported && (
          <Button
            variant={pushEnabled ? "outline" : "default"}
            size="sm"
            onClick={enablePushNotifications}
            disabled={pushEnabled}
            className={pushEnabled ? 'text-green-600 border-green-600' : 'text-white'}
            style={!pushEnabled ? { backgroundColor: BRAND_BLUE } : {}}
          >
            {pushEnabled ? (
              <><CheckCircle className="w-4 h-4 mr-2" />Notifikationer aktive</>
            ) : (
              <><Bell className="w-4 h-4 mr-2" />Aktiver notifikationer</>
            )}
          </Button>
        )}
      </div>

      {/* Main Container - different layout for admin */}
      {user?.role === 'admin' ? (
        <div className="flex-1 flex gap-4 overflow-hidden">
          {/* Conversations List (Admin only) */}
          <Card className="w-72 flex flex-col">
            <CardHeader className="py-3 px-4 border-b">
              <CardTitle className="text-sm">Konversationer ({companiesWithMessages.length})</CardTitle>
            </CardHeader>
            <div className="flex-1 overflow-y-auto">
              {companiesWithMessages.length === 0 ? (
                <div className="p-4 text-center text-gray-400 text-sm">
                  Ingen beskeder fra kunder
                </div>
              ) : (
                companiesWithMessages.map((conv) => (
                  <button
                    key={conv.companyId}
                    onClick={() => selectCompanyAndMarkRead(conv.companyId)}
                    className={`w-full p-3 text-left border-b hover:bg-gray-50 transition-colors ${
                      selectedCompanyId === conv.companyId ? 'bg-blue-50' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm truncate">{conv.companyName}</span>
                      {conv.unreadCount > 0 && (
                        <span className="w-5 h-5 rounded-full text-white text-xs flex items-center justify-center" style={{ backgroundColor: BRAND_BLUE }}>
                          {conv.unreadCount}
                        </span>
                      )}
                    </div>
                    {conv.lastMessage && (
                      <p className="text-xs text-gray-500 truncate mt-1">
                        {conv.lastMessage.content || 'Billede'}
                      </p>
                    )}
                  </button>
                ))
              )}
            </div>
          </Card>

          {/* Chat Area */}
          <Card className="flex-1 flex flex-col overflow-hidden">
            {selectedCompanyId ? (
              <>
                {/* Chat Header */}
                <div className="p-4 border-b bg-gray-50">
                  <p className="font-medium">{companies.find(c => c.id === selectedCompanyId)?.name || 'Kunde'}</p>
                  <p className="text-xs text-gray-500">{displayMessages.length} beskeder</p>
                </div>
                
                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
                  {displayMessages.map((msg) => {
                    const isOwnMessage = msg.fromUserRole === 'admin'
                    return (
                      <div key={msg.id} className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[70%] rounded-2xl p-3 ${isOwnMessage ? 'text-white rounded-br-md' : 'bg-white border rounded-bl-md shadow-sm'}`} style={isOwnMessage ? { backgroundColor: BRAND_BLUE } : {}}>
                          {!isOwnMessage && <p className="text-xs font-medium mb-1" style={{ color: BRAND_BLUE }}>{msg.fromUserName}</p>}
                          {msg.imageUrl && <a href={msg.imageUrl} target="_blank" rel="noopener noreferrer"><img src={msg.imageUrl} alt="Billede" className="max-w-full h-auto rounded-lg mb-2 cursor-pointer hover:opacity-80" style={{ maxHeight: '200px' }} /></a>}
                          {msg.content && msg.content !== 'Billede' && <p className={`text-sm ${isOwnMessage ? 'text-white' : 'text-gray-800'}`}>{msg.content}</p>}
                          <p className={`text-xs mt-1 ${isOwnMessage ? 'text-blue-100' : 'text-gray-400'}`}>{msg.createdAt ? format(new Date(msg.createdAt), 'dd/MM HH:mm', { locale: da }) : ''}</p>
                        </div>
                      </div>
                    )
                  })}
                  <div ref={messagesEndRef} />
                </div>

                {/* Input */}
                <div className="p-4 border-t bg-white">
                  <div className="flex items-end gap-2">
                    <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                    <Button type="button" variant="outline" size="icon" onClick={() => fileInputRef.current?.click()} disabled={uploadingImage || sending} className="shrink-0">
                      {uploadingImage ? <Loader2 className="w-5 h-5 animate-spin" /> : <Camera className="w-5 h-5" />}
                    </Button>
                    <div className="flex-1"><Textarea value={newMessage} onChange={(e) => setNewMessage(e.target.value)} onKeyPress={handleKeyPress} placeholder="Skriv et svar..." className="resize-none min-h-[44px] max-h-[120px]" rows={1} /></div>
                    <Button type="button" onClick={() => sendMessage(newMessage)} disabled={(!newMessage?.trim() && !uploadingImage) || sending} className="shrink-0 text-white" style={{ backgroundColor: BRAND_BLUE }}>
                      {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
                <MessageSquare className="w-16 h-16 mb-4" />
                <p>Vælg en konversation</p>
              </div>
            )}
          </Card>
        </div>
      ) : (
        /* Customer Chat - Original Layout */
        <Card className="flex-1 flex flex-col overflow-hidden">
          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
            {displayMessages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-400">
                <MessageSquare className="w-16 h-16 mb-4" />
                <p>Ingen beskeder endnu</p>
                <p className="text-sm">Start en samtale med kontoret</p>
              </div>
            ) : (
              displayMessages.map((msg) => {
                const isOwnMessage = msg.fromUserId === user?.id
                
                return (
                  <div 
                    key={msg.id} 
                    className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
                  >
                    <div 
                      className={`max-w-[70%] rounded-2xl p-3 ${
                        isOwnMessage 
                          ? 'text-white rounded-br-md' 
                          : 'bg-white border rounded-bl-md shadow-sm'
                      }`}
                      style={isOwnMessage ? { backgroundColor: BRAND_BLUE } : {}}
                    >
                      {!isOwnMessage && (
                        <p className="text-xs font-medium mb-1" style={{ color: BRAND_BLUE }}>
                          {msg.fromUserName || 'SMARTREP Kontor'}
                        </p>
                      )}
                      
                      {msg.imageUrl && (
                        <a href={msg.imageUrl} target="_blank" rel="noopener noreferrer">
                          <img 
                            src={msg.imageUrl} 
                            alt="Billede" 
                            className="max-w-full h-auto rounded-lg mb-2 cursor-pointer hover:opacity-80"
                            style={{ maxHeight: '200px' }}
                          />
                        </a>
                      )}
                      
                      {msg.content && msg.content !== 'Billede' && (
                        <p className={`text-sm ${isOwnMessage ? 'text-white' : 'text-gray-800'}`}>
                          {msg.content}
                        </p>
                      )}
                      
                      <p className={`text-xs mt-1 ${isOwnMessage ? 'text-blue-100' : 'text-gray-400'}`}>
                        {msg.createdAt ? format(new Date(msg.createdAt), 'HH:mm', { locale: da }) : ''}
                      </p>
                    </div>
                  </div>
                )
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="p-4 border-t bg-white">
            <div className="flex items-end gap-2">
              {/* Image Upload Button */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingImage || sending}
                className="shrink-0"
              >
                {uploadingImage ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Camera className="w-5 h-5" />
                )}
              </Button>

              {/* Message Input */}
              <div className="flex-1 relative">
                <Textarea
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Skriv en besked..."
                  className="resize-none min-h-[44px] max-h-[120px] pr-12"
                  rows={1}
                />
              </div>

              {/* Send Button */}
              <Button
                type="button"
                onClick={() => sendMessage(newMessage)}
                disabled={(!newMessage?.trim() && !uploadingImage) || sending}
                className="shrink-0 text-white"
                style={{ backgroundColor: BRAND_BLUE }}
              >
                {sending ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Send className="w-5 h-5" />
                )}
              </Button>
            </div>
            <p className="text-xs text-gray-400 mt-2">
              Tryk Enter for at sende, eller klik på kamera-ikonet for at vedhæfte et billede
            </p>
          </div>
        </Card>
      )}
    </div>
  )
}