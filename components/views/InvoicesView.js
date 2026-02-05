'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Check, Send, DollarSign, Receipt, Loader2 } from 'lucide-react'
import { format } from 'date-fns'
import { da } from 'date-fns/locale'
import { api, BRAND_BLUE } from '@/lib/constants'
import { formatAddress } from '@/lib/utils'

export default function InvoicesView() {
  const [invoices, setInvoices] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('all')

  const loadInvoices = async () => {
    try {
      const statusFilter = activeTab === 'all' ? '' : `?status=${activeTab}`
      const data = await api.get(`/invoices${statusFilter}`)
      setInvoices(data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadInvoices() }, [activeTab])

  const updateStatus = async (invoiceId, newStatus) => {
    try {
      await api.patch(`/invoices/${invoiceId}/status`, { status: newStatus })
      loadInvoices()
    } catch (err) {
      alert('Fejl: ' + err.message)
    }
  }

  const tabs = [
    { id: 'all', label: 'Alle' },
    { id: 'draft', label: 'Kladder' },
    { id: 'ready', label: 'Klar til afsendelse' },
    { id: 'sent', label: 'Sendt' },
    { id: 'paid', label: 'Betalt' }
  ]

  const getStatusBadge = (status) => {
    switch(status) {
      case 'draft': return <Badge className="bg-gray-100 text-gray-700">Kladde</Badge>
      case 'ready': return <Badge className="bg-blue-100 text-blue-700">Klar</Badge>
      case 'sent': return <Badge className="bg-yellow-100 text-yellow-700">Sendt</Badge>
      case 'paid': return <Badge className="bg-green-100 text-green-700">Betalt</Badge>
      default: return <Badge className="bg-gray-100 text-gray-700">{status}</Badge>
    }
  }

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin" style={{ color: BRAND_BLUE }} /></div>

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Fakturering</h2>
        <p className="text-gray-500">Oversigt over alle fakturaer</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b pb-2">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-t-lg font-medium text-sm transition-colors ${
              activeTab === tab.id ? 'bg-white border border-b-0 border-gray-200 -mb-[1px]' : 'text-gray-500 hover:text-gray-700'
            }`}
            style={activeTab === tab.id ? { color: BRAND_BLUE } : {}}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Invoices List */}
      {invoices.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Receipt className="w-12 h-12 text-gray-300 mb-4" />
            <p className="text-gray-500">Ingen fakturaer {activeTab !== 'all' ? 'med denne status' : ''}</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left p-3 font-medium text-gray-600">Faktura #</th>
                  <th className="text-left p-3 font-medium text-gray-600">Kunde</th>
                  <th className="text-left p-3 font-medium text-gray-600">Adresse</th>
                  <th className="text-right p-3 font-medium text-gray-600">Total</th>
                  <th className="text-center p-3 font-medium text-gray-600">Status</th>
                  <th className="text-left p-3 font-medium text-gray-600">Dato</th>
                  <th className="text-right p-3 font-medium text-gray-600">Handlinger</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((invoice) => (
                  <tr key={invoice.id} className="border-b hover:bg-gray-50">
                    <td className="p-3 font-mono">{invoice.invoiceNumber}</td>
                    <td className="p-3 font-medium">{invoice.companyName}</td>
                    <td className="p-3 text-gray-500">{formatAddress(invoice.address) || (typeof invoice.address === 'string' ? invoice.address : '') || '—'}</td>
                    <td className="p-3 text-right font-bold">{invoice.total?.toLocaleString('da-DK', { minimumFractionDigits: 2 })} kr</td>
                    <td className="p-3 text-center">{getStatusBadge(invoice.status)}</td>
                    <td className="p-3 text-gray-500">{invoice.createdAt ? format(new Date(invoice.createdAt), 'dd/MM/yyyy', { locale: da }) : '-'}</td>
                    <td className="p-3 text-right">
                      <div className="flex gap-1 justify-end">
                        {invoice.status === 'draft' && (
                          <Button size="sm" variant="outline" onClick={() => updateStatus(invoice.id, 'ready')}>
                            <Check className="w-4 h-4 mr-1" />Klar
                          </Button>
                        )}
                        {invoice.status === 'ready' && (
                          <Button size="sm" onClick={() => updateStatus(invoice.id, 'sent')} className="text-white" style={{ backgroundColor: BRAND_BLUE }}>
                            <Send className="w-4 h-4 mr-1" />Send
                          </Button>
                        )}
                        {invoice.status === 'sent' && (
                          <Button size="sm" variant="outline" onClick={() => updateStatus(invoice.id, 'paid')}>
                            <DollarSign className="w-4 h-4 mr-1" />Betalt
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}