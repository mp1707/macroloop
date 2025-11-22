import * as ImageManipulator from "expo-image-manipulator";
import { File, Paths } from "expo-file-system";
import "react-native-get-random-values";
import { v4 as uuidv4 } from "uuid";
import { uploadToSupabaseStorage } from "./uploadToSupabaseStorage";

export interface ProcessedImageResult {
  localImagePath: string;
  supabaseImagePath: string;
}

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Attempts to manipulate an image with retry logic for GPU context loss errors
 */
const manipulateWithRetry = async (
  uri: string,
  actions: ImageManipulator.Action[],
  options: ImageManipulator.SaveOptions,
  maxRetries = 3
): Promise<ImageManipulator.ImageResult> => {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`processImage: Manipulation attempt ${attempt}/${maxRetries}`);
      const result = await ImageManipulator.manipulateAsync(uri, actions, options);
      return result;
    } catch (error) {
      lastError = error as Error;
      console.warn(`processImage: Attempt ${attempt} failed:`, error);

      if (attempt < maxRetries) {
        // Wait before retrying (exponential backoff: 100ms, 200ms, 400ms)
        const waitTime = 100 * Math.pow(2, attempt - 1);
        console.log(`processImage: Waiting ${waitTime}ms before retry...`);
        await delay(waitTime);
      }
    }
  }

  throw lastError;
};

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

    // Process the image - resize to max width of 768px, maintaining aspect ratio
    const processedImage = await manipulateWithRetry(
      uri,
      [{ resize: { width: 768 } }],
      { compress: 0.65, format: ImageManipulator.SaveFormat.JPEG }
    );

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
