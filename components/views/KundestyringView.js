'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { 
  Building2, Users, Plus, MoreHorizontal, Eye, Trash2, Phone, Mail, ChevronRight, ChevronDown,
  Loader2, Search, Pencil, UserPlus, UserCheck, Crown
} from 'lucide-react'
import { api, BRAND_BLUE, getIdDaysColor } from '@/lib/constants'
import { formatAddress, taskAddressString } from '@/lib/utils'

export default function KundestyringView() {
  const [companies, setCompanies] = useState([])
  const [contacts, setContacts] = useState([])
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [expandedCompanies, setExpandedCompanies] = useState({})
  const [expandedContacts, setExpandedContacts] = useState({})
  
  // Dialog states
  const [showCompanyDialog, setShowCompanyDialog] = useState(false)
  const [showContactDialog, setShowContactDialog] = useState(false)
  const [editingCompany, setEditingCompany] = useState(null)
  const [editingContact, setEditingContact] = useState(null)
  const [selectedCompanyId, setSelectedCompanyId] = useState(null)
  
  // Form states
  const [companyForm, setCompanyForm] = useState({ name: '', address: '', postalCode: '', city: '', invoiceEmail: '', phone: '' })
  const [contactForm, setContactForm] = useState({ name: '', email: '', phone: '', position: '', companyId: '', hasPortalAccess: false, isAdmin: false })

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    try {
      const [companiesData, contactsData, tasksData] = await Promise.all([
        api.get('/companies'),
        api.get('/contacts'),
        api.get('/tasks')
      ])
      setCompanies(companiesData || [])
      setContacts(contactsData || [])
      setTasks(tasksData || [])
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }

  // Toggle expand/collapse for a company
  const toggleExpand = (companyId) => {
    setExpandedCompanies(prev => ({
      ...prev,
      [companyId]: !prev[companyId]
    }))
  }

  // Toggle expand/collapse for a contact's task list
  const toggleContactTasks = (contactId, e) => {
    e.stopPropagation()
    setExpandedContacts(prev => ({
      ...prev,
      [contactId]: !prev[contactId]
    }))
  }

  // Get contacts for a company
  const getCompanyContacts = (companyId) => {
    return contacts.filter(c => c.companyId === companyId)
  }

  // Get tasks for a company (all tasks)
  const getCompanyTasks = (companyId) => {
    return tasks.filter(t => t.companyId === companyId)
  }

  // Get active tasks for a contact (assigned to them based on contactId OR contactEmail)
  const getContactActiveTasks = (contactId, contactEmail, companyId) => {
    // Filter tasks that are:
    // 1. Belong to the company
    // 2. Are active (not archived/completed)
    // 3. Have this contact assigned (contactId matches OR contactEmail matches)
    return tasks.filter(t => 
      t.companyId === companyId && 
      !['archived', 'completed'].includes(t.status) &&
      (t.contactId === contactId || t.contactEmail === contactEmail)
    )
  }

  // Get category short codes
  const getCategoryShort = (types) => {
    if (!types || types.length === 0) return '-'
    return types.map(t => {
      if (t.toLowerCase().includes('pla')) return 'PLA'
      if (t.toLowerCase().includes('gla')) return 'GLA'
      if (t.toLowerCase().includes('alu')) return 'ALU'
      if (t.toLowerCase().includes('bun')) return 'BUN'
      if (t.toLowerCase().includes('tre')) return 'TRE'
      if (t.toLowerCase().includes('mal')) return 'MAL'
      return t.substring(0, 3).toUpperCase()
    }).join(' / ')
  }

  // Open task detail modal
  const [viewingTask, setViewingTask] = useState(null)

  // Resend password function
  const handleResendPassword = async (contact) => {
    if (!confirm(`Vil du gensende password til ${contact.name} (${contact.email})?`)) return
    try {
      await api.post('/auth/resend-password', { email: contact.email })
      alert('✅ Nyt password sendt til ' + contact.email)
    } catch (err) {
      console.error(err)
      alert('Fejl ved afsendelse af password')
    }
  }

  // Send portal invitation (first time)
  const handleSendInvitation = async (contact) => {
    if (!contact.email?.trim()) {
      alert('Kontakten har ikke e-mail – tilføj e-mail først.')
      return
    }
    if (!confirm(`Vil du sende invitation til portalen til ${contact.name} (${contact.email})?`)) return
    try {
      await api.post('/communications/send', {
        type: 'email',
        template: 'portal_invitation',
        to: contact.email,
        contactName: contact.name
      })
      alert('✅ Invitation sendt til ' + contact.email)
      loadData()
    } catch (err) {
      console.error(err)
      alert('Fejl ved afsendelse af invitation')
    }
  }

  // Resend portal invitation (contact already has access)
  const handleResendInvitation = async (contact) => {
    if (!confirm(`Vil du gensende portal invitation til ${contact.name} (${contact.email})?`)) return
    try {
      await api.post('/communications/send', {
        type: 'email',
        template: 'portal_invitation',
        to: contact.email,
        contactName: contact.name
      })
      alert('✅ Portal invitation sendt til ' + contact.email)
    } catch (err) {
      console.error(err)
      alert('Fejl ved afsendelse af invitation')
    }
  }

  // Filter companies and contacts based on search
  const filteredCompanies = companies.filter(company => {
    const addrStr = formatAddress(company.address) || (typeof company.address === 'string' ? company.address : '')
    const companyMatch = company.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         company.city?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         addrStr.toLowerCase().includes(searchTerm.toLowerCase())
    
    const contactMatch = getCompanyContacts(company.id).some(contact =>
      contact.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contact.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contact.phone?.includes(searchTerm)
    )
    
    return companyMatch || contactMatch
  })

  // Statistics
  const totalContacts = contacts.length
  const portalUsers = contacts.filter(c => c.hasPortalAccess || c.role === 'customer').length
  const adminUsers = contacts.filter(c => c.isAdmin).length

  // Company CRUD
  const openCompanyDialog = (company = null) => {
    if (company) {
      setEditingCompany(company)
      setCompanyForm({
        name: company.name || '',
        address: formatAddress(company.address) || (typeof company.address === 'string' ? company.address : '') || '',
        postalCode: company.postalCode || '',
        city: company.city || '',
        invoiceEmail: company.invoiceEmail || '',
        phone: company.phone || ''
      })
    } else {
      setEditingCompany(null)
      setCompanyForm({ name: '', address: '', postalCode: '', city: '', invoiceEmail: '', phone: '' })
    }
    setShowCompanyDialog(true)
  }

  const saveCompany = async () => {
    try {
      if (editingCompany) {
        await api.put(`/companies/${editingCompany.id}`, companyForm)
      } else {
        await api.post('/companies', companyForm)
      }
      setShowCompanyDialog(false)
      loadData()
    } catch (err) { console.error(err); alert('Fejl ved gemning af firma') }
  }

  const deleteCompany = async (companyId) => {
    if (!confirm('Er du sikker på at du vil slette dette firma og alle tilknyttede kontakter?')) return
    try {
      await api.delete(`/companies/${companyId}`)
      loadData()
    } catch (err) { console.error(err); alert('Fejl ved sletning') }
  }

  // Contact CRUD
  const openContactDialog = (companyId, contact = null) => {
    setSelectedCompanyId(companyId)
    if (contact) {
      setEditingContact(contact)
      setContactForm({
        name: contact.name || '',
        email: contact.email || '',
        phone: contact.phone || '',
        position: contact.position || '',
        companyId: contact.companyId || companyId,
        hasPortalAccess: contact.hasPortalAccess || contact.role === 'customer',
        isAdmin: contact.isAdmin || false
      })
    } else {
      setEditingContact(null)
      setContactForm({ 
        name: '', 
        email: '', 
        phone: '', 
        position: '', 
        companyId: companyId, 
        hasPortalAccess: false, 
        isAdmin: false 
      })
    }
    setShowContactDialog(true)
  }

  const saveContact = async () => {
    try {
      if (editingContact) {
        await api.put(`/contacts/${editingContact.id}`, contactForm)
      } else {
        await api.post('/contacts', contactForm)
      }
      setShowContactDialog(false)
      loadData()
    } catch (err) { console.error(err); alert('Fejl ved gemning af kontakt') }
  }

  const deleteContact = async (contactId) => {
    if (!confirm('Er du sikker på at du vil slette denne kontakt?')) return
    try {
      await api.delete(`/contacts/${contactId}`)
      loadData()
    } catch (err) { console.error(err); alert('Fejl ved sletning') }
  }

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin" style={{ color: BRAND_BLUE }} /></div>

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Kundestyring</h2>
          <p className="text-gray-500">Administrer kunder og kontaktpersoner</p>
        </div>
        <Button onClick={() => openCompanyDialog()} className="text-white" style={{ backgroundColor: BRAND_BLUE }}>
          <Plus className="w-4 h-4 mr-2" />Tilføj firma
        </Button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Kunder</p>
                <p className="text-2xl font-bold">{companies.length}</p>
              </div>
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Building2 className="w-5 h-5" style={{ color: BRAND_BLUE }} />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Kontakter</p>
                <p className="text-2xl font-bold">{totalContacts}</p>
              </div>
              <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                <Users className="w-5 h-5 text-gray-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Portal adgang</p>
                <p className="text-2xl font-bold text-green-600">{portalUsers}</p>
              </div>
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <UserCheck className="w-5 h-5 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Admins</p>
                <p className="text-2xl font-bold text-purple-600">{adminUsers}</p>
              </div>
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <Crown className="w-5 h-5 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input
          placeholder="Søg i firmaer og kontakter..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Hierarchical Company/Contact List */}
      <Card>
        <CardContent className="p-0">
          {filteredCompanies.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              {searchTerm ? 'Ingen resultater fundet' : 'Ingen kunder endnu. Klik "Tilføj firma" for at oprette den første.'}
            </div>
          ) : (
            <div className="divide-y">
              {filteredCompanies.map((company) => {
                const companyContacts = getCompanyContacts(company.id)
                const companyTasks = getCompanyTasks(company.id)
                const isExpanded = expandedCompanies[company.id]
                
                return (
                  <div key={company.id}>
                    {/* Company Header */}
                    <div 
                      className="flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 cursor-pointer transition-colors"
                      onClick={() => toggleExpand(company.id)}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 flex items-center justify-center text-gray-500">
                          {isExpanded ? (
                            <ChevronDown className="w-5 h-5" />
                          ) : (
                            <ChevronRight className="w-5 h-5" />
                          )}
                        </div>
                        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                          <Building2 className="w-5 h-5" style={{ color: BRAND_BLUE }} />
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900">{company.name}</h3>
                          <p className="text-sm text-gray-500">
                            {formatAddress(company.address) && `${formatAddress(company.address)}, `}{company.postalCode} {company.city}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant="outline" className="text-gray-600">
                          {companyContacts.length} kontakt{companyContacts.length !== 1 ? 'er' : ''}
                        </Badge>
                        <Badge className="bg-blue-100 text-blue-700">
                          📋 {companyTasks.length} sag{companyTasks.length !== 1 ? 'er' : ''}
                        </Badge>
                        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => openCompanyDialog(company)}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            className="text-red-500 hover:text-red-700 hover:bg-red-50"
                            onClick={() => deleteCompany(company.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>

                    {/* Contacts List (when expanded) */}
                    {isExpanded && (
                      <div className="bg-white">
                        {/* Header row for contacts */}
                        <div className="flex items-center justify-between py-2 px-4 pl-16 bg-blue-50 border-t border-b border-blue-100">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8" /> {/* Spacer for icon */}
                            <span className="text-xs font-semibold text-blue-800 uppercase tracking-wide">Kontaktpersoner</span>
                          </div>
                          <div className="flex items-center gap-6">
                            <div className="flex items-center gap-4 text-xs font-semibold text-blue-800 uppercase tracking-wide">
                              <span className="w-20">Aktive sager</span>
                              <span className="w-28">Telefon</span>
                              <span className="w-48">Email</span>
                            </div>
                            <div className="w-32 text-xs font-semibold text-blue-800 uppercase tracking-wide text-center">Handlinger</div>
                          </div>
                        </div>
                        
                        {companyContacts.map((contact) => {
                          const isAdmin = contact.isAdmin
                          return (
                          <div key={contact.id}>
                            {/* Contact Row */}
                            <div 
                              className={`flex items-center justify-between py-3 px-4 pl-16 border-t transition-colors ${
                                isAdmin 
                                  ? 'bg-purple-50 hover:bg-purple-100 border-l-4 border-l-purple-400' 
                                  : 'hover:bg-gray-50'
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                                  isAdmin ? 'bg-purple-200' : 'bg-gray-100'
                                }`}>
                                  {isAdmin ? (
                                    <span className="text-sm">👑</span>
                                  ) : (
                                    <span className="text-sm">👤</span>
                                  )}
                                </div>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className={`font-medium ${isAdmin ? 'text-purple-900' : 'text-gray-900'}`}>
                                      {contact.name}
                                    </span>
                                    {isAdmin && (
                                      <Badge className="bg-purple-200 text-purple-800 text-xs font-semibold">Admin</Badge>
                                    )}
                                    {(contact.hasPortalAccess || contact.role === 'customer') && !isAdmin && (
                                      <Badge className="bg-green-100 text-green-700 text-xs">Portal</Badge>
                                    )}
                                  </div>
                                  <p className="text-sm text-gray-500">{contact.position || 'Kontakt'}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-4">
                                <div className="flex items-center gap-4 text-sm text-gray-600">
                                  {/* Active tasks count with expand button */}
                                  <button
                                    onClick={(e) => toggleContactTasks(contact.id, e)}
                                    className="flex items-center gap-1 w-20 hover:text-blue-600 transition-colors"
                                  >
                                    {expandedContacts[contact.id] ? (
                                      <ChevronDown className="w-3 h-3" />
                                    ) : (
                                      <ChevronRight className="w-3 h-3" />
                                    )}
                                    <span className="font-medium">{getContactActiveTasks(contact.id, contact.email, company.id).length} sager</span>
                                  </button>
                                  <span className="flex items-center gap-1 w-28">
                                    {contact.phone && (
                                      <>
                                        <Phone className="w-3 h-3" />
                                        {contact.phone}
                                      </>
                                    )}
                                  </span>
                                  <span className="flex items-center gap-1 w-48">
                                    <Mail className="w-3 h-3" />
                                    {contact.email}
                                  </span>
                                </div>
                                <div className="flex items-center gap-1 w-32 justify-end">
                                  {(contact.hasPortalAccess || contact.role === 'customer') ? (
                                    <>
                                      <Button 
                                        variant="ghost" 
                                        size="sm"
                                        className="text-xs text-gray-500 hover:text-blue-600"
                                        onClick={(e) => { e.stopPropagation(); handleResendPassword(contact) }}
                                        title="Gensend password"
                                      >
                                        🔑
                                      </Button>
                                      <Button 
                                        variant="ghost" 
                                        size="sm"
                                        className="text-xs text-gray-500 hover:text-blue-600"
                                        onClick={(e) => { e.stopPropagation(); handleResendInvitation(contact) }}
                                        title="Gensend invitation"
                                      >
                                        ✉️
                                      </Button>
                                    </>
                                  ) : (
                                    <Button 
                                      variant="ghost" 
                                      size="sm"
                                      className="text-xs text-gray-500 hover:text-blue-600"
                                      onClick={(e) => { e.stopPropagation(); handleSendInvitation(contact) }}
                                      title="Send invitation til portal"
                                    >
                                      ✉️
                                    </Button>
                                  )}
                                  <Button 
                                    variant="ghost" 
                                    size="sm"
                                    onClick={(e) => { e.stopPropagation(); openContactDialog(company.id, contact) }}
                                  >
                                    <Pencil className="w-4 h-4" />
                                  </Button>
                                  <Button 
                                    variant="ghost" 
                                    size="sm"
                                    className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                    onClick={(e) => { e.stopPropagation(); deleteContact(contact.id) }}
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </div>
                              </div>
                            </div>
                            
                            {/* Expanded Task List for Contact */}
                            {expandedContacts[contact.id] && (
                              <div className="bg-gray-50 border-t pl-24 pr-4 py-2">
                                <table className="w-full text-sm">
                                  <thead>
                                    <tr className="text-xs text-gray-500 uppercase border-b">
                                      <th className="text-left py-2 font-medium">Oprettet</th>
                                      <th className="text-left py-2 font-medium">ID</th>
                                      <th className="text-left py-2 font-medium">Deadline</th>
                                      <th className="text-left py-2 font-medium">Adresse</th>
                                      <th className="text-left py-2 font-medium">Kategorier</th>
                                      <th className="text-left py-2 font-medium">Status</th>
                                      <th className="text-center py-2 font-medium">Vis</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {getContactActiveTasks(contact.id, contact.email, company.id).map(task => (
                                      <tr key={task.id} className="border-b border-gray-200 hover:bg-gray-100">
                                        <td className="py-2 text-gray-600">
                                          {task.createdAt ? new Date(task.createdAt).toLocaleDateString('da-DK') : '-'}
                                        </td>
                                        <td className="py-2">
                                          <span className={`font-bold ${getIdDaysColor(task.idDays)}`}>
                                            {task.idDays || 0}
                                          </span>
                                        </td>
                                        <td className="py-2 text-gray-600">
                                          {task.deadline ? new Date(task.deadline).toLocaleDateString('da-DK') : '-'}
                                        </td>
                                        <td className="py-2">
                                          <div>{taskAddressString(task) || '—'}</div>
                                          <div className="text-xs text-gray-500">{task.postalCode} {task.city}</div>
                                        </td>
                                        <td className="py-2">
                                          <Badge variant="outline" className="text-xs">
                                            {getCategoryShort(task.types)}
                                          </Badge>
                                        </td>
                                        <td className="py-2">
                                          <Badge className={`text-xs ${
                                            task.status === 'planned' ? 'bg-green-100 text-green-700' :
                                            task.status === 'under_planning' ? 'bg-yellow-100 text-yellow-700' :
                                            'bg-gray-100 text-gray-700'
                                          }`}>
                                            {task.status === 'planned' ? 'Planlagt' :
                                             task.status === 'under_planning' ? 'Under planlægning' :
                                             task.status === 'awaiting_confirmation' ? 'Afventer' :
                                             task.status}
                                          </Badge>
                                        </td>
                                        <td className="py-2 text-center">
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-7 px-2"
                                            onClick={(e) => { e.stopPropagation(); setViewingTask(task) }}
                                          >
                                            <Eye className="w-4 h-4" />
                                          </Button>
                                        </td>
                                      </tr>
                                    ))}
                                    {getContactActiveTasks(contact.id, contact.email, company.id).length === 0 && (
                                      <tr>
                                        <td colSpan={7} className="py-4 text-center text-gray-400">
                                          Ingen aktive sager for denne kontakt
                                        </td>
                                      </tr>
                                    )}
                                  </tbody>
                                </table>
                              </div>
                            )}
                          </div>
                        )
                        })}
                        
                        {/* Add Contact Button */}
                        <div className="py-3 px-4 pl-16 border-t">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            className="text-gray-600 hover:text-gray-900"
                            onClick={() => openContactDialog(company.id)}
                          >
                            <UserPlus className="w-4 h-4 mr-2" />
                            Tilføj kontaktperson
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Company Dialog */}
      <Dialog open={showCompanyDialog} onOpenChange={setShowCompanyDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingCompany ? 'Rediger firma' : 'Tilføj nyt firma'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Firmanavn *</Label>
              <Input 
                value={companyForm.name} 
                onChange={(e) => setCompanyForm(prev => ({ ...prev, name: e.target.value }))} 
                placeholder="Indtast firmanavn"
              />
            </div>
            <div>
              <Label>Adresse</Label>
              <Input 
                value={companyForm.address} 
                onChange={(e) => setCompanyForm(prev => ({ ...prev, address: e.target.value }))}
                placeholder="Vejnavn og husnummer" 
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Postnr.</Label>
                <Input 
                  value={companyForm.postalCode} 
                  onChange={(e) => setCompanyForm(prev => ({ ...prev, postalCode: e.target.value }))} 
                />
              </div>
              <div>
                <Label>By</Label>
                <Input 
                  value={companyForm.city} 
                  onChange={(e) => setCompanyForm(prev => ({ ...prev, city: e.target.value }))} 
                />
              </div>
            </div>
            <div>
              <Label>Faktura e-mail</Label>
              <Input 
                type="email" 
                value={companyForm.invoiceEmail} 
                onChange={(e) => setCompanyForm(prev => ({ ...prev, invoiceEmail: e.target.value }))}
                placeholder="faktura@firma.dk" 
              />
            </div>
            <div>
              <Label>Telefon</Label>
              <Input 
                value={companyForm.phone} 
                onChange={(e) => setCompanyForm(prev => ({ ...prev, phone: e.target.value }))}
                placeholder="+45 12 34 56 78" 
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCompanyDialog(false)}>Annuller</Button>
            <Button onClick={saveCompany} className="text-white" style={{ backgroundColor: BRAND_BLUE }}>
              {editingCompany ? 'Gem ændringer' : 'Opret firma'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Contact Dialog */}
      <Dialog open={showContactDialog} onOpenChange={setShowContactDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingContact ? 'Rediger kontakt' : 'Tilføj kontaktperson'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Navn *</Label>
              <Input 
                value={contactForm.name} 
                onChange={(e) => setContactForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Fulde navn" 
              />
            </div>
            <div>
              <Label>E-mail *</Label>
              <Input 
                type="email" 
                value={contactForm.email} 
                onChange={(e) => setContactForm(prev => ({ ...prev, email: e.target.value }))}
                placeholder="kontakt@firma.dk" 
              />
            </div>
            <div>
              <Label>Telefon</Label>
              <Input 
                value={contactForm.phone} 
                onChange={(e) => setContactForm(prev => ({ ...prev, phone: e.target.value }))}
                placeholder="+45 12 34 56 78" 
              />
            </div>
            <div>
              <Label>Stilling</Label>
              <Input 
                value={contactForm.position} 
                onChange={(e) => setContactForm(prev => ({ ...prev, position: e.target.value }))}
                placeholder="F.eks. Byggeleder, Projektchef" 
              />
            </div>
            <div className="border-t pt-4 space-y-3">
              <Label className="text-sm font-medium">Adgangsrettigheder</Label>
              <div className="flex items-center gap-2">
                <input 
                  type="checkbox" 
                  id="portalAccess"
                  checked={contactForm.hasPortalAccess}
                  onChange={(e) => setContactForm(prev => ({ ...prev, hasPortalAccess: e.target.checked }))}
                  className="w-4 h-4 rounded border-gray-300"
                />
                <label htmlFor="portalAccess" className="text-sm text-gray-700">
                  Portal adgang (kan logge ind)
                </label>
              </div>
              <div className="flex items-center gap-2">
                <input 
                  type="checkbox" 
                  id="isAdmin"
                  checked={contactForm.isAdmin}
                  onChange={(e) => setContactForm(prev => ({ ...prev, isAdmin: e.target.checked }))}
                  className="w-4 h-4 rounded border-gray-300"
                />
                <label htmlFor="isAdmin" className="text-sm text-gray-700">
                  Administrator (fuld adgang)
                </label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowContactDialog(false)}>Annuller</Button>
            <Button onClick={saveContact} className="text-white" style={{ backgroundColor: BRAND_BLUE }}>
              {editingContact ? 'Gem ændringer' : 'Opret kontakt'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Task View Dialog */}
      <Dialog open={!!viewingTask} onOpenChange={(open) => !open && setViewingTask(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <span>Opgave #{viewingTask?.taskNumber}</span>
              <Badge className={`${
                viewingTask?.status === 'planned' ? 'bg-green-100 text-green-700' :
                viewingTask?.status === 'under_planning' ? 'bg-yellow-100 text-yellow-700' :
                'bg-gray-100 text-gray-700'
              }`}>
                {viewingTask?.status === 'planned' ? 'Planlagt' :
                 viewingTask?.status === 'under_planning' ? 'Under planlægning' :
                 viewingTask?.status === 'awaiting_confirmation' ? 'Afventer bekræftelse' :
                 viewingTask?.status}
              </Badge>
            </DialogTitle>
          </DialogHeader>
          
          {viewingTask && (
            <div className="space-y-6">
              {/* ID Dage */}
              <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                <div>
                  <Label className="text-gray-500 text-xs">ID Dage</Label>
                  <p className={`font-bold text-2xl ${getIdDaysColor(viewingTask.idDays)}`}>{viewingTask.idDays || 0}</p>
                </div>
                <div>
                  <Label className="text-gray-500 text-xs">Oprettet</Label>
                  <p className="font-medium">{viewingTask.createdAt ? new Date(viewingTask.createdAt).toLocaleDateString('da-DK') : '-'}</p>
                </div>
                <div>
                  <Label className="text-gray-500 text-xs">Deadline</Label>
                  <p className="font-medium">{viewingTask.deadline ? new Date(viewingTask.deadline).toLocaleDateString('da-DK') : '-'}</p>
                </div>
              </div>

              {/* Kunde & Adresse */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-gray-500 text-xs">Kunde</Label>
                  <p className="font-semibold">{viewingTask.companyName}</p>
                </div>
                <div>
                  <Label className="text-gray-500 text-xs">Kontakt</Label>
                  <p className="font-medium">{viewingTask.contactName || '-'}</p>
                  <p className="text-sm text-gray-500">{viewingTask.contactEmail}</p>
                </div>
              </div>

              <div>
                <Label className="text-gray-500 text-xs">Adresse</Label>
                <p className="font-medium">{taskAddressString(viewingTask) || '—'}</p>
                <p className="text-sm text-gray-500">{viewingTask.postalCode} {viewingTask.city}</p>
              </div>

              {/* Kategorier */}
              <div>
                <Label className="text-gray-500 text-xs">Kategorier</Label>
                <div className="flex gap-2 mt-1">
                  {viewingTask.types?.map((type, i) => (
                    <Badge key={i} variant="outline">{type}</Badge>
                  )) || <span className="text-gray-400">Ingen</span>}
                </div>
              </div>

              {/* Beskrivelse */}
              {viewingTask.description && (
                <div>
                  <Label className="text-gray-500 text-xs">Beskrivelse</Label>
                  <p className="text-gray-700 whitespace-pre-wrap">{viewingTask.description}</p>
                </div>
              )}

              {/* Planlagt dato */}
              {viewingTask.plannedDate && (
                <div>
                  <Label className="text-gray-500 text-xs">Planlagt dato</Label>
                  <p className="font-medium">{new Date(viewingTask.plannedDate).toLocaleString('da-DK')}</p>
                </div>
              )}
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewingTask(null)}>Luk</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}