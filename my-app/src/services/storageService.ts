import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { logger } from '../utils/logger';
import { storage, auth } from '../config/firebase';

export type DocumentType = 'cv' | 'identity';
export type UploadType = DocumentType | 'profile-image';

interface UploadResult {
  success: boolean;
  url?: string;
  path?: string;
  error?: string;
}

class StorageService {
  // Validate file type and size
  private validateFile(file: File, type: UploadType): { valid: boolean; error?: string } {
    // File size limits (in bytes)
    const MAX_CV_SIZE = 5 * 1024 * 1024; // 5MB
    const MAX_ID_SIZE = 10 * 1024 * 1024; // 10MB
    const MAX_PROFILE_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
    
    // Allowed file types
    const CV_TYPES = ['application/pdf'];
    const ID_TYPES = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
    const PROFILE_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    
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
    } else if (type === 'profile-image') {
      if (file.size > MAX_PROFILE_IMAGE_SIZE) {
        return { valid: false, error: 'Profile photo must be less than 5MB' };
      }
      if (!PROFILE_IMAGE_TYPES.includes(file.type)) {
        return { valid: false, error: 'Profile photo must be JPG, PNG, or WebP' };
      }
    }
    
    return { valid: true };
  }

  private extensionFor(file: File): string {
    const extension = file.name.split('.').pop()?.toLowerCase();
    if (extension) {
      return extension;
    }
    if (file.type === 'image/jpeg' || file.type === 'image/jpg') return 'jpg';
    if (file.type === 'image/png') return 'png';
    if (file.type === 'image/webp') return 'webp';
    if (file.type === 'application/pdf') return 'pdf';
    return 'bin';
  }

  private requireCurrentUid(): string {
    const uid = auth.currentUser?.uid;
    if (!uid) {
      throw new Error('You must be signed in before uploading files.');
    }
    return uid;
  }
  
  // Upload file to Firebase Storage
  async uploadDocument(file: File, type: DocumentType, userName?: string): Promise<UploadResult> {
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
      const fileExtension = this.extensionFor(file);
      const uid = this.requireCurrentUid();
      
      const fileName = `${type}-${timestamp}.${fileExtension}`;
      const uploadPath = `sitter-documents/${uid}/${type}/${fileName}`;
      
      const storageRef = ref(storage, uploadPath);
      
      logger.debug(`📤 Uploading ${type} to Firebase Storage:`, fileName);
      logger.debug(`📂 Full upload path: ${uploadPath}`);
      logger.debug(`🪣 Storage bucket:`, storage.app.options.storageBucket);
      logger.debug(`📍 Full reference path:`, storageRef.fullPath);
      logger.debug(`👤 Current user:`, uid);
      
      // Upload file
      const snapshot = await uploadBytes(storageRef, file, {
        contentType: file.type,
        customMetadata: {
          uploadedBy: uid,
          uploadedAt: new Date().toISOString(),
          originalName: file.name,
          documentType: type,
          userName: userName || 'unknown',
          uploaderUid: uid,
        }
      });
      
      logger.debug('✅ Upload successful:', snapshot);
      
      // Get download URL - add retry logic in case of timing issues
      let downloadURL;
      try {
        downloadURL = await getDownloadURL(snapshot.ref);
        logger.debug('✅ Download URL obtained:', downloadURL);
      } catch (urlError) {
        logger.error('❌ Failed to get download URL:', urlError);
        // If getting URL fails, construct it manually
        const bucket = storage.app.options.storageBucket;
        const encodedPath = encodeURIComponent(snapshot.ref.fullPath);
        downloadURL = `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${encodedPath}?alt=media`;
        logger.debug('🔧 Using constructed URL:', downloadURL);
      }
      
      return {
        success: true,
        url: downloadURL,
        path: snapshot.ref.fullPath,
      };
      
    } catch (error) {
      const fbError = error as { code?: string; message?: string };
      logger.error('❌ Upload failed:', error);
      logger.error('Error code:', fbError.code);
      logger.error('Error message:', fbError.message);

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
  
  // Upload CV under the authenticated sitter's private document path.
  async uploadCV(file: File, userName?: string): Promise<UploadResult> {
    return this.uploadDocument(file, 'cv', userName);
  }
  
  // Upload identity document under the authenticated sitter's private document path.
  async uploadIdentityDocument(file: File, userName?: string): Promise<UploadResult> {
    return this.uploadDocument(file, 'identity', userName);
  }

  async uploadProfileImage(file: File): Promise<UploadResult> {
    try {
      const validation = this.validateFile(file, 'profile-image');
      if (!validation.valid) {
        return { success: false, error: validation.error };
      }

      const uid = this.requireCurrentUid();
      const fileExtension = this.extensionFor(file);
      const uploadPath = `sitter-profile-images/${uid}/profile-${Date.now()}.${fileExtension}`;
      const storageRef = ref(storage, uploadPath);

      const snapshot = await uploadBytes(storageRef, file, {
        contentType: file.type,
        customMetadata: {
          uploadedBy: uid,
          uploadedAt: new Date().toISOString(),
          originalName: file.name,
          documentType: 'profile-image',
        },
      });
      const url = await getDownloadURL(snapshot.ref);
      return { success: true, url, path: snapshot.ref.fullPath };
    } catch (error) {
      const fbError = error as { code?: string; message?: string };
      logger.error('Profile image upload failed:', error);
      return {
        success: false,
        error: fbError.message || 'Failed to upload profile photo. Please try again.',
      };
    }
  }

  async deleteFile(path: string): Promise<void> {
    if (!path) return;
    await deleteObject(ref(storage, path));
  }
}

const storageService = new StorageService();
export default storageService;
