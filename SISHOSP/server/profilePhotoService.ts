/**
 * Profile Photo Service
 * Handles validation of profile photos
 * Photos are now stored as Base64 strings directly in the database
 */
export class ProfilePhotoService {
  /**
   * Validate file is an image and size is acceptable
   * @param mimeType MIME type of the file
   * @param fileSize Size of file in bytes
   */
  validateImageFile(mimeType: string, fileSize: number): void {
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    const maxSize = 5 * 1024 * 1024; // 5MB

    if (!allowedTypes.includes(mimeType)) {
      throw new Error(
        "Tipo de arquivo não suportado. Use JPEG, PNG ou WebP."
      );
    }

    if (fileSize > maxSize) {
      throw new Error("Arquivo muito grande. Tamanho máximo: 5MB");
    }
  }
}

export const profilePhotoService = new ProfilePhotoService();
