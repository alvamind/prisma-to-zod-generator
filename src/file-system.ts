// src/file-system.ts
import fs from 'node:fs/promises';
import path from 'node:path';

export const ensureDir = async (dirPath: string): Promise<void> => {
    console.log(`ensureDir called for path: ${dirPath}`); // Tambahkan log awal
    try {
        await fs.mkdir(dirPath, { recursive: true });
        console.log(`ensureDir success for path: ${dirPath}`); // Tambahkan log sukses
    } catch (error: any) {
        console.error(`ensureDir error for path: ${dirPath}`, error); // Tambahkan log error lengkap
        if (error.code !== 'EEXIST') {
            throw error;
        } else {
            console.log(`ensureDir: directory already exists for path: ${dirPath}`); // Tambahkan log jika direktori sudah ada
        }
    }
};

export const removeDir = async (dirPath: string): Promise<void> => {
    await fs.rm(dirPath, { recursive: true, force: true });
};

export const readdir = async (dirPath: string): Promise<string[]> => {
    return fs.readdir(dirPath);
};

export const readFile = async (filePath: string): Promise<string> => {
    return fs.readFile(filePath, 'utf-8');
};

export const writeFile = async (filePath: string, content: string): Promise<void> => {
    await fs.writeFile(filePath, content);
};

export const deleteFile = async (filePath: string): Promise<void> => {
    await fs.unlink(filePath);
};

export const resolvePath = (...paths: string[]) => path.resolve(...paths);
export const joinPath = (...paths: string[]) => path.join(...paths);
export const getDirName = (filePath: string) => path.dirname(filePath);
export const getBaseName = (filePath: string) => path.basename(filePath);
export const changeExt = (filePath: string, newExt: string) => path.parse(filePath).name + newExt;
