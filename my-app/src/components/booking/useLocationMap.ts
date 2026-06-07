import { useEffect, useRef } from 'react'
import type { Dispatch, SetStateAction } from 'react'
import { logger } from '../../utils/logger'
import type { LocationFormData } from './AddLocationForm'

/**
 * Encapsulates the Google Maps wiring for the booking modal's "add location"
 * form: it owns the map/marker/autocomplete refs, (re)initialises the map when
 * the form opens, and pushes picked coordinates + reverse-geocoded address parts
 * back into `locationFormData`. Returns the DOM refs the form renders into.
 *
 * Behaviour is unchanged from the previous inline implementation in BookingModal.
 */
export const useLocationMap = (
  showAddLocationForm: boolean,
  setLocationFormData: Dispatch<SetStateAction<LocationFormData>>,
) => {
  const mapRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const mapInstanceRef = useRef<google.maps.Map | null>(null)
  const markerRef = useRef<google.maps.Marker | null>(null)
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null)

  // Initialize Google Maps when location form is shown
  useEffect(() => {
    if (showAddLocationForm && mapRef.current && !mapInstanceRef.current) {
      setTimeout(() => {
        initializeLocationMap()
      }, 100)
    }

    // Only cleanup when form is actually closed
    if (!showAddLocationForm) {
      if (markerRef.current) {
        markerRef.current.setMap(null)
        markerRef.current = null
      }
      mapInstanceRef.current = null
      autocompleteRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showAddLocationForm])

  const initializeLocationMap = () => {
    if (!mapRef.current || typeof google === 'undefined' || !google.maps) {
      logger.debug('Google Maps not ready')
      return
    }

    logger.debug('Initializing location map and search...')

    const LEBANON_CENTER = { lat: 33.8547, lng: 35.8623 }

    // Try to get user's current location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const userLocation = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          }
          logger.debug('Got user location:', userLocation)
          setLocationFormData(prev => ({
            ...prev,
            latitude: userLocation.lat,
            longitude: userLocation.lng
          }))
          createLocationMap(userLocation)
        },
        (error) => {
          logger.debug('Geolocation error:', error)
          createLocationMap(LEBANON_CENTER)
        }
      )
    } else {
      logger.debug('Geolocation not supported')
      createLocationMap(LEBANON_CENTER)
    }
  }

  const createLocationMap = (center: { lat: number; lng: number }) => {
    if (!mapRef.current) return

    logger.debug('Creating map at:', center)

    const map = new google.maps.Map(mapRef.current, {
      center: center,
      zoom: 13,
      mapTypeControl: true,
      streetViewControl: false,
      fullscreenControl: false
    })

    mapInstanceRef.current = map

    const marker = new google.maps.Marker({
      position: center,
      map: map,
      draggable: true,
      title: 'Selected Location'
    })

    markerRef.current = marker

    // Click event on map
    map.addListener('click', (e: google.maps.MapMouseEvent) => {
      if (e.latLng) {
        const lat = e.latLng.lat()
        const lng = e.latLng.lng()
        marker.setPosition({ lat, lng })
        setLocationFormData(prev => ({ ...prev, latitude: lat, longitude: lng }))
        reverseGeocodeLocation(lat, lng)
      }
    })

    // Drag event on marker
    marker.addListener('dragend', () => {
      const position = marker.getPosition()
      if (position) {
        const lat = position.lat()
        const lng = position.lng()
        setLocationFormData(prev => ({ ...prev, latitude: lat, longitude: lng }))
        reverseGeocodeLocation(lat, lng)
      }
    })

    // Initialize search autocomplete
    if (searchInputRef.current && !autocompleteRef.current) {
      logger.debug('Initializing autocomplete on search input')

      const autocomplete = new google.maps.places.Autocomplete(searchInputRef.current, {
        componentRestrictions: { country: 'lb' },
        fields: ['address_components', 'geometry', 'formatted_address', 'name']
      })

      autocomplete.bindTo('bounds', map)
      autocompleteRef.current = autocomplete

      autocomplete.addListener('place_changed', () => {
        const place = autocomplete.getPlace()

        if (!place.geometry || !place.geometry.location) {
          logger.debug('No geometry found for place')
          return
        }

        const lat = place.geometry.location.lat()
        const lng = place.geometry.location.lng()

        logger.debug('Place selected:', place.name, lat, lng)

        marker.setPosition({ lat, lng })
        map.setCenter({ lat, lng })
        map.setZoom(17)

        setLocationFormData(prev => ({ ...prev, latitude: lat, longitude: lng }))

        if (place.address_components) {
          let street = ''
          let area = ''
          let city = ''

          place.address_components.forEach(component => {
            if (component.types.includes('route')) {
              street = component.long_name
            }
            if (component.types.includes('administrative_area_level_2')) {
              area = component.long_name
            }
            if (component.types.includes('locality')) {
              city = component.long_name
            }
          })

          setLocationFormData(prev => ({
            ...prev,
            street_name: street || prev.street_name,
            area: area || prev.area,
            city: city || prev.city
          }))
        }
      })
    }
  }

  const reverseGeocodeLocation = (lat: number, lng: number) => {
    if (typeof google === 'undefined' || !google.maps) return

    const geocoder = new google.maps.Geocoder()
    geocoder.geocode({ location: { lat, lng } }, (results, status) => {
      if (status === 'OK' && results && results[0]) {
        const addressComponents = results[0].address_components
        let street = ''
        let area = ''
        let city = ''

        addressComponents.forEach(component => {
          if (component.types.includes('route')) {
            street = component.long_name
          }
          if (component.types.includes('administrative_area_level_2')) {
            area = component.long_name
          }
          if (component.types.includes('locality')) {
            city = component.long_name
          }
        })

        setLocationFormData(prev => ({
          ...prev,
          street_name: street || prev.street_name,
          area: area || prev.area,
          city: city || prev.city
        }))
      }
    })
  }

  return { mapRef, searchInputRef }
}
