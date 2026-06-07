import type React from 'react'

interface DocumentUploadSectionProps {
  cv: File | null
  identityDocument: File | null
  uploadingCV: boolean
  uploadingID: boolean
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  cvError?: string
  idError?: string
}

/** "Required Documents" block of the sitter signup form (CV + identity upload). */
function DocumentUploadSection({
  cv,
  identityDocument,
  uploadingCV,
  uploadingID,
  onFileChange,
  cvError,
  idError,
}: DocumentUploadSectionProps) {
  return (
    <div className="form-section">
      <h3>Required Documents *</h3>

      <div className="form-group">
        <label htmlFor="cv">CV/Resume (PDF) *</label>
        <div className="file-upload">
          <input
            type="file"
            id="cv"
            name="cv"
            accept=".pdf"
            onChange={onFileChange}
            className={cvError ? 'error' : ''}
            disabled={uploadingCV}
          />
          <label htmlFor="cv" className="file-upload-label">
            {cv ? (
              <>
                <i className="fas fa-check-circle" style={{ color: '#2ecc71' }}></i>
                <span className="file-text">File Selected</span>
                <span className="file-info">{cv.name}</span>
              </>
            ) : (
              <>
                <i className="fas fa-file-pdf"></i>
                <span className="file-text">Choose CV file</span>
                <span className="file-info">PDF format only (Max 5MB)</span>
              </>
            )}
          </label>
        </div>
        {cvError && <span className="error-message">{cvError}</span>}
      </div>

      <div className="form-group">
        <label htmlFor="identityDocument">Identity Document *</label>
        <div className="file-upload">
          <input
            type="file"
            id="identityDocument"
            name="identityDocument"
            accept=".pdf,.jpg,.jpeg,.png"
            onChange={onFileChange}
            className={idError ? 'error' : ''}
            disabled={uploadingID}
          />
          <label htmlFor="identityDocument" className="file-upload-label">
            {identityDocument ? (
              <>
                <i className="fas fa-check-circle" style={{ color: '#2ecc71' }}></i>
                <span className="file-text">File Selected</span>
                <span className="file-info">{identityDocument.name}</span>
              </>
            ) : (
              <>
                <i className="fas fa-id-card"></i>
                <span className="file-text">Choose Identity Document</span>
                <span className="file-info">PDF, JPG, PNG formats accepted (Max 10MB)</span>
              </>
            )}
          </label>
        </div>
        {idError && <span className="error-message">{idError}</span>}
        <p className="help-text">Upload your Lebanese ID card or passport</p>
      </div>
    </div>
  )
}

export default DocumentUploadSection
