'use client'

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { 
  ChevronDown, ChevronRight, Loader2, Trash2, Plus, DollarSign, Receipt
} from 'lucide-react'
import { format } from 'date-fns'
import { da } from 'date-fns/locale'
import { api, BRAND_BLUE, STATUS_CONFIG } from '@/lib/constants'

const TaskInvoiceSection = ({ task }) => {
  const [expanded, setExpanded] = useState(false)
  const [invoice, setInvoice] = useState(null)
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [lines, setLines] = useState([])
  const [expandedLineId, setExpandedLineId] = useState(null)

  const loadData = async () => {
    if (!expanded) return
    setLoading(true)
    try {
      const [invoicesData, productsData] = await Promise.all([
        api.get(`/invoices?taskId=${task.id}`),
        api.get('/products')
      ])
      setProducts(productsData)
      if (invoicesData.length > 0) {
        setInvoice(invoicesData[0])
        setLines(invoicesData[0].lines || [])
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { 
    if (expanded) loadData() 
  }, [expanded])

  const addLine = () => {
    setLines(prev => [...prev, { id: Date.now().toString(), productNr: '', description: '', productDescription: '', quantity: 1, unit: 'stk', unitPrice: 0, discount: 0 }])
  }

  const updateLine = (id, field, value) => {
    setLines(prev => prev.map(line => {
      if (line.id !== id) return line
      
      const updated = { ...line, [field]: value }
      
      // If product selected, auto-fill name, price, unit and productDescription (Beskrivelse fra prisliste)
      if (field === 'productNr') {
        const product = products.find(p => p.nr === value)
        if (product) {
          updated.description = product.name
          updated.unitPrice = product.price
          updated.unit = product.unit || 'stk'
          updated.productDescription = product.description ?? ''
        }
      }
      
      return updated
    }))
  }

  const getLineProductDescription = (line) => {
    if (line.productDescription !== undefined && line.productDescription !== null) return line.productDescription
    const product = products.find(p => p.nr === line.productNr)
    return product?.description ?? ''
  }

  const removeLine = (id) => {
    setLines(prev => prev.filter(l => l.id !== id))
  }

  const calculateLinePrice = (line) => {
    const price = line.quantity * line.unitPrice
    const discountAmount = price * (line.discount / 100)
    return price - discountAmount
  }

  const subtotal = lines.reduce((sum, line) => sum + calculateLinePrice(line), 0)
  const vat = subtotal * 0.25
  const total = subtotal + vat

  const saveInvoice = async (status = 'draft') => {
    setSaving(true)
    try {
      await api.post('/invoices', {
        taskId: task.id,
        lines,
        subtotal,
        vat,
        total,
        status
      })
      alert(status === 'ready' ? '✅ Faktura markeret klar til fakturering!' : '✅ Faktura gemt som kladde!')
      loadData()
    } catch (err) {
      alert('Fejl: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="border rounded-lg mt-4">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Receipt className="w-5 h-5" style={{ color: BRAND_BLUE }} />
          <span className="font-medium">Fakturering</span>
          {invoice && <Badge className="bg-gray-100 text-gray-600">{invoice.status === 'draft' ? 'Kladde' : invoice.status === 'ready' ? 'Klar' : invoice.status}</Badge>}
        </div>
        {expanded ? <ChevronDown className="w-5 h-5 text-gray-400" /> : <ChevronRight className="w-5 h-5 text-gray-400" />}
      </button>
      
      {expanded && (
        <div className="p-4 pt-0 border-t">
          {loading ? (
            <div className="flex justify-center py-4"><Loader2 className="w-6 h-6 animate-spin" /></div>
          ) : (
            <>
              {/* Invoice Lines Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="p-2 text-left">Ydelse</th>
                      <th className="p-2 text-right w-20">Antal</th>
                      <th className="p-2 text-left w-20">Enhed</th>
                      <th className="p-2 text-right w-28">Stk. pris</th>
                      <th className="p-2 text-right w-20">Rabat %</th>
                      <th className="p-2 text-right w-28">Pris</th>
                      <th className="p-2 w-10"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {lines.map((line) => {
                      const desc = getLineProductDescription(line)
                      const isDescExpanded = expandedLineId === line.id
                      return (
                        <React.Fragment key={line.id}>
                          <tr className="border-b">
                            <td className="p-2">
                              <Select value={line.productNr || ''} onValueChange={(v) => updateLine(line.id, 'productNr', v)}>
                                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Vælg ydelse..." /></SelectTrigger>
                                <SelectContent>
                                  {products.map(p => <SelectItem key={p.nr} value={p.nr}>{p.nr} - {p.name}</SelectItem>)}
                                </SelectContent>
                              </Select>
                            </td>
                            <td className="p-2"><Input type="number" className="h-8 w-16 text-right" value={line.quantity} onChange={(e) => updateLine(line.id, 'quantity', parseFloat(e.target.value) || 0)} /></td>
                            <td className="p-2"><Input className="h-8 w-16" value={line.unit} onChange={(e) => updateLine(line.id, 'unit', e.target.value)} /></td>
                            <td className="p-2"><Input type="number" className="h-8 w-24 text-right" value={line.unitPrice} onChange={(e) => updateLine(line.id, 'unitPrice', parseFloat(e.target.value) || 0)} /></td>
                            <td className="p-2"><Input type="number" className="h-8 w-16 text-right" value={line.discount} onChange={(e) => updateLine(line.id, 'discount', parseFloat(e.target.value) || 0)} /></td>
                            <td className="p-2 text-right font-medium">{calculateLinePrice(line).toLocaleString('da-DK', { minimumFractionDigits: 2 })}</td>
                            <td className="p-2"><Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeLine(line.id)}><Trash2 className="w-4 h-4 text-red-500" /></Button></td>
                          </tr>
                          <tr className="border-b bg-gray-50/50">
                            <td colSpan={7} className="p-2">
                              <button
                                type="button"
                                onClick={() => setExpandedLineId(isDescExpanded ? null : line.id)}
                                className="flex items-center gap-2 text-left w-full text-gray-600 hover:text-gray-900 text-xs"
                              >
                                {isDescExpanded ? <ChevronDown className="w-4 h-4 flex-shrink-0" /> : <ChevronRight className="w-4 h-4 flex-shrink-0" />}
                                <span className="font-medium">Beskrivelse</span>
                              </button>
                              {isDescExpanded && (
                                <div className="mt-2 text-gray-700 text-sm whitespace-pre-wrap border-l-2 border-gray-200 pl-4 ml-2">
                                  {desc || <span className="text-gray-400 italic">Ingen beskrivelse angivet for denne ydelse</span>}
                                </div>
                              )}
                            </td>
                          </tr>
                        </React.Fragment>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              
              <Button variant="outline" size="sm" onClick={addLine} className="mt-2">
                <Plus className="w-4 h-4 mr-1" />Opret ny linje
              </Button>

              {/* Totals */}
              <div className="mt-4 pt-4 border-t">
                <div className="flex justify-end">
                  <div className="w-64 space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Subtotal</span>
                      <span className="font-medium">{subtotal.toLocaleString('da-DK', { minimumFractionDigits: 2 })} kr</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Moms (25,00%)</span>
                      <span className="font-medium">{vat.toLocaleString('da-DK', { minimumFractionDigits: 2 })} kr</span>
                    </div>
                    <div className="flex justify-between text-lg font-bold border-t pt-2">
                      <span>Total DKK</span>
                      <span>{total.toLocaleString('da-DK', { minimumFractionDigits: 2 })} kr</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 mt-4">
                <Button variant="outline" onClick={() => saveInvoice('draft')} disabled={saving}>
                  {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                  Gem faktura kladde
                </Button>
                <Button onClick={() => saveInvoice('ready')} disabled={saving} className="text-white" style={{ backgroundColor: BRAND_BLUE }}>
                  {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                  Klar til fakturering
                </Button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}

export default TaskInvoiceSection
