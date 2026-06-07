import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage, auth } from '../config/firebase';

export type DocumentType = 'cv' | 'identity';

interface UploadResult {
  success: boolean;
  url?: string;
  error?: string;
}

class StorageService {
  // Validate file type and size
  private validateFile(file: File, type: DocumentType): { valid: boolean; error?: string } {
    // File size limits (in bytes)
    const MAX_CV_SIZE = 5 * 1024 * 1024; // 5MB
    const MAX_ID_SIZE = 10 * 1024 * 1024; // 10MB
    
    // Allowed file types
    const CV_TYPES = ['application/pdf'];
    const ID_TYPES = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
    
    if (type === 'cv') {
      if (file.size > MAX_CV_SIZE) {
        return { valid: false, error: 'CV file size must be less than 5MB' };
      }
      if (!CV_TYPES.includes(file.type)) {
        return { valid: false, error: 'CV must be a PDF file' };
      }
    } else if (type === 'identity') {
      if (file.size > MAX_ID_SIZE) {
        return { valid: false, error: 'Identity document file size must be less than 10MB' };
      }
      if (!ID_TYPES.includes(file.type)) {
        return { valid: false, error: 'Identity document must be PDF, JPG, or PNG' };
      }
    }
    
    return { valid: true };
  }
  
  // Upload file to Firebase Storage
  async uploadDocument(file: File, type: DocumentType, userName?: string, forceUniqueName: boolean = false): Promise<UploadResult> {
    try {
      // Validate file
      const validation = this.validateFile(file, type);
      if (!validation.valid) {
        return {
          success: false,
          error: validation.error
        };
      }
      
      // Create a unique filename with user name and timestamp
      const timestamp = Date.now();
      const dateString = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
      const fileExtension = file.name.split('.').pop();
      
      // Sanitize user name for folder/filename (remove special characters, replace spaces with underscores)
      const sanitizedName = userName 
        ? userName.trim().replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '_')
        : 'user';
      
      // Create a unique folder name: FullName_YYYY-MM-DD_timestamp
      const uniqueFolderName = `${sanitizedName}_${dateString}_${timestamp}`;
      
      const fileName = `${type}.${fileExtension}`;
      
      // For signup (before authentication), use a folder structure with user's full name and timestamp
      // Files can be moved/reorganized after user is created if needed
      const user = auth.currentUser;
      const uploadPath = (user && !forceUniqueName)
        ? `documents/${user.uid}/${type}/${fileName}` // Authenticated user (not during signup)
        : `documents/${uniqueFolderName}/${fileName}`; // Use unique folder name for signup
      
      const storageRef = ref(storage, uploadPath);
      
      console.log(`📤 Uploading ${type} to Firebase Storage:`, fileName);
      console.log(`📂 Unique folder name: ${uniqueFolderName}`);
      console.log(`📂 Full upload path: ${uploadPath}`);
      console.log(`🪣 Storage bucket:`, storage.app.options.storageBucket);
      console.log(`📍 Full reference path:`, storageRef.fullPath);
      console.log(`👤 Current user:`, user ? user.uid : 'Not authenticated (signup)');
      
      // Upload file
      const snapshot = await uploadBytes(storageRef, file, {
        contentType: file.type,
        customMetadata: {
          uploadedBy: user?.uid || 'pending-signup',
          uploadedAt: new Date().toISOString(),
          originalName: file.name,
          documentType: type,
          userName: userName || 'unknown',
          uniqueFolderId: uniqueFolderName
        }
      });
      
      console.log('✅ Upload successful:', snapshot);
      
      // Get download URL - add retry logic in case of timing issues
      let downloadURL;
      try {
        downloadURL = await getDownloadURL(snapshot.ref);
        console.log('✅ Download URL obtained:', downloadURL);
      } catch (urlError) {
        console.error('❌ Failed to get download URL:', urlError);
        // If getting URL fails, construct it manually
        const bucket = storage.app.options.storageBucket;
        const encodedPath = encodeURIComponent(snapshot.ref.fullPath);
        downloadURL = `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${encodedPath}?alt=media`;
        console.log('🔧 Using constructed URL:', downloadURL);
      }
      
      return {
        success: true,
        url: downloadURL
      };
      
    } catch (error) {
      const fbError = error as { code?: string; message?: string };
      console.error('❌ Upload failed:', error);
      console.error('Error code:', fbError.code);
      console.error('Error message:', fbError.message);

      // Handle specific Firebase Storage errors
      let errorMessage = 'Failed to upload document. Please try again.';

      if (fbError.code === 'storage/unauthorized') {
        errorMessage = `Upload permission denied. Firebase error: ${fbError.code}`;
      } else if (fbError.code === 'storage/canceled') {
        errorMessage = 'Upload was canceled.';
      } else if (fbError.code === 'storage/unknown') {
        errorMessage = 'An unknown error occurred. Please check your internet connection.';
      } else if (fbError.message) {
        errorMessage = `${fbError.message} (Code: ${fbError.code || 'unknown'})`;
      }
      
      return {
        success: false,
        error: errorMessage
      };
    }
  }
  
  // Upload CV (always use unique folder name during signup)
  async uploadCV(file: File, userName?: string): Promise<UploadResult> {
    return this.uploadDocument(file, 'cv', userName, true); // Force unique name
  }
  
  // Upload Identity Document (always use unique folder name during signup)
  async uploadIdentityDocument(file: File, userName?: string): Promise<UploadResult> {
    return this.uploadDocument(file, 'identity', userName, true); // Force unique name
  }
}

const storageService = new StorageService();
export default storageService;

