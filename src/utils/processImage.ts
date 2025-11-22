import * as ImageManipulator from "expo-image-manipulator";
import { File, Paths } from "expo-file-system";
import "react-native-get-random-values";
import { v4 as uuidv4 } from "uuid";
import { uploadToSupabaseStorage } from "./uploadToSupabaseStorage";

export interface ProcessedImageResult {
  localImagePath: string;
  supabaseImagePath: string;
}

/**
 * Processes an image by resizing, compressing, saving locally, and uploading to Supabase
 * @param uri - The original image URI to process
 * @returns Promise<ProcessedImageResult> - Object containing local and Supabase image paths
 * @throws Error if image processing fails
 */
export const processImage = async (
  uri: string
): Promise<ProcessedImageResult> => {
  let localFile: File | null = null;

  try {
    console.log("processImage: Starting with URI:", uri);

    // Check if the image is HEIC format (common on iOS for screenshots and photos)
    const isHeic = uri.toLowerCase().includes(".heic");

    let processedImage;

    if (isHeic) {
      // For HEIC images, first convert to JPEG without resize to avoid GPU context loss
      // This is a workaround for expo-image-manipulator issues with HEIC + resize
      console.log("processImage: HEIC detected, converting format first");
      const convertedImage = await ImageManipulator.manipulateAsync(
        uri,
        [], // No transformations, just format conversion
        { format: ImageManipulator.SaveFormat.JPEG }
      );
      console.log("processImage: Converted to JPEG:", convertedImage.uri);

      // Then resize the converted JPEG
      processedImage = await ImageManipulator.manipulateAsync(
        convertedImage.uri,
        [{ resize: { width: 768 } }],
        { compress: 0.65, format: ImageManipulator.SaveFormat.JPEG }
      );
    } else {
      // For non-HEIC images, process in a single step
      processedImage = await ImageManipulator.manipulateAsync(
        uri,
        [{ resize: { width: 768 } }],
        { compress: 0.65, format: ImageManipulator.SaveFormat.JPEG }
      );
    }

    console.log("processImage: Processed image result:", {
      uri: processedImage.uri,
      width: processedImage.width,
      height: processedImage.height,
    });

    if (!processedImage.uri) {
      throw new Error("ImageManipulator returned no URI");
    }

    const uniqueFilename = `${uuidv4()}.jpg`;

    // Move the processed image from its temporary cache location to the permanent path.
    console.log("processImage: Creating File from URI:", processedImage.uri);
    const sourceFile = new File(processedImage.uri);
    const targetFile = new File(Paths.document, uniqueFilename);
    console.log("processImage: Target path:", targetFile.uri);

    const sourceExists = await sourceFile.exists();
    console.log("processImage: Source file exists:", sourceExists);
    if (!sourceExists) {
      throw new Error(`Source file does not exist: ${processedImage.uri}`);
    }

    await sourceFile.move(targetFile);
    localFile = sourceFile; // Track the file for cleanup if upload fails
    console.log("processImage: Moved to:", sourceFile.uri);

    // After moving, sourceFile.uri is automatically updated to the new location
    const supabaseImagePath = await uploadToSupabaseStorage(sourceFile.uri);
    console.log("processImage: Uploaded to Supabase:", supabaseImagePath);

    return {
      localImagePath: sourceFile.uri,
      supabaseImagePath,
    };
  } catch (error) {
    console.error("processImage: Error at step:", error);
    // Clean up the local file if upload failed
    if (localFile) {
      try {
        await localFile.delete();
      } catch (deleteError) {
        // Log but don't throw - we want to propagate the original error
        console.warn("Failed to clean up orphaned image file:", deleteError);
      }
    }
    // Re-throw the original error
    throw error;
  }
};
