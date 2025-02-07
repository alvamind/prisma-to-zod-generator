// src/config.test.ts
import { describe, it, expect } from 'bun:test';
import { GeneratorConfig } from './config';

describe('Config Interfaces', () => {
    it('GeneratorConfig should be defined', () => {
        const config: GeneratorConfig = {
            dirOrFilesPath: ['./prisma/schema.prisma'],
            outputPath: './src/generated',
        };
        expect(config).toBeDefined();
        expect(config.dirOrFilesPath).toBeDefined();
        expect(config.outputPath).toBeDefined();
    });

    it('GeneratorConfig should accept optional parameters', () => {
        const config: GeneratorConfig = {
            dirOrFilesPath: ['./prisma/schema.prisma'],
            outputPath: './src/generated',
            withTs: false,
            multiFiles: true,
            modelVariants: ['Regular', 'CreateInput'],
        };
        expect(config.withTs).toBe(false);
        expect(config.multiFiles).toBe(true);
        expect(config.modelVariants).toEqual(['Regular', 'CreateInput']);
    });
});
