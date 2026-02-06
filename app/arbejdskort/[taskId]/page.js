'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import WorkOrderTemplate from '@/components/WorkOrderTemplate'
import { Loader2, Printer, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

// API helper
const api = {
  get: async (url) => {
    const res = await fetch(`/api${url}`)
    if (!res.ok) throw new Error('API error')
    return res.json()
  }
}

// Helper: Get weekday name in Danish
function getWeekday(date) {
  if (!date) return ''
  const weekdays = ['Søn', 'Man', 'Tirs', 'Ons', 'Tors', 'Fre', 'Lør']
  return weekdays[new Date(date).getDay()]
}

// Helper: Format date to DD/MM/YYYY
function formatDate(date) {
  if (!date) return '-'
  const d = new Date(date)
  const day = String(d.getDate()).padStart(2, '0')
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const year = d.getFullYear()
  return `${day}/${month}/${year}`
}

// Helper: Map weather type
function mapWeather(weatherType) {
  switch(weatherType) {
    case 'rain': return 'rain'
    case 'sun': return 'sun'
    case 'both': return 'combined'
    default: return 'sun'
  }
}

// Helper: Get building part label
function getBuildingPartLabel(value, options) {
  const part = options?.buildingParts?.find(p => p.value === value)
  return part?.label || value || '-'
}

// Helper: Get location label
function getLocationLabel(value, options) {
  const loc = options?.locations?.find(l => l.value === value)
  return loc?.label || value || '-'
}

// Helper: Get color label
function getColorLabel(value, options) {
  const col = options?.colors?.find(c => c.value === value)
  return col?.label || value || '-'
}

// Helper: Build photos for WorkOrderTemplate (images + damage FØR/EFTER/AFSTAND)
function buildPhotosForWorkOrder(task, options, getBuildingPartLabel) {
  const list = []
  const fromFiles = (task.images || task.files?.filter(f => f.type === 'image') || []).map(img => ({
    url: img.url || img,
    caption: img.name || ''
  }))
  list.push(...fromFiles)
  const damages = task.damages || []
  damages.forEach((d, i) => {
    const prefix = getBuildingPartLabel ? getBuildingPartLabel(d.part, options) : (d.part || `Skade ${i + 1}`)
    if (d.photoBefore) list.push({ url: d.photoBefore, caption: `${prefix} – FØR` })
    if (d.photoAfter) list.push({ url: d.photoAfter, caption: `${prefix} – EFTER` })
    if (d.photoDistance) list.push({ url: d.photoDistance, caption: `${prefix} – AFSTAND` })
  })
  return list
}

// Helper: Build damages for WorkOrderTemplate with section support
function buildDamagesForWorkOrder(task, options, getBuildingPartLabel, getColorLabel, getLocationLabel) {
  const sections = task.damageSections?.length
    ? task.damageSections.filter(s => s.includeOnPrint !== false)
    : [{ id: 'main', name: 'Skader', includeOnPrint: true }]
  const damages = task.damages || []
  const result = []
  let number = 1
  for (const section of sections) {
    const sectionDamages = damages.filter(d => (d.sectionId || 'main') === section.id)
    const baseName = section.name.replace(/\s*skader\s*$/i, '').trim()
    const prefix = baseName ? baseName + ' ' : ''
    for (const d of sectionDamages) {
      result.push({
        number,
        sectionName: prefix || undefined,
        buildingPart: getBuildingPartLabel(d.part, options),
        quantity: `${d.quantity || 1} stk`,
        color: getColorLabel(d.color, options),
        location: getLocationLabel(d.location, options),
        notes: d.notes || ''
      })
      number++
    }
  }
  return result
}

export default function ArbejdskortPage() {
  const params = useParams()
  const taskId = params.taskId
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [workOrderData, setWorkOrderData] = useState(null)

  useEffect(() => {
    if (taskId) {
      loadWorkOrderData()
    }
  }, [taskId])

  const loadWorkOrderData = async () => {
    try {
      setLoading(true)
      const [task, options] = await Promise.all([
        api.get(`/tasks/${taskId}`),
        api.get('/options')
      ])

      if (!task) {
        setError('Opgave ikke fundet')
        return
      }

      // Map task data to WorkOrderTemplate format
      const data = {
        taskId: task.id,
        taskNumber: task.taskNumber || '000',
        companyName: task.companyName || '-',
        contactPerson: task.contactName || '-',
        address: `${task.address || ''}, ${task.postalCode || ''} ${task.city || ''}`.trim(),
        mobile: task.contactPhone || '-',
        bygherre1Name: task.owner1Name || '-',
        bygherre1Mobile: task.owner1Phone || '-',
        bygherre2Name: task.owner2Name || '',
        bygherre2Mobile: task.owner2Phone || '',
        deadline: formatDate(task.deadline),
        deliveryDate: formatDate(task.deliveryDate),
        preDeliveryDate: formatDate(task.preDeliveryDate),
        emptyHouse: task.isHouseEmpty || false,
        plannedExecutionWeekday: getWeekday(task.plannedDate),
        plannedExecution: formatDate(task.plannedDate),
        estimatedTime: task.estimatedTime ? `${task.estimatedTime} timer` : '-',
        taskType: task.taskType || '',
        categoryTypes: task.taskType ? [task.taskType] : [],
        weather: mapWeather(task.weatherType),
        damages: buildDamagesForWorkOrder(task, options, getBuildingPartLabel, getColorLabel, getLocationLabel),
        photos: buildPhotosForWorkOrder(task, options, getBuildingPartLabel),
        totalPages: 2,
        currentPage: 1
      }

      setWorkOrderData(data)
    } catch (err) {
      console.error('Error loading work order:', err)
      setError('Fejl ved indlæsning af arbejdskort')
    } finally {
      setLoading(false)
    }
  }

  const handlePrint = () => {
    window.print()
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Indlæser arbejdskort...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <p className="text-red-600 text-xl mb-4">{error}</p>
          <Link href="/" className="text-blue-600 hover:underline">
            Tilbage til forsiden
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100 py-8 print:py-0 print:bg-white">
      {/* Navigation - hidden when printing */}
      <div className="max-w-[210mm] mx-auto mb-4 px-4 print:hidden">
        <div className="flex items-center justify-between">
          <Link 
            href="/"
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="w-5 h-5" />
            Tilbage
          </Link>
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg shadow-lg hover:bg-blue-700 transition-colors"
          >
            <Printer className="w-5 h-5" />
            Print / Download PDF
          </button>
        </div>
      </div>

      {/* Work Order Template */}
      <WorkOrderTemplate 
        data={workOrderData}
        logoUrl="/smartrep-logo.png"
      />

      {/* Print button - fixed position, hidden when printing */}
      <button
        onClick={handlePrint}
        className="fixed bottom-8 right-8 bg-blue-600 text-white px-6 py-3 rounded-lg shadow-lg hover:bg-blue-700 transition-colors print:hidden flex items-center gap-2"
      >
        <Printer className="w-5 h-5" />
        Print
      </button>
    </div>
  )
}
