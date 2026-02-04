'use client'

import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

const BRAND_BLUE = '#0133ff'

// Status to color mapping
const getMarkerColor = (status) => {
  switch(status) {
    case 'awaiting_confirmation': return '#f97316' // orange
    case 'under_planning': return '#3b82f6' // blue
    case 'planned': return '#22c55e' // green
    case 'completed': return '#10b981' // emerald
    case 'cancelled': return '#ef4444' // red
    default: return '#6b7280' // gray
  }
}

// Create custom SVG icon
const createIcon = (color, isSelected = false) => {
  const size = isSelected ? 32 : 24
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="${color}" stroke="white" stroke-width="2">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
      <circle cx="12" cy="10" r="3" fill="white"></circle>
    </svg>
  `
  return L.divIcon({
    html: svg,
    className: 'custom-marker',
    iconSize: [size, size],
    iconAnchor: [size/2, size],
    popupAnchor: [0, -size]
  })
}

export default function LeafletMap({ tasks, selectedTask, onTaskSelect, height = '540px' }) {
  const mapContainerRef = useRef(null)
  const mapRef = useRef(null)
  const markersRef = useRef({})
  const [isReady, setIsReady] = useState(false)

  // Initialize map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return
    
    // Create map centered on Denmark
    const map = L.map(mapContainerRef.current, {
      center: [55.9, 10.2],
      zoom: 7,
      zoomControl: true
    })
    
    // Add OpenStreetMap tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    }).addTo(map)
    
    mapRef.current = map
    setIsReady(true)
    
    return () => {
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
      }
    }
  }, [])

  // Update markers when tasks change
  useEffect(() => {
    if (!mapRef.current || !isReady) return
    
    const map = mapRef.current
    
    // Clear existing markers
    Object.values(markersRef.current).forEach(marker => {
      map.removeLayer(marker)
    })
    markersRef.current = {}
    
    // Add markers for tasks
    const bounds = []
    
    tasks.forEach(task => {
      // Use geocoded coordinates if available, otherwise generate pseudo-random coordinates in Denmark
      let lat = task.latitude
      let lng = task.longitude
      
      if (!lat || !lng) {
        // Generate consistent pseudo-random coordinates based on task ID
        const hash = task.id?.split('').reduce((a, b) => { 
          a = ((a << 5) - a) + b.charCodeAt(0); 
          return a & a 
        }, 0) || Math.random() * 10000
        lat = 54.5 + (Math.abs(hash % 1000) / 1000) * 3.0
        lng = 8.0 + (Math.abs((hash * 7) % 1000) / 1000) * 4.5
      }
      
      const isSelected = selectedTask?.id === task.id
      const icon = createIcon(getMarkerColor(task.status), isSelected)
      
      const marker = L.marker([lat, lng], { icon })
        .addTo(map)
        .bindPopup(`
          <div style="min-width: 180px; padding: 4px;">
            <div style="font-weight: bold; color: ${BRAND_BLUE};">#${task.taskNumber}</div>
            <div style="margin-top: 4px;">${task.address}</div>
            <div style="color: #666; font-size: 12px;">${task.postalCode} ${task.city}</div>
            ${task.companyName ? `<div style="color: ${BRAND_BLUE}; margin-top: 4px; font-size: 12px;">${task.companyName}</div>` : ''}
          </div>
        `)
      
      marker.on('click', () => {
        if (onTaskSelect) {
          onTaskSelect(task)
        }
      })
      
      markersRef.current[task.id] = marker
      bounds.push([lat, lng])
    })
    
    // Fit map to show all markers
    if (bounds.length > 0) {
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 10 })
    }
  }, [tasks, isReady])

  // Update selected marker icon
  useEffect(() => {
    if (!mapRef.current || !isReady) return
    
    Object.entries(markersRef.current).forEach(([taskId, marker]) => {
      const task = tasks.find(t => t.id === taskId)
      if (task) {
        const isSelected = selectedTask?.id === taskId
        const icon = createIcon(getMarkerColor(task.status), isSelected)
        marker.setIcon(icon)
        
        // Open popup for selected task
        if (isSelected) {
          marker.openPopup()
        }
      }
    })
  }, [selectedTask, tasks, isReady])

  // Resize handler for fullscreen
  useEffect(() => {
    if (!mapRef.current) return
    
    const handleResize = () => {
      setTimeout(() => {
        mapRef.current?.invalidateSize()
      }, 100)
    }
    
    window.addEventListener('resize', handleResize)
    document.addEventListener('fullscreenchange', handleResize)
    
    return () => {
      window.removeEventListener('resize', handleResize)
      document.removeEventListener('fullscreenchange', handleResize)
    }
  }, [])

  return (
    <div 
      ref={mapContainerRef}
      style={{ height, width: '100%' }}
      className="rounded-lg"
    />
  )
}
