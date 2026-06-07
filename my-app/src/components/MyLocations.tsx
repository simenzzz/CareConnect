/// <reference types="@types/google.maps" />

import React, { useState, useEffect, useRef } from 'react';
import { logger } from '../utils/logger';
import locationService, { type Location } from '../services/locationService';
import './ManageEntities.css';

// Note: Add your Google Maps API key to the public/index.html file:
// <script src="https://maps.googleapis.com/maps/api/js?key=YOUR_API_KEY&libraries=places"></script>

const LEBANON_CENTER = { lat: 33.8547, lng: 35.8623 }; // Beirut coordinates

const MyLocations: React.FC = () => {
  const [locations, setLocations] = useState<Location[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Map and location state
  const mapRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markerRef = useRef<google.maps.Marker | null>(null);
  const [selectedCoords, setSelectedCoords] = useState<{lat: number, lng: number}>(LEBANON_CENTER);

  // Form state
  const [formData, setFormData] = useState({
    location_name: '',
    address_name: '',
    street_name: '',
    building_name: '',
    floor: '',
    address_line: '',
    area: '',
    city: '',
    postal_code: '',
    latitude: LEBANON_CENTER.lat,
    longitude: LEBANON_CENTER.lng,
    is_default: false
  });

  useEffect(() => {
    fetchLocations();
  }, []);

  // Initialize map when add/edit mode is activated
  useEffect(() => {
    if (isAdding || editingId !== null) {
      // Small delay to ensure DOM is ready
      setTimeout(() => {
        initializeMap();
      }, 100);
    }
  }, [isAdding, editingId]);

  const initializeMap = () => {
    if (!mapRef.current) {
      logger.debug('Map ref not available yet');
      return;
    }

    // Check if Google Maps is loaded
    if (typeof google === 'undefined' || !google.maps) {
      logger.warn('Google Maps not loaded. Please add the Google Maps script to your index.html');
      setError('Google Maps API not loaded. Please contact support.');
      return;
    }

    // If map already exists, don't reinitialize
    if (mapInstanceRef.current && editingId !== null) {
      // For editing, just update the marker position
      updateMapLocation(formData.latitude, formData.longitude);
      return;
    }

    logger.debug('Initializing Google Maps...');

    // Determine initial center
    let initialCenter = LEBANON_CENTER;
    if (editingId !== null) {
      // If editing, use the location's coordinates
      initialCenter = { lat: formData.latitude, lng: formData.longitude };
      createMap(initialCenter);
    } else {
      // If adding new, try to get user's current location
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const userLocation = {
              lat: position.coords.latitude,
              lng: position.coords.longitude
            };
            setSelectedCoords(userLocation);
            setFormData(prev => ({
              ...prev,
              latitude: userLocation.lat,
              longitude: userLocation.lng
            }));
            createMap(userLocation);
          },
          (error) => {
            logger.debug('Geolocation error:', error);
            createMap(LEBANON_CENTER);
          }
        );
      } else {
        createMap(LEBANON_CENTER);
      }
    }
  };

  const createMap = (center: {lat: number, lng: number}) => {
    if (!mapRef.current) return;

    const map = new google.maps.Map(mapRef.current, {
      center: center,
      zoom: 13,
      mapTypeControl: true,
      streetViewControl: false,
      fullscreenControl: false
    });

    mapInstanceRef.current = map;

    // Add marker
    const marker = new google.maps.Marker({
      position: center,
      map: map,
      draggable: true,
      title: 'Selected Location'
    });

    markerRef.current = marker;

    // Click event on map
    map.addListener('click', (e: google.maps.MapMouseEvent) => {
      if (e.latLng) {
        const lat = e.latLng.lat();
        const lng = e.latLng.lng();
        updateMapLocation(lat, lng);
        reverseGeocode(lat, lng);
      }
    });

    // Drag event on marker
    marker.addListener('dragend', () => {
      const position = marker.getPosition();
      if (position) {
        const lat = position.lat();
        const lng = position.lng();
        updateMapLocation(lat, lng);
        reverseGeocode(lat, lng);
      }
    });

    // Initialize search autocomplete
    if (searchInputRef.current && !autocompleteRef.current) {
      const autocomplete = new google.maps.places.Autocomplete(searchInputRef.current, {
        componentRestrictions: { country: 'lb' }, // Restrict to Lebanon
        fields: ['address_components', 'geometry', 'formatted_address', 'name']
      });

      autocomplete.bindTo('bounds', map);
      autocompleteRef.current = autocomplete;

      autocomplete.addListener('place_changed', () => {
        const place = autocomplete.getPlace();

        if (!place.geometry || !place.geometry.location) {
          return;
        }

        const lat = place.geometry.location.lat();
        const lng = place.geometry.location.lng();

        updateMapLocation(lat, lng);
        map.setCenter({ lat, lng });
        map.setZoom(17);

        // Parse address components
        if (place.address_components) {
          let street = '';
          let area = '';
          let city = '';

          place.address_components.forEach(component => {
            if (component.types.includes('route')) {
              street = component.long_name;
            }
            if (component.types.includes('administrative_area_level_2')) {
              area = component.long_name;
            }
            if (component.types.includes('locality')) {
              city = component.long_name;
            }
          });

          setFormData(prev => ({
            ...prev,
            address_line: place.formatted_address || prev.address_line,
            street_name: street || prev.street_name,
            area: area || prev.area,
            city: city || prev.city
          }));
        }
      });
    }
  };

  const updateMapLocation = (lat: number, lng: number) => {
    setSelectedCoords({ lat, lng });
    setFormData(prev => ({
      ...prev,
      latitude: lat,
      longitude: lng
    }));

    if (markerRef.current) {
      markerRef.current.setPosition({ lat, lng });
    }

    if (mapInstanceRef.current) {
      mapInstanceRef.current.panTo({ lat, lng });
    }
  };

  const reverseGeocode = (lat: number, lng: number) => {
    if (typeof google === 'undefined' || !google.maps) return;

    const geocoder = new google.maps.Geocoder();
    geocoder.geocode({ location: { lat, lng } }, (results, status) => {
      if (status === 'OK' && results && results[0]) {
        const addressComponents = results[0].address_components;
        let street = '';
        let area = '';
        let city = '';

        addressComponents.forEach(component => {
          if (component.types.includes('route')) {
            street = component.long_name;
          }
          if (component.types.includes('administrative_area_level_2')) {
            area = component.long_name;
          }
          if (component.types.includes('locality')) {
            city = component.long_name;
          }
        });

        setFormData(prev => ({
          ...prev,
          address_line: results[0].formatted_address,
          street_name: street || prev.street_name,
          area: area || prev.area,
          city: city || prev.city
        }));
      }
    });
  };

  const fetchLocations = async () => {
    setIsLoading(true);
    setError(null);
    
    const response = await locationService.getLocations();
    
    if (response.success && response.data) {
      setLocations(response.data);
    } else {
      setError(response.error || 'Failed to load locations');
    }
    
    setIsLoading(false);
  };

  const handleAddClick = () => {
    setIsAdding(true);
    setFormData({
      location_name: '',
      address_name: '',
      street_name: '',
      building_name: '',
      floor: '',
      address_line: '',
      area: '',
      city: '',
      postal_code: '',
      latitude: selectedCoords.lat,
      longitude: selectedCoords.lng,
      is_default: false
    });
    setSuccessMessage(null);
    setError(null);
  };

  const handleEditClick = (location: Location) => {
    setEditingId(location.id!);
    const lat = typeof location.latitude === 'number' ? location.latitude : parseFloat(String(location.latitude));
    const lng = typeof location.longitude === 'number' ? location.longitude : parseFloat(String(location.longitude));
    
    logger.debug('Editing location:', location);
    logger.debug('Parsed coordinates:', lat, lng);
    
    setFormData({
      location_name: location.location_name || '',
      address_name: location.address_name || '',
      street_name: location.street_name || '',
      building_name: location.building_name || '',
      floor: location.floor || '',
      address_line: location.address_line || '',
      area: location.area || '',
      city: location.city || '',
      postal_code: location.postal_code || '',
      latitude: isNaN(lat) ? LEBANON_CENTER.lat : lat,
      longitude: isNaN(lng) ? LEBANON_CENTER.lng : lng,
      is_default: location.is_default || false
    });
    setSuccessMessage(null);
    setError(null);
    
    if (!isNaN(lat) && !isNaN(lng)) {
      updateMapLocation(lat, lng);
    }
  };

  const handleCancel = () => {
    setIsAdding(false);
    setEditingId(null);
    setFormData({
      location_name: '',
      address_name: '',
      street_name: '',
      building_name: '',
      floor: '',
      address_line: '',
      area: '',
      city: '',
      postal_code: '',
      latitude: LEBANON_CENTER.lat,
      longitude: LEBANON_CENTER.lng,
      is_default: false
    });
    setError(null);
    
    // Clear map instances
    if (markerRef.current) {
      markerRef.current.setMap(null);
      markerRef.current = null;
    }
    mapInstanceRef.current = null;
    autocompleteRef.current = null;
  };

  const handleSave = async () => {
    if (!formData.location_name.trim() || !formData.area || !formData.city) {
      setError('Location name, area, and city are required');
      return;
    }

    setIsSaving(true);
    setError(null);
    setSuccessMessage(null);

    // Auto-generate address_line from other fields
    const addressParts = [
      formData.street_name,
      formData.building_name,
      formData.floor ? `Floor ${formData.floor}` : '',
      formData.area,
      formData.city
    ].filter(part => part && part.trim()).join(', ');

    const dataToSave = {
      ...formData,
      address_line: addressParts || `${formData.area}, ${formData.city}`
    };

    let response;
    if (isAdding) {
      response = await locationService.addLocation(dataToSave);
    } else if (editingId) {
      response = await locationService.updateLocation(editingId, dataToSave);
    }

    if (response && response.success) {
      await fetchLocations();
      setIsAdding(false);
      setEditingId(null);
      setFormData({
        location_name: '',
        address_name: '',
        street_name: '',
        building_name: '',
        floor: '',
        address_line: '',
        area: '',
        city: '',
        postal_code: '',
        latitude: LEBANON_CENTER.lat,
        longitude: LEBANON_CENTER.lng,
        is_default: false
      });
      setSuccessMessage(isAdding ? 'Location added successfully!' : 'Location updated successfully!');
      setTimeout(() => setSuccessMessage(null), 3000);
    } else {
      setError(response?.error || 'Failed to save location');
    }

    setIsSaving(false);
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this location?')) {
      return;
    }

    const response = await locationService.deleteLocation(id);

    if (response.success) {
      await fetchLocations();
      setSuccessMessage('Location deleted successfully!');
      setTimeout(() => setSuccessMessage(null), 3000);
    } else {
      setError(response.error || 'Failed to delete location');
    }
  };

  if (isLoading) {
    return (
      <div className="content-section">
        <div className="section-header">
          <h1>My Locations</h1>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="content-section">
      <div className="section-header">
        <h1>My Locations</h1>
        <p>Manage your saved locations in Lebanon</p>
      </div>

      {error && (
        <div className="general-error">
          <i className="fas fa-exclamation-circle"></i>
          {error}
        </div>
      )}

      {successMessage && (
        <div className="success-message">
          <i className="fas fa-check-circle"></i>
          {successMessage}
        </div>
      )}

      <div className="content-card">
        {!isAdding && !editingId && (
          <button className="add-section-btn" onClick={handleAddClick}>
            <i className="fas fa-plus-circle"></i>
            Add New Location
          </button>
        )}

        {/* Add/Edit Form */}
        {(isAdding || editingId) && (
          <div className="child-item">
            <div className="item-header">
              <h3 className="section-card-title">
                <i className="fas fa-map-marker-alt"></i>
                {isAdding ? 'Add New Location' : 'Edit Location'}
              </h3>
            </div>

            {/* Search Location */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, color: '#2c3e50' }}>
                <i className="fas fa-search" style={{ marginRight: '8px', color: '#667eea' }}></i>
                Search Location
              </label>
              <div className="input-group">
                <i className="fas fa-search"></i>
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Search for a location in Lebanon..."
                  style={{ width: '100%' }}
                />
              </div>
            </div>

            {/* Google Map */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, color: '#2c3e50' }}>
                <i className="fas fa-map" style={{ marginRight: '8px', color: '#e74c3c' }}></i>
                Select Location on Map
              </label>
              <div 
                ref={mapRef} 
                style={{ 
                  width: '100%', 
                  height: '350px', 
                  borderRadius: '10px',
                  border: '2px solid #ecf0f1',
                  marginBottom: '10px',
                  backgroundColor: '#f5f5f5',
                  position: 'relative',
                  overflow: 'hidden'
                }}
              />
              <p style={{ fontSize: '0.9rem', color: '#7f8c8d', marginTop: '8px' }}>
                <i className="fas fa-info-circle" style={{ marginRight: '5px' }}></i>
                Click on the map or drag the marker to select your location
              </p>
            </div>

            {/* Location Name */}
            <div className="input-group" style={{ marginBottom: '15px' }}>
              <i className="fas fa-tag"></i>
              <input
                type="text"
                value={formData.location_name}
                onChange={(e) => setFormData({...formData, location_name: e.target.value})}
                placeholder="Location Name (e.g., Home, Work, Office)"
                required
              />
            </div>

            {/* Address Name and Street Name */}
            <div className="form-row" style={{ marginBottom: '15px' }}>
              <div className="input-group">
                <i className="fas fa-map-signs"></i>
                <input
                  type="text"
                  value={formData.address_name}
                  onChange={(e) => setFormData({...formData, address_name: e.target.value})}
                  placeholder="Address Name (Optional)"
                />
              </div>

              <div className="input-group">
                <i className="fas fa-road"></i>
                <input
                  type="text"
                  value={formData.street_name}
                  onChange={(e) => setFormData({...formData, street_name: e.target.value})}
                  placeholder="Street Name"
                />
              </div>
            </div>

            {/* Building Name and Floor */}
            <div className="form-row" style={{ marginBottom: '15px' }}>
              <div className="input-group">
                <i className="fas fa-building"></i>
                <input
                  type="text"
                  value={formData.building_name}
                  onChange={(e) => setFormData({...formData, building_name: e.target.value})}
                  placeholder="Building Name (Optional)"
                />
              </div>

              <div className="input-group">
                <i className="fas fa-layer-group"></i>
                <input
                  type="text"
                  value={formData.floor}
                  onChange={(e) => setFormData({...formData, floor: e.target.value})}
                  placeholder="Floor (Optional)"
                />
              </div>
            </div>

            {/* Area and City */}
            <div className="form-row" style={{ marginBottom: '15px' }}>
              <div className="input-group">
                <i className="fas fa-map"></i>
                <input
                  type="text"
                  value={formData.area}
                  onChange={(e) => setFormData({...formData, area: e.target.value})}
                  placeholder="Area (e.g., Mount Lebanon)"
                  required
                />
              </div>

              <div className="input-group">
                <i className="fas fa-city"></i>
                <input
                  type="text"
                  value={formData.city}
                  onChange={(e) => setFormData({...formData, city: e.target.value})}
                  placeholder="City (e.g., Beirut)"
                  required
                />
              </div>
            </div>

            {/* Postal Code */}
            <div className="input-group" style={{ marginBottom: '15px' }}>
              <i className="fas fa-mail-bulk"></i>
              <input
                type="text"
                value={formData.postal_code}
                onChange={(e) => setFormData({...formData, postal_code: e.target.value})}
                placeholder="Postal Code (Optional)"
              />
            </div>

            {/* Set as Default - Compact */}
            <div style={{ marginTop: '20px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input
                type="checkbox"
                id="default-location"
                checked={formData.is_default}
                onChange={(e) => setFormData({...formData, is_default: e.target.checked})}
                style={{ 
                  width: '16px', 
                  height: '16px', 
                  cursor: 'pointer',
                  accentColor: '#667eea'
                }}
              />
              <label 
                htmlFor="default-location" 
                style={{ 
                  fontSize: '0.9rem', 
                  color: '#2c3e50',
                  cursor: 'pointer',
                  userSelect: 'none',
                  margin: 0
                }}
              >
                Set as default location
              </label>
            </div>

            {/* Action Buttons - Spaced Apart */}
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              gap: '40px',
              marginTop: '25px' 
            }}>
              <button 
                onClick={handleCancel}
                disabled={isSaving}
                style={{ 
                  flex: '0 1 auto', 
                  minWidth: '140px',
                  padding: '12px 24px',
                  borderRadius: '8px',
                  border: 'none',
                  background: '#e74c3c',
                  color: 'white',
                  fontSize: '15px',
                  fontWeight: 600,
                  cursor: isSaving ? 'not-allowed' : 'pointer',
                  transition: 'all 0.3s ease',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  opacity: isSaving ? 0.6 : 1
                }}
                onMouseEnter={(e) => !isSaving && (e.currentTarget.style.background = '#c0392b')}
                onMouseLeave={(e) => !isSaving && (e.currentTarget.style.background = '#e74c3c')}
              >
                <i className="fas fa-times"></i>
                Cancel
              </button>
              <button 
                className="confirm-card-btn"
                onClick={handleSave}
                disabled={isSaving}
                style={{ flex: '0 1 auto', minWidth: '140px' }}
              >
                {isSaving ? (
                  <>
                    <i className="fas fa-spinner fa-spin"></i>
                    Saving...
                  </>
                ) : (
                  <>
                    <i className="fas fa-check"></i>
                    {isAdding ? 'Add Location' : 'Save Changes'}
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Locations List */}
        {!isAdding && !editingId && locations.length > 0 && (
          <div style={{ marginTop: '20px' }}>
            {locations.map(location => (
              <div key={location.id} className="child-item">
                <div className="item-header">
                  <h3 className="section-card-title">
                    <i className="fas fa-map-marker-alt" style={{ color: location.is_default ? '#27ae60' : '#e74c3c' }}></i>
                    {location.location_name}
                    {location.is_default && (
                      <span style={{ 
                        marginLeft: '10px', 
                        fontSize: '0.8rem', 
                        background: '#27ae60', 
                        color: 'white', 
                        padding: '2px 8px', 
                        borderRadius: '10px' 
                      }}>
                        Default
                      </span>
                    )}
                  </h3>
                  <div>
                    <button 
                      className="edit-btn"
                      onClick={() => handleEditClick(location)}
                      title="Edit"
                    >
                      <i className="fas fa-pen"></i>
                    </button>
                    <button 
                      className="remove-btn"
                      onClick={() => handleDelete(location.id!)}
                      title="Delete"
                    >
                      <i className="fas fa-trash"></i>
                    </button>
                  </div>
                </div>

                <div style={{ marginTop: '15px' }}>
                  <p style={{ color: '#2c3e50', marginBottom: '8px' }}>
                    <i className="fas fa-home" style={{ marginRight: '8px', color: '#7f8c8d', width: '20px' }}></i>
                    {location.address_line}
                  </p>
                  <p style={{ color: '#2c3e50', marginBottom: '8px' }}>
                    <i className="fas fa-map" style={{ marginRight: '8px', color: '#7f8c8d', width: '20px' }}></i>
                    {location.area}
                  </p>
                  <p style={{ color: '#2c3e50', marginBottom: '8px' }}>
                    <i className="fas fa-city" style={{ marginRight: '8px', color: '#7f8c8d', width: '20px' }}></i>
                    {location.city}
                  </p>
                  {location.postal_code && (
                    <p style={{ color: '#2c3e50', marginBottom: '8px' }}>
                      <i className="fas fa-mail-bulk" style={{ marginRight: '8px', color: '#7f8c8d', width: '20px' }}></i>
                      {location.postal_code}
                    </p>
                  )}
                  <p style={{ color: '#7f8c8d', fontSize: '0.9rem' }}>
                    <i className="fas fa-map-pin" style={{ marginRight: '8px', width: '20px' }}></i>
                    {parseFloat(String(location.latitude)).toFixed(6)}, {parseFloat(String(location.longitude)).toFixed(6)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        {!isAdding && !editingId && locations.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px', color: '#7f8c8d' }}>
            <i className="fas fa-map-marked-alt" style={{ fontSize: '3rem', marginBottom: '15px', opacity: 0.5 }}></i>
            <p>No locations saved yet</p>
            <p style={{ fontSize: '0.9rem' }}>Click "Add New Location" to get started</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default MyLocations;

