// Google Maps service for distance and duration calculations

const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY

// Haversine distance formula as fallback
function calculateHaversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371 // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
  return R * c
}

// Estimate driving time based on distance (rough approximation)
function estimateDrivingTime(distanceKm) {
  // Assume average speed of 50 km/h in urban areas
  const avgSpeedKmh = 50
  const timeHours = distanceKm / avgSpeedKmh
  return Math.round(timeHours * 60) // Return minutes
}

// Get coordinates from address using Google Geocoding API
async function getCoordinatesFromAddress(address) {
  if (!GOOGLE_MAPS_API_KEY) {
    console.warn('Google Maps API key not configured')
    return null
  }

  try {
    const encodedAddress = encodeURIComponent(address + ', Denmark')
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${encodedAddress}&key=${GOOGLE_MAPS_API_KEY}`
    )
    
    if (!response.ok) {
      throw new Error('Geocoding request failed')
    }
    
    const data = await response.json()
    
    if (data.status === 'OK' && data.results.length > 0) {
      const location = data.results[0].geometry.location
      return {
        lat: location.lat,
        lng: location.lng
      }
    }
    
    return null
  } catch (error) {
    console.error('Error geocoding address:', error)
    return null
  }
}

// Calculate distance and duration between two addresses
export async function calculateDistanceAndDuration(fromAddress, toAddress) {
  if (!GOOGLE_MAPS_API_KEY) {
    console.warn('Google Maps API key not configured, using fallback calculation')
    
    // Try to get coordinates for both addresses
    const [fromCoords, toCoords] = await Promise.all([
      getCoordinatesFromAddress(fromAddress),
      getCoordinatesFromAddress(toAddress)
    ])
    
    if (fromCoords && toCoords) {
      const distance = calculateHaversineDistance(
        fromCoords.lat, fromCoords.lng,
        toCoords.lat, toCoords.lng
      )
      const duration = estimateDrivingTime(distance)
      
      return {
        distance: Math.round(distance),
        duration: duration,
        status: 'fallback'
      }
    }
    
    // Ultimate fallback - rough estimates based on postal codes
    return {
      distance: 25, // Default 25km
      duration: 30, // Default 30 minutes
      status: 'estimate'
    }
  }

  try {
    const encodedFrom = encodeURIComponent(fromAddress + ', Denmark')
    const encodedTo = encodeURIComponent(toAddress + ', Denmark')
    
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${encodedFrom}&destinations=${encodedTo}&units=metric&key=${GOOGLE_MAPS_API_KEY}`
    )
    
    if (!response.ok) {
      throw new Error('Distance Matrix request failed')
    }
    
    const data = await response.json()
    
    if (data.status === 'OK' && data.rows[0]?.elements[0]?.status === 'OK') {
      const element = data.rows[0].elements[0]
      
      return {
        distance: Math.round(element.distance.value / 1000), // Convert meters to km
        duration: Math.round(element.duration.value / 60), // Convert seconds to minutes
        status: 'google'
      }
    }
    
    // Fallback to haversine if Google fails
    const [fromCoords, toCoords] = await Promise.all([
      getCoordinatesFromAddress(fromAddress),
      getCoordinatesFromAddress(toAddress)
    ])
    
    if (fromCoords && toCoords) {
      const distance = calculateHaversineDistance(
        fromCoords.lat, fromCoords.lng,
        toCoords.lat, toCoords.lng
      )
      const duration = estimateDrivingTime(distance)
      
      return {
        distance: Math.round(distance),
        duration: duration,
        status: 'fallback'
      }
    }
    
    throw new Error('Could not calculate distance')
    
  } catch (error) {
    console.error('Error calculating distance:', error)
    
    // Ultimate fallback
    return {
      distance: 25,
      duration: 30,
      status: 'estimate'
    }
  }
}

// Calculate travel info for a day's tasks
export async function calculateTravelInfoForDay(tasks, technicianAddress) {
  if (!tasks || tasks.length === 0) return []
  
  const sortedTasks = [...tasks].sort((a, b) => new Date(a.plannedDate) - new Date(b.plannedDate))
  const travelInfo = []
  
  // From home to first task
  if (sortedTasks.length > 0) {
    const firstTask = sortedTasks[0]
    const firstTaskAddress = `${firstTask.address}, ${firstTask.postalCode} ${firstTask.city}`
    
    try {
      const travel = await calculateDistanceAndDuration(technicianAddress, firstTaskAddress)
      travelInfo.push({
        type: 'travel',
        from: 'home',
        to: firstTask.id,
        distance: travel.distance,
        duration: travel.duration,
        startTime: new Date(new Date(firstTask.plannedDate).getTime() - travel.duration * 60 * 1000)
      })
    } catch (err) {
      console.error('Error calculating travel to first task:', err)
    }
  }
  
  // Between tasks
  for (let i = 0; i < sortedTasks.length - 1; i++) {
    const currentTask = sortedTasks[i]
    const nextTask = sortedTasks[i + 1]
    
    const currentAddress = `${currentTask.address}, ${currentTask.postalCode} ${currentTask.city}`
    const nextAddress = `${nextTask.address}, ${nextTask.postalCode} ${nextTask.city}`
    
    try {
      const travel = await calculateDistanceAndDuration(currentAddress, nextAddress)
      travelInfo.push({
        type: 'travel',
        from: currentTask.id,
        to: nextTask.id,
        distance: travel.distance,
        duration: travel.duration,
        startTime: new Date(new Date(currentTask.plannedDate).getTime() + 2 * 60 * 60 * 1000) // After 2h task
      })
    } catch (err) {
      console.error(`Error calculating travel between tasks ${i} and ${i+1}:`, err)
    }
  }
  
  // From last task to home
  if (sortedTasks.length > 0) {
    const lastTask = sortedTasks[sortedTasks.length - 1]
    const lastTaskAddress = `${lastTask.address}, ${lastTask.postalCode} ${lastTask.city}`
    
    try {
      const travel = await calculateDistanceAndDuration(lastTaskAddress, technicianAddress)
      travelInfo.push({
        type: 'travel',
        from: lastTask.id,
        to: 'home',
        distance: travel.distance,
        duration: travel.duration,
        startTime: new Date(new Date(lastTask.plannedDate).getTime() + 2 * 60 * 60 * 1000) // After 2h task
      })
    } catch (err) {
      console.error('Error calculating travel from last task:', err)
    }
  }
  
  return travelInfo
}