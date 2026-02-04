'use client'

import { useState, useEffect, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Pencil, Loader2, Search, Save, ChevronDown, ChevronRight } from 'lucide-react'
import { api, BRAND_BLUE } from '@/lib/constants'

export default function PriceListView() {
  const [products, setProducts] = useState([])
  const [companies, setCompanies] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedCompany, setSelectedCompany] = useState(null)
  const [customerPricing, setCustomerPricing] = useState(null)
  const [editMode, setEditMode] = useState(false)
  const [productEditMode, setProductEditMode] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [savingProductId, setSavingProductId] = useState(null)
  const [editProduct, setEditProduct] = useState(null)
  const [expandedDescriptionId, setExpandedDescriptionId] = useState(null)

  const loadData = async () => {
    try {
      const [productsData, companiesData] = await Promise.all([
        api.get('/products'),
        api.get('/companies')
      ])
      setProducts(productsData)
      setCompanies(companiesData)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadData() }, [])

  const loadCustomerPricing = async (companyId) => {
    try {
      const pricing = await api.get(`/customer-pricing/${companyId}`)
      setCustomerPricing(pricing)
    } catch (err) {
      console.error(err)
    }
  }

  const handleCompanySelect = (companyId) => {
    setSelectedCompany(companyId)
    if (companyId) {
      loadCustomerPricing(companyId)
    } else {
      setCustomerPricing(null)
    }
  }

  const saveCustomerPricing = async () => {
    try {
      await api.put(`/customer-pricing/${selectedCompany}`, customerPricing)
      alert('✅ Kundepriser gemt!')
      setEditMode(false)
    } catch (err) {
      alert('Fejl ved gem: ' + err.message)
    }
  }

  const updateDiscount = (value) => {
    setCustomerPricing(prev => ({ ...prev, discountPercent: parseFloat(value) || 0 }))
  }

  const updateCustomPrice = (productNr, price) => {
    setCustomerPricing(prev => ({
      ...prev,
      customPrices: { ...prev.customPrices, [productNr]: parseFloat(price) || 0 }
    }))
  }

  const getEffectivePrice = (product) => {
    if (customerPricing?.customPrices?.[product.nr]) {
      return customerPricing.customPrices[product.nr]
    }
    if (customerPricing?.discountPercent) {
      return product.price * (1 - customerPricing.discountPercent / 100)
    }
    return product.price
  }

  const filteredProducts = useMemo(() => {
    if (!searchTerm.trim()) return products
    const q = searchTerm.trim().toLowerCase()
    return products.filter(
      (p) =>
        (p.nr || '').toLowerCase().includes(q) ||
        (p.name || '').toLowerCase().includes(q) ||
        (p.description || '').toLowerCase().includes(q)
    )
  }, [products, searchTerm])

  const saveProduct = async (product) => {
    setSavingProductId(product.id)
    try {
      await api.put(`/products/${product.id}`, {
        nr: product.nr,
        name: product.name,
        description: product.description ?? '',
        unit: product.unit || 'stk',
        price: product.price,
        group: product.group
      })
      setProducts((prev) => prev.map((p) => (p.id === product.id ? { ...p, ...product } : p)))
      setEditProduct(null)
    } catch (err) {
      alert('Fejl ved gem: ' + err.message)
    } finally {
      setSavingProductId(null)
    }
  }

  const startEditProduct = (product) => {
    setEditProduct({ ...product })
  }

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin" style={{ color: BRAND_BLUE }} /></div>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Prisliste</h2>
          <p className="text-gray-500">Administrer ydelser og kundespecifikke priser</p>
        </div>
      </div>

      {/* Customer Pricing Selector */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Kundespecifikke priser</CardTitle>
          <CardDescription>Vælg en kunde for at se/redigere deres priser (STA10-STA53)</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-4">
            <div className="flex-1">
              <Label>Vælg kunde</Label>
              <Select value={selectedCompany || 'none'} onValueChange={(v) => handleCompanySelect(v === 'none' ? null : v)}>
                <SelectTrigger><SelectValue placeholder="Vælg kunde..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Ingen (Standard priser)</SelectItem>
                  {companies.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {selectedCompany && customerPricing && (
              <>
                <div className="w-48">
                  <Label>Fast rabat (%)</Label>
                  <Input 
                    type="number" 
                    value={customerPricing.discountPercent || 0} 
                    onChange={(e) => updateDiscount(e.target.value)}
                    disabled={!editMode}
                  />
                </div>
                {editMode ? (
                  <Button onClick={saveCustomerPricing} className="text-white" style={{ backgroundColor: BRAND_BLUE }}>
                    Gem priser
                  </Button>
                ) : (
                  <Button onClick={() => setEditMode(true)} variant="outline">
                    <Pencil className="w-4 h-4 mr-2" />Rediger
                  </Button>
                )}
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Products Table */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Søg på vare #, ydelse eller beskrivelse..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            {!productEditMode ? (
              <Button onClick={() => setProductEditMode(true)} variant="outline">
                <Pencil className="w-4 h-4 mr-2" />Rediger ydelser
              </Button>
            ) : (
              <Button onClick={() => { setProductEditMode(false); setEditProduct(null); }} variant="outline">
                Luk redigering
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left p-3 font-medium text-gray-600">Vare #</th>
                <th className="text-left p-3 font-medium text-gray-600 min-w-[220px] w-[28%]">Ydelse</th>
                <th className="text-left p-3 font-medium text-gray-600 min-w-[220px] w-[28%]">Beskrivelse</th>
                <th className="text-left p-3 font-medium text-gray-600 w-20">Enhed</th>
                <th className="text-right p-3 font-medium text-gray-600">Standard pris</th>
                {selectedCompany && <th className="text-right p-3 font-medium text-gray-600">Kundepris</th>}
                {productEditMode && <th className="p-3 w-24"></th>}
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map((product) => {
                const isEditing = editProduct?.id === product.id
                const rowProduct = isEditing ? editProduct : product
                return (
                  <tr key={product.id} className="border-b hover:bg-gray-50">
                    <td className="p-3 font-mono text-sm">{product.nr}</td>
                    <td className="p-3 min-w-[220px] w-[28%]">
                      {productEditMode && isEditing ? (
                        <Input
                          value={rowProduct.name}
                          onChange={(e) => setEditProduct((p) => (p ? { ...p, name: e.target.value } : null))}
                          className="text-sm w-full"
                        />
                      ) : (
                        rowProduct.name
                      )}
                    </td>
                    <td className="p-3 min-w-[220px] w-[28%] align-top">
                      {productEditMode && isEditing ? (
                        <Textarea
                          value={rowProduct.description ?? ''}
                          onChange={(e) => setEditProduct((p) => (p ? { ...p, description: e.target.value } : null))}
                          placeholder="Farver, lokation mv."
                          rows={3}
                          className="text-sm resize-none w-full min-h-[80px]"
                        />
                      ) : (
                        <div>
                          <button
                            type="button"
                            onClick={() => setExpandedDescriptionId((id) => (id === product.id ? null : product.id))}
                            className="flex items-center gap-2 text-left w-full text-gray-600 hover:text-gray-900 text-sm"
                          >
                            {expandedDescriptionId === product.id ? (
                              <ChevronDown className="w-4 h-4 flex-shrink-0" />
                            ) : (
                              <ChevronRight className="w-4 h-4 flex-shrink-0" />
                            )}
                            <span className="font-medium">Beskrivelse</span>
                          </button>
                          {expandedDescriptionId === product.id && (
                            <div className="mt-2 text-gray-600 text-sm whitespace-pre-wrap border-l-2 border-gray-200 pl-3 ml-1">
                              {rowProduct.description || <span className="text-gray-400 italic">Ingen beskrivelse</span>}
                            </div>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="p-3">
                      {productEditMode && isEditing ? (
                        <Input
                          value={rowProduct.unit || 'stk'}
                          onChange={(e) => setEditProduct((p) => (p ? { ...p, unit: e.target.value } : null))}
                          className="w-20 text-sm"
                        />
                      ) : (
                        <span className="text-gray-500">{rowProduct.unit || 'stk'}</span>
                      )}
                    </td>
                    <td className="p-3 text-right">
                      {productEditMode && isEditing ? (
                        <Input
                          type="number"
                          value={rowProduct.price ?? ''}
                          onChange={(e) => setEditProduct((p) => (p ? { ...p, price: parseFloat(e.target.value) || 0 } : null))}
                          className="w-28 text-right ml-auto text-sm"
                        />
                      ) : (
                        <span className="font-medium">{rowProduct.price?.toLocaleString('da-DK', { minimumFractionDigits: 2 })} kr</span>
                      )}
                    </td>
                    {selectedCompany && (
                      <td className="p-3 text-right">
                        {!isEditing && product.customerPricingEnabled && editMode ? (
                          <Input
                            type="number"
                            className="w-28 text-right ml-auto text-sm"
                            value={customerPricing?.customPrices?.[product.nr] || ''}
                            placeholder={getEffectivePrice(product).toFixed(2)}
                            onChange={(e) => updateCustomPrice(product.nr, e.target.value)}
                          />
                        ) : !isEditing ? (
                          <span className={customerPricing?.customPrices?.[product.nr] ? 'text-green-600 font-medium text-sm' : 'text-sm'}>
                            {getEffectivePrice(product).toLocaleString('da-DK', { minimumFractionDigits: 2 })} kr
                          </span>
                        ) : null}
                      </td>
                    )}
                    {productEditMode && (
                      <td className="p-3">
                        {isEditing ? (
                          <Button
                            size="sm"
                            onClick={() => saveProduct(editProduct)}
                            disabled={savingProductId === product.id}
                            className="text-white"
                            style={{ backgroundColor: BRAND_BLUE }}
                          >
                            {savingProductId === product.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                          </Button>
                        ) : (
                          <Button size="sm" variant="ghost" onClick={() => startEditProduct(product)}>
                            <Pencil className="w-4 h-4" />
                          </Button>
                        )}
                      </td>
                    )}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  )
}