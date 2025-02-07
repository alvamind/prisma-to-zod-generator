// src/generate-zod.ts
import { generate as generateZod } from 'ts-to-zod';
import { resolveImportPath, generateImportStatement, ImportResolutionConfig } from 'dynamic-import-resolution';
import ts from 'typescript';
import path from 'path';
import { GeneratorConfig } from './config';
import { readFile, writeFile, ensureDir, readdir, resolvePath, joinPath, changeExt, getDirName, getBaseName } from './file-system';

interface ZodGeneratorConfig extends GeneratorConfig {
    importConfig: ImportResolutionConfig;
    tsOutputPath: string;
    zodOutputPath: string;
}

const pascalToCamel = (str: string) =>
    str.length > 0 ? str[0].toLowerCase() + str.slice(1) : str;

const processImports = (content: string, zodFilePath: string, config: ZodGeneratorConfig) => {
    const sourceFile = ts.createSourceFile('temp.ts', content, ts.ScriptTarget.Latest);
    const printer = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed });
    let hasZodImport = false;

    const transformed = ts.transform(sourceFile, [
        (context) => (rootNode: ts.SourceFile) => {
            const visit = (node: ts.Node): ts.Node => {
                if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier)) {
                    const originalPath = node.moduleSpecifier.text;

                    // Check for existing Zod import
                    if (originalPath === 'zod') {
                        hasZodImport = true;
                        return node; // Keep existing Zod import
                    }

                    const targetName = path.basename(originalPath, '.ts');
                    const targetType = path.dirname(originalPath).split('/')[0] || (originalPath.startsWith('.') ? getDirName(originalPath).split(path.sep).pop() || 'model' : 'model');

                    const resolvedPath = resolveImportPath({
                        sourceFilePath: zodFilePath, // Use ZOD file path!
                        targetName: targetName,
                        targetType: targetType,
                        config: config.importConfig,
                    });
                    if (resolvedPath) {
                        return ts.factory.createImportDeclaration(
                            undefined,
                            ts.factory.createImportClause(
                                false,
                                undefined,
                                ts.factory.createNamedImports([
                                    ts.factory.createImportSpecifier(
                                        false,
                                        undefined,
                                        ts.factory.createIdentifier(
                                            `${pascalToCamel(targetName)}Schema`
                                        )
                                    )
                                ]),
                            ),
                            ts.factory.createStringLiteral(resolvedPath),
                        );
                    }
                    return node;
                }
                return ts.visitEachChild(node, visit, context);
            };

            let transformedNode = ts.visitEachChild(rootNode, visit, context);

            // Add Zod import if it doesn't exist
            if (!hasZodImport) {
                const zodImport = ts.factory.createImportDeclaration(
                    undefined,
                    ts.factory.createImportClause(
                        false,
                        ts.factory.createIdentifier("z"), // Import 'z'
                        undefined // No named bindings
                    ),
                    ts.factory.createStringLiteral("zod")
                );
                // combine zod import with other imports
                transformedNode = ts.factory.updateSourceFile(
                    transformedNode,
                    [zodImport, ...transformedNode.statements]
                );
            }
            return transformedNode
        },
    ]);

    return printer.printNode(
        ts.EmitHint.Unspecified,
        transformed.transformed[0],
        sourceFile
    );
};
const getZodPath = (tsFile: string, config: ZodGeneratorConfig) => {
    const relativePath = path.relative(config.tsOutputPath, tsFile);
     const { dir, name } = path.parse(relativePath);
    return path.join(config.zodOutputPath, dir, `${pascalToCamel(name)}.zod.ts`); // Convert to camelCase
};

export const convertToZod = async (config: ZodGeneratorConfig) => {
    const tsFiles = await readFilesRecursively(config.tsOutputPath);

    await Promise.all(tsFiles.map(async (tsFile) => {
        if (!tsFile.endsWith('.ts')) return;

        const content = await readFile(tsFile);
        if (!content) return;

        const zodResult = generateZod({ sourceText: content });
        if (zodResult.errors.length) {
            console.error(`Zod generation errors in ${tsFile}:\n`, zodResult.errors);
            return;
        }
        let zodContent = zodResult.getZodSchemasFile('../ts');
        const zodFile = getZodPath(tsFile, config); // Get ZOD file path
        try {
            zodContent = processImports(zodContent, zodFile, config);  // Use ZOD file path
        } catch (processImportError) {
            console.error(`Error processing imports in ${tsFile}:\n`, processImportError);
            return;
        }

        await ensureDir(path.dirname(zodFile));
        await writeFile(zodFile, zodContent); // Use calculated Zod file path
    }));
};

const readFilesRecursively = async (dirPath: string): Promise<string[]> => {
    let files: string[] = [];
    try {
        const entries = await readdir(dirPath);
        for (const entry of entries) {
            const fullPath = joinPath(dirPath, entry);
            const stat = await Bun.file(fullPath).stat();
            if (stat.isDirectory()) {
                files = files.concat(await readFilesRecursively(fullPath));
            } else {
                files.push(fullPath);
            }
        }
    } catch (error) {
        if ((error as any).code === 'ENOENT') {
            console.warn(`Directory not found: ${dirPath}`);
            return [];
        }
        console.error(`Error reading directory ${dirPath}:`, error);
        throw error;
    }
    return files;
};

export const generateZodSchemas = async (config: GeneratorConfig): Promise<void> => {
    const { outputPath, multiFiles } = config;
    const tsOutputPath = joinPath(outputPath, 'ts');
    const zodOutputPath = joinPath(outputPath, 'zod');

    const importConfig: ImportResolutionConfig = {
        outputStructure: multiFiles ? 'nested' : 'flat',
        baseOutputDir: zodOutputPath,
        fileExtension: '.zod.ts',
        fileNameConvention: 'camelCase', // Use camelCase for filenames
        typeDirMap: {
            model: 'model',
            enum: 'enum',
            helper: 'helper',
        },
    };

    const zodGeneratorConfig: ZodGeneratorConfig = {
        ...config,
        tsOutputPath,
        zodOutputPath,
        importConfig,
    };

    await ensureDir(zodOutputPath);
    await convertToZod(zodGeneratorConfig);

    console.log(`Zod schemas generated to: ${zodOutputPath}`);
};
