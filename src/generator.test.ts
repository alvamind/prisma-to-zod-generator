// example src/generator.test.ts
// src/generator.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import { generate } from './generator';
import { ensureDir, removeDir, resolvePath } from './file-system';
import { $ } from 'bun';
import path, { join } from 'path';

const testOutputBase = './test-output';

describe('E2E Test: Generator', () => {
    beforeAll(async () => {
        await ensureDir(testOutputBase);
    });

    // afterAll(async () => {
    //     await removeDir(testOutputBase);
    // });

    it('should generate Zod schemas from Prisma schema (multiFiles: true, withTs: true)', async () => {
        const testOutputPath = join(testOutputBase, 'multi-ts')
        await generate({
            dirOrFilesPath: ['./test-prisma/schema.prisma'], // Asumsikan ada schema.prisma di root proyek
            outputPath: testOutputPath,
            multiFiles: true,
            withTs: true,
            modelVariants: ['Regular', 'CreateInput', 'UpdateInput'],
        });

        const treeOutput = await $`tree ${testOutputPath} -I 'node_modules|dist|.git'`.text();
        console.log('Directory Structure:\n', treeOutput);

        // Assertions - adjust based on expected output structure and content
        expect(await Bun.file(join(testOutputPath, 'ts/model/User.ts')).exists()).toBe(true);
        expect(await Bun.file(join(testOutputPath, 'zod/model/User.zod.ts')).exists()).toBe(true);
        expect(await Bun.file(join(testOutputPath, 'ts/enum/Role.ts')).exists()).toBe(true);
        expect(await Bun.file(join(testOutputPath, 'zod/enum/Role.zod.ts')).exists()).toBe(true);
        expect(await Bun.file(join(testOutputPath, 'ts/helper/helper-types.ts')).exists()).toBe(true);
        expect(await Bun.file(join(testOutputPath, 'zod/helper/helper-types.zod.ts')).exists()).toBe(true); // Maybe no zod for helper-types?
    }, 60000); // Increased timeout for potentially slower operations

    it('should generate Zod schemas and delete TS files (multiFiles: true, withTs: false)', async () => {
        const testOutputPath = join(testOutputBase, 'multi-no-ts');
        await generate({
            dirOrFilesPath: ['./test-prisma/schema.prisma'],
            outputPath: testOutputPath,
            multiFiles: true,
            withTs: false,
            modelVariants: ['Regular'],
        });

        const treeOutput = await $`tree ${testOutputPath} -I 'node_modules|dist|.git'`.text();
        console.log('Directory Structure (no TS):\n', treeOutput);


        expect(await Bun.file(join(testOutputPath, 'ts')).exists()).toBe(false); // TS dir should be deleted
        expect(await Bun.file(join(testOutputPath, 'zod/model/User.zod.ts')).exists()).toBe(true);
        expect(await Bun.file(join(testOutputPath, 'zod/enum/Role.zod.ts')).exists()).toBe(true);
    }, 60000);

    it('should generate Zod schemas in a single file (multiFiles: false, withTs: true)', async () => {
        const testOutputPath = join(testOutputBase, 'single-ts');
        await generate({
            dirOrFilesPath: ['./test-prisma/schema.prisma'],
            outputPath: testOutputPath,
            multiFiles: false,
            withTs: true,
            modelVariants: ['Regular'],
        });

        const treeOutput = await $`tree ${testOutputPath} -I 'node_modules|dist|.git'`.text();
        console.log('Directory Structure (single file):\n', treeOutput);

        expect(await Bun.file(join(testOutputPath, 'ts')).exists()).toBe(true); // TS dir exists
        expect(await Bun.file(join(testOutputPath, 'zod/index.zod.ts')).exists()).toBe(true);
        expect(await Bun.file(join(testOutputPath, 'ts/index.ts')).exists()).toBe(true); // index.ts for TS types
    }, 60000);
});
