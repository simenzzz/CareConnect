import type React from 'react'
import {
  X,
  Search,
  Map,
  Info,
  Tag,
  Signpost,
  Route,
  Building2,
  Layers,
  Building,
  Mails,
  Check,
  LoaderCircle,
} from 'lucide-react'

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
        <button type="button" onClick={onClose} className="btn-close-add" aria-label="Close">
          <X size={18} />
        </button>
      </div>

      {/* Search Location */}
      <div className="form-group">
        <label>
          <Search size={16} />
          Search Location
        </label>
        <div className="input-group">
          <Search size={18} />
          <input ref={searchInputRef} type="text" placeholder="Search for a location in Lebanon..." />
        </div>
      </div>

      {/* Google Map */}
      <div className="form-group">
        <label>
          <Map size={16} />
          Select on Map
        </label>
        <div ref={mapRef} className="location-map" />
        <p className="location-map__hint">
          <Info size={14} />
          Click on the map or drag the marker
        </p>
      </div>

      {/* Location Name */}
      <div className="form-group">
        <label>
          <Tag size={16} />
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
            <Signpost size={16} />
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
            <Route size={16} />
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
            <Building2 size={16} />
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
            <Layers size={16} />
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
            <Map size={16} />
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
            <Building size={16} />
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
          <Mails size={16} />
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
      <div className="add-entity-actions add-entity-actions--center">
        <button
          type="button"
          onClick={onSave}
          className="btn-save-add"
          disabled={isSavingLocation}
        >
          {isSavingLocation ? (
            <>
              <LoaderCircle size={18} className="spin" />
              Saving...
            </>
          ) : (
            <>
              <Check size={18} />
              Add Location
            </>
          )}
        </button>
      </div>
    </div>
  )
}

export default AddLocationForm
