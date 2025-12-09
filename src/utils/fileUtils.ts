import { File, Paths } from "expo-file-system";

/**
 * Resolves a potentially stale file path to a valid path in the current app container.
 * This handles the case where iOS changes the app container UUID on updates,
 * invalidating absolute paths stored in the database.
 *
 * @param path The file path (absolute or relative/filename)
 * @returns The resolved valid absolute path, or the original path if resolution fails/isn't needed
 */
export const resolveLocalImagePath = (path?: string | null): string | null => {
  if (!path) return null;

  try {
    // If it's a file:// URL, we check if it needs to be updated
    if (path.startsWith("file://")) {
      // Check if the path contains "Documents"
      // Typical path: file:///.../Application/UUID/Documents/filename.jpg
      const documentsIndex = path.indexOf("/Documents/");
      
      if (documentsIndex !== -1) {
        // Extract filename (everything after the last slash)
        const filename = path.split("/").pop();
        
        if (filename) {
          // Construct new path using current Documents directory
          // We use the File class to ensure correct path construction with the new API
          const newFile = new File(Paths.document, filename);
          return newFile.uri;
        }
      }
    }

    // If it's just a filename (no slashes), assume it's in Documents
    if (!path.includes("/")) {
      const newFile = new File(Paths.document, path);
      return newFile.uri;
    }
  } catch (error) {
    console.warn("Error resolving local image path:", error);
    return path;
  }

  return path;
};
