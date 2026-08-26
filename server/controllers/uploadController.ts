import { Request, Response } from 'express';
import ImageKit from 'imagekit';

const getImageKitInstance = () => {
  const publicKey = process.env.IMAGEKIT_PUBLIC_KEY || '';
  const privateKey = process.env.IMAGEKIT_PRIVATE_KEY || '';
  const urlEndpoint = process.env.IMAGEKIT_URL_ENDPOINT || '';

  if (!publicKey || !privateKey || !urlEndpoint) {
    throw new Error('ImageKit credentials are not properly configured in environment variables.');
  }

  return new ImageKit({
    publicKey,
    privateKey,
    urlEndpoint,
  });
};

// GET /api/upload/auth - Returns authentication token for ImageKit frontend uploads
export const getImageKitAuth = async (req: Request, res: Response) => {
  try {
    const imagekit = getImageKitInstance();
    const authenticationParameters = imagekit.getAuthenticationParameters();
    return res.json({
      success: true,
      publicKey: process.env.IMAGEKIT_PUBLIC_KEY,
      urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT,
      ...authenticationParameters,
    });
  } catch (error: any) {
    console.error('ImageKit auth parameters error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to generate ImageKit authentication parameters',
    });
  }
};

// POST /api/upload - Upload base64 or file directly to ImageKit
export const uploadImage = async (req: Request, res: Response) => {
  try {
    const { file, fileName, folder } = req.body;
    if (!file) {
      return res.status(400).json({
        success: false,
        message: 'File payload (base64 string or image URL) is required',
      });
    }

    const imagekit = getImageKitInstance();
    const result = await imagekit.upload({
      file, // base64 string or remote image URL
      fileName: fileName || `book_cover_${Date.now()}.jpg`,
      folder: folder || '/school_library_books',
      useUniqueFileName: true,
    });

    return res.json({
      success: true,
      message: 'Image uploaded successfully to ImageKit',
      url: result.url,
      thumbnailUrl: result.thumbnailUrl,
      fileId: result.fileId,
      name: result.name,
    });
  } catch (error: any) {
    console.error('ImageKit upload error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to upload image to ImageKit',
    });
  }
};
