'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Checkbox } from '@/components/ui/checkbox'
import { 
  Users, Plus, Pencil, Trash2, Loader2, Search, User, Crown, Settings, Wrench
} from 'lucide-react'
import { api, BRAND_BLUE } from '@/lib/constants'

export default function UsersView() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [showUserDialog, setShowUserDialog] = useState(false)
  const [editingUser, setEditingUser] = useState(null)
  const [userForm, setUserForm] = useState({
    name: '',
    address: '',
    email: '',
    phone: '',
    roles: [],
    password: ''
  })

  const roleOptions = [
    { 
      value: 'admin', 
      label: 'Admin', 
      description: 'Fuld adgang til alle funktioner og indstillinger',
      icon: <Crown className="w-4 h-4 text-purple-600" />,
      color: 'bg-purple-100 text-purple-700'
    },
    { 
      value: 'technician_admin', 
      label: 'Tekniker (Admin)', 
      description: 'Tekniker med adgang til priser og avancerede funktioner',
      icon: <Settings className="w-4 h-4 text-blue-600" />,
      color: 'bg-blue-100 text-blue-700'
    },
    { 
      value: 'technician_standard', 
      label: 'Tekniker (Standard)', 
      description: 'Standard tekniker - kan IKKE se priser eller ydelser',
      icon: <Wrench className="w-4 h-4 text-green-600" />,
      color: 'bg-green-100 text-green-700'
    },
    { 
      value: 'office_standard', 
      label: 'Kontor (Standard)', 
      description: 'Backend portal adgang - kan IKKE ændre indstillinger',
      icon: <User className="w-4 h-4 text-gray-600" />,
      color: 'bg-gray-100 text-gray-700'
    }
  ]

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    try {
      const data = await api.get('/staff-users')
      setUsers(data || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const openUserDialog = (user = null) => {
    if (user) {
      setEditingUser(user)
      setUserForm({
        name: user.name || '',
        address: user.address || '',
        email: user.email || '',
        phone: user.phone || '',
        roles: user.roles || [],
        password: '' // Never pre-fill password
      })
    } else {
      setEditingUser(null)
      setUserForm({
        name: '',
        address: '',
        email: '',
        phone: '',
        roles: [],
        password: ''
      })
    }
    setShowUserDialog(true)
  }

  const saveUser = async () => {
    try {
      if (editingUser) {
        // Update existing user
        const updateData = { ...userForm }
        if (!updateData.password) {
          delete updateData.password // Don't update password if empty
        }
        await api.put(`/staff-users/${editingUser.id}`, updateData)
      } else {
        // Create new user
        if (!userForm.password) {
          alert('Password er påkrævet for nye brugere')
          return
        }
        await api.post('/staff-users', userForm)
      }
      setShowUserDialog(false)
      loadData()
    } catch (err) {
      console.error(err)
      alert('Fejl ved gemning af bruger: ' + err.message)
    }
  }

  const deleteUser = async (userId) => {
    if (!confirm('Er du sikker på at du vil slette denne bruger?')) return
    try {
      await api.delete(`/staff-users/${userId}`)
      loadData()
    } catch (err) {
      console.error(err)
      alert('Fejl ved sletning: ' + err.message)
    }
  }

  const toggleRole = (roleValue) => {
    setUserForm(prev => ({
      ...prev,
      roles: prev.roles.includes(roleValue)
        ? prev.roles.filter(r => r !== roleValue)
        : [...prev.roles, roleValue]
    }))
  }

  const getRoleDisplay = (userRoles) => {
    return userRoles.map(role => {
      const roleConfig = roleOptions.find(r => r.value === role)
      return roleConfig ? (
        <Badge key={role} className={`${roleConfig.color} text-xs mr-1`}>
          {roleConfig.icon}
          <span className="ml-1">{roleConfig.label}</span>
        </Badge>
      ) : null
    })
  }

  // Filter users based on search
  const filteredUsers = users.filter(user => 
    user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.phone?.includes(searchTerm)
  )

  // Statistics
  const roleStats = {
    admin: users.filter(u => u.roles?.includes('admin')).length,
    technician_admin: users.filter(u => u.roles?.includes('technician_admin')).length,
    technician_standard: users.filter(u => u.roles?.includes('technician_standard')).length,
    office_standard: users.filter(u => u.roles?.includes('office_standard')).length
  }

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin" style={{ color: BRAND_BLUE }} /></div>

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Brugere</h2>
          <p className="text-gray-500">Administrer SMARTREP personale og deres roller</p>
        </div>
        <Button onClick={() => openUserDialog()} className="text-white" style={{ backgroundColor: BRAND_BLUE }}>
          <Plus className="w-4 h-4 mr-2" />Tilføj bruger
        </Button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Admins</p>
                <p className="text-2xl font-bold text-purple-600">{roleStats.admin}</p>
              </div>
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <Crown className="w-5 h-5 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Tekniker (Admin)</p>
                <p className="text-2xl font-bold text-blue-600">{roleStats.technician_admin}</p>
              </div>
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Settings className="w-5 h-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Tekniker (Standard)</p>
                <p className="text-2xl font-bold text-green-600">{roleStats.technician_standard}</p>
              </div>
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <Wrench className="w-5 h-5 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Kontor</p>
                <p className="text-2xl font-bold text-gray-600">{roleStats.office_standard}</p>
              </div>
              <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                <User className="w-5 h-5 text-gray-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input
          placeholder="Søg i brugere..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Users List */}
      <Card>
        <CardContent className="p-0">
          {filteredUsers.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              {searchTerm ? 'Ingen resultater fundet' : 'Ingen brugere endnu. Klik "Tilføj bruger" for at oprette den første.'}
            </div>
          ) : (
            <div className="divide-y">
              {filteredUsers.map((user) => (
                <div key={user.id} className="p-4 hover:bg-gray-50">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                          <User className="w-5 h-5 text-gray-600" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900">{user.name}</h3>
                          <p className="text-sm text-gray-500">{user.email}</p>
                        </div>
                      </div>
                      
                      <div className="ml-13 space-y-2">
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <span>📍 {user.address}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <span>📞 {user.phone}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-500">Roller:</span>
                          <div className="flex flex-wrap gap-1">
                            {getRoleDisplay(user.roles || [])}
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => openUserDialog(user)}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        className="text-red-500 hover:text-red-700 hover:bg-red-50"
                        onClick={() => deleteUser(user.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* User Dialog */}
      <Dialog open={showUserDialog} onOpenChange={setShowUserDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingUser ? 'Rediger bruger' : 'Tilføj ny bruger'}</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label>Navn *</Label>
              <Input 
                value={userForm.name} 
                onChange={(e) => setUserForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Fulde navn" 
              />
            </div>
            
            <div>
              <Label>Adresse *</Label>
              <Input 
                value={userForm.address} 
                onChange={(e) => setUserForm(prev => ({ ...prev, address: e.target.value }))}
                placeholder="Antonio Costas Vej 15, 7000 Fredericia" 
              />
              <p className="text-xs text-gray-500 mt-1">
                * Bruges til beregning af km og køretid under "Planlæg"
              </p>
            </div>
            
            <div>
              <Label>E-mail *</Label>
              <Input 
                type="email"
                value={userForm.email} 
                onChange={(e) => setUserForm(prev => ({ ...prev, email: e.target.value }))}
                placeholder="jc@smartrep.dk" 
              />
            </div>
            
            <div>
              <Label>Mobilnummer</Label>
              <Input 
                value={userForm.phone} 
                onChange={(e) => setUserForm(prev => ({ ...prev, phone: e.target.value }))}
                placeholder="+45 25728000" 
              />
            </div>
            
            <div>
              <Label>Password {editingUser ? '(lad stå tom for at beholde nuværende)' : '*'}</Label>
              <Input 
                type="password"
                value={userForm.password} 
                onChange={(e) => setUserForm(prev => ({ ...prev, password: e.target.value }))}
                placeholder={editingUser ? 'Lad stå tom for at beholde...' : 'Indtast password'} 
              />
            </div>

            <div className="border-t pt-4">
              <Label className="text-sm font-medium mb-3 block">Roller</Label>
              <div className="space-y-3">
                {roleOptions.map((role) => (
                  <div key={role.value} className="flex items-start gap-3 p-3 border rounded-lg hover:bg-gray-50">
                    <Checkbox
                      id={role.value}
                      checked={userForm.roles.includes(role.value)}
                      onCheckedChange={() => toggleRole(role.value)}
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        {role.icon}
                        <label htmlFor={role.value} className="font-medium text-sm cursor-pointer">
                          {role.label}
                        </label>
                      </div>
                      <p className="text-xs text-gray-500">{role.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUserDialog(false)}>
              Annuller
            </Button>
            <Button 
              onClick={saveUser} 
              disabled={!userForm.name || !userForm.email || !userForm.address || userForm.roles.length === 0}
              className="text-white" 
              style={{ backgroundColor: BRAND_BLUE }}
            >
              {editingUser ? 'Gem ændringer' : 'Opret bruger'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}