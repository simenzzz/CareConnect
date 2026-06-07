import type React from 'react'

export interface LocationFormData {
  location_name: string
  address_name: string
  street_name: string
  building_name: string
  floor: string
  area: string
  city: string
  postal_code: string
  latitude: number
  longitude: number
  is_default: boolean
}

interface AddLocationFormProps {
  locationFormData: LocationFormData
  setLocationFormData: React.Dispatch<React.SetStateAction<LocationFormData>>
  mapRef: React.RefObject<HTMLDivElement | null>
  searchInputRef: React.RefObject<HTMLInputElement | null>
  isSavingLocation: boolean
  onClose: () => void
  onSave: () => void
}

/** "Add Location" form (Google Maps + address fields) used inside BookingModal. */
function AddLocationForm({
  locationFormData,
  setLocationFormData,
  mapRef,
  searchInputRef,
  isSavingLocation,
  onClose,
  onSave,
}: AddLocationFormProps) {
  return (
    <div className="add-entity-form">
      <div className="add-entity-header">
        <h3>Add Location</h3>
        <button type="button" onClick={onClose} className="btn-close-add">
          <i className="fas fa-times"></i>
        </button>
      </div>

      {/* Search Location */}
      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, color: '#2c3e50' }}>
          <i className="fas fa-search" style={{ marginRight: '8px', color: '#667eea' }}></i>
          Search Location
        </label>
        <div className="input-group">
          <i className="fas fa-search"></i>
          <input ref={searchInputRef} type="text" placeholder="Search for a location in Lebanon..." style={{ width: '100%' }} />
        </div>
      </div>

      {/* Google Map */}
      <div className="form-group">
        <label>
          <i className="fas fa-map"></i>
          Select on Map
        </label>
        <div
          ref={mapRef}
          style={{
            width: '100%',
            height: '250px',
            borderRadius: '8px',
            border: '2px solid #ecf0f1',
            marginBottom: '10px',
            backgroundColor: '#f5f5f5',
          }}
        />
        <p style={{ fontSize: '0.85rem', color: '#7f8c8d', marginTop: '5px' }}>
          <i className="fas fa-info-circle" style={{ marginRight: '5px' }}></i>
          Click on the map or drag the marker
        </p>
      </div>

      {/* Location Name */}
      <div className="form-group">
        <label>
          <i className="fas fa-tag"></i>
          Location Name *
        </label>
        <input
          type="text"
          value={locationFormData.location_name}
          onChange={(e) => setLocationFormData({ ...locationFormData, location_name: e.target.value })}
          placeholder="e.g., Home, Work, Office"
          required
        />
      </div>

      {/* Address Name and Street Name */}
      <div className="form-row">
        <div className="form-group">
          <label>
            <i className="fas fa-map-signs"></i>
            Address Name
          </label>
          <input
            type="text"
            value={locationFormData.address_name}
            onChange={(e) => setLocationFormData({ ...locationFormData, address_name: e.target.value })}
            placeholder="Address Name (Optional)"
          />
        </div>

        <div className="form-group">
          <label>
            <i className="fas fa-road"></i>
            Street Name
          </label>
          <input
            type="text"
            value={locationFormData.street_name}
            onChange={(e) => setLocationFormData({ ...locationFormData, street_name: e.target.value })}
            placeholder="Street name"
          />
        </div>
      </div>

      {/* Building Name and Floor */}
      <div className="form-row">
        <div className="form-group">
          <label>
            <i className="fas fa-building"></i>
            Building
          </label>
          <input
            type="text"
            value={locationFormData.building_name}
            onChange={(e) => setLocationFormData({ ...locationFormData, building_name: e.target.value })}
            placeholder="Building name (Optional)"
          />
        </div>

        <div className="form-group">
          <label>
            <i className="fas fa-layer-group"></i>
            Floor
          </label>
          <input
            type="text"
            value={locationFormData.floor}
            onChange={(e) => setLocationFormData({ ...locationFormData, floor: e.target.value })}
            placeholder="Floor (Optional)"
          />
        </div>
      </div>

      {/* Area and City */}
      <div className="form-row">
        <div className="form-group">
          <label>
            <i className="fas fa-map"></i>
            Area *
          </label>
          <input
            type="text"
            value={locationFormData.area}
            onChange={(e) => setLocationFormData({ ...locationFormData, area: e.target.value })}
            placeholder="e.g., Mount Lebanon"
            required
          />
        </div>

        <div className="form-group">
          <label>
            <i className="fas fa-city"></i>
            City *
          </label>
          <input
            type="text"
            value={locationFormData.city}
            onChange={(e) => setLocationFormData({ ...locationFormData, city: e.target.value })}
            placeholder="e.g., Beirut"
            required
          />
        </div>
      </div>

      {/* Postal Code */}
      <div className="form-group">
        <label>
          <i className="fas fa-mail-bulk"></i>
          Postal Code
        </label>
        <input
          type="text"
          value={locationFormData.postal_code}
          onChange={(e) => setLocationFormData({ ...locationFormData, postal_code: e.target.value })}
          placeholder="Postal Code (Optional)"
        />
      </div>

      {/* Save Button */}
      <div className="form-actions" style={{ display: 'flex', justifyContent: 'center', marginTop: '20px' }}>
        <button
          type="button"
          onClick={onSave}
          className="btn-save-entity"
          style={{ backgroundColor: '#27ae60', borderColor: '#27ae60', padding: '12px 40px', fontSize: '1rem', fontWeight: 600 }}
          disabled={isSavingLocation}
        >
          {isSavingLocation ? (
            <>
              <i className="fas fa-spinner fa-spin"></i>
              Saving...
            </>
          ) : (
            <>
              <i className="fas fa-check"></i>
              Add Location
            </>
          )}
        </button>
      </div>
    </div>
  )
}

export default AddLocationForm
