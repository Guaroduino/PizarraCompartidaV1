import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { storage } from './firebase';

/**
 * Uploads a file to Firebase Storage and returns its download URL.
 * @param path The path in storage where the file should be saved (e.g., 'content-images').
 * @param file The file object to upload.
 * @returns A promise that resolves with the public download URL of the file.
 */
export const uploadFile = async (path: string, file: File): Promise<string> => {
  if (!file) {
    throw new Error("No file provided for upload.");
  }
  // Create a unique file name to avoid collisions
  const fileName = `${Date.now()}-${file.name.replace(/\s/g, '_')}`;
  const storageRef = ref(storage, `${path}/${fileName}`);
  
  const snapshot = await uploadBytes(storageRef, file);
  const downloadURL = await getDownloadURL(snapshot.ref);
  
  return downloadURL;
};

/**
 * Deletes a file from Firebase Storage using its download URL.
 * @param fileUrl The full HTTPS download URL of the file to delete.
 * @returns A promise that resolves when the file is deleted.
 */
export const deleteFileByUrl = async (fileUrl: string): Promise<void> => {
  if (!fileUrl) {
    console.warn("No file URL provided for deletion.");
    return;
  }
  try {
    // Firebase SDK's refFromURL is not available in the modular web SDK,
    // so we get a reference directly from the URL.
    const storageRef = ref(storage, fileUrl);
    await deleteObject(storageRef);
  } catch (error: any) {
    // It's common for this to fail if the URL is not a storage URL,
    // or if the object doesn't exist. We can safely ignore these.
    if (error.code === 'storage/object-not-found' || error.code === 'storage/invalid-argument') {
        console.warn(`File not found for deletion or invalid URL, it might have been already removed: ${fileUrl}`);
    } else {
        console.error("Error deleting file from storage:", error);
        throw error; // Re-throw other errors
    }
  }
};