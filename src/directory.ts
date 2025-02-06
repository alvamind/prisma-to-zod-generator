// prisma-to-zod-generator/src/directory.ts
import fs from 'fs/promises';

/**
 * Ensures that a directory exists. Creates it recursively if it does not.
 * @param dirPath The path to the directory.
 * @returns A Promise that resolves when the directory exists.
 */
export const ensureDir = async (dirPath: string): Promise<void> => {
    try {
        await fs.mkdir(dirPath, { recursive: true });
    } catch (error: any) {
        if (error.code !== 'EEXIST') { // Ignore if directory already exists
            throw new Error(`DirectoryError: Failed to ensure directory: ${dirPath}. ${error.message}`);
        }
    }
};

/**
 * Deletes a directory recursively.
 * @param dirPath The path to the directory to delete.
 * @returns A Promise that resolves when the directory is deleted.
 */
export const deleteDir = async (dirPath: string): Promise<void> => {
    try {
        await fs.rm(dirPath, { recursive: true, force: true }); // force: true to avoid errors if dir not exists
    } catch (error: any) {
        throw new Error(`DirectoryError: Failed to delete directory: ${dirPath}. ${error.message}`);
    }
};
