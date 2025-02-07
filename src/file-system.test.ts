// src/file-system.test.ts
import fs from 'node:fs/promises';
import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import { ensureDir, removeDir, readFile, writeFile, deleteFile, resolvePath, readdir } from './file-system';
import { $ } from 'bun';

const tempDir = resolvePath('./temp-test-fs');

describe('File System Operations', () => {
    beforeAll(async () => {
        await ensureDir(tempDir);
    });

    afterAll(async () => {
        await removeDir(tempDir);
    });

    it('ensureDir should create a directory', async () => {
        const newDir = resolvePath(tempDir, 'new-dir');
        await ensureDir(newDir);

        let exists = false;
        try {
            await fs.stat(newDir);
            exists = true;
        } catch (error: any) {
            if (error.code === 'ENOENT') {
                exists = false;
            } else {
                throw error;
            }
        }
        expect(exists).toBe(true);
    });

    it('removeDir should delete a directory', async () => {
        const dirToDelete = resolvePath(tempDir, 'dir-to-delete');
        await ensureDir(dirToDelete);
        await removeDir(dirToDelete);
        let exists = false;
        try {
            await fs.stat(dirToDelete);
            exists = true;
        } catch (error: any) {
            if (error.code === 'ENOENT') {
                exists = false;
            } else {
                throw error;
            }
        }
        expect(exists).toBe(false);
    });

    it('writeFile and readFile should write and read file content', async () => {
        const testFile = resolvePath(tempDir, 'test-file.txt');
        const content = 'Hello, Bun File System!';
        await writeFile(testFile, content);
        const readContent = await readFile(testFile);
        expect(readContent).toBe(content);
    });

    it('deleteFile should delete a file', async () => {
        const fileToDelete = resolvePath(tempDir, 'file-to-delete.txt');
        await writeFile(fileToDelete, 'content');
        await deleteFile(fileToDelete);
        let exists = false;
        try {
            await fs.stat(fileToDelete);
            exists = true;
        } catch (error: any) {
            if (error.code === 'ENOENT') {
                exists = false;
            } else {
                throw error;
            }
        }
        expect(exists).toBe(false);
    });

    it('readdir should list directory contents', async () => {
        const testDir = resolvePath(tempDir, 'test-readdir');
        await ensureDir(testDir);
        await writeFile(resolvePath(testDir, 'file1.txt'), 'file1');
        await writeFile(resolvePath(testDir, 'file2.txt'), 'file2');
        const contents = await readdir(testDir);
        expect(contents).toContain('file1.txt');
        expect(contents).toContain('file2.txt');
    });
});
