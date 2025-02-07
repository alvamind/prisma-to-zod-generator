// src/generate-zod.ts
import { generate as generateZod } from 'ts-to-zod';
import { resolveImportPath, generateImportStatement, ImportResolutionConfig } from 'dynamic-import-resolution';
import ts from 'typescript';
import path from 'path';
import { GeneratorConfig } from './config'; // Assuming GeneratorConfig is sufficient, adjust if ZodGeneratorConfig is needed
import { readFile, writeFile, ensureDir, readdir, resolvePath, joinPath, changeExt, getDirName, getBaseName } from './file-system';

interface ZodGeneratorConfig extends GeneratorConfig { // Assuming GeneratorConfig is base, extend if needed
    importConfig: ImportResolutionConfig;
    tsOutputPath: string;
    zodOutputPath: string;
}


// src/generate-zod.ts
const processImports = (content: string, tsFilePath: string, config: ZodGeneratorConfig) => {
    const sourceFile = ts.createSourceFile('temp.ts', content, ts.ScriptTarget.Latest);
    const printer = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed });

    const transformed = ts.transform(sourceFile, [
        (context) => (rootNode: ts.SourceFile) => { // Specify rootNode type
            const visit = (node: ts.Node): ts.Node => {
                if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier)) {
                    const originalPath = node.moduleSpecifier.text;
                    const targetName = path.basename(originalPath, '.ts');
                    const targetType = path.dirname(originalPath).split('/')[0] || (originalPath.startsWith('.') ? getDirName(originalPath).split(path.sep).pop() || 'model' : 'model');

                    const resolved = resolveImportPath({
                        sourceFilePath: tsFilePath,
                        targetName: targetName,
                        targetType: targetType,
                        config: config.importConfig,
                    });

                    if (resolved) {
                         // Create the new import declaration directly
                        return ts.factory.createImportDeclaration(
                            undefined, // modifiers
                            ts.factory.createImportClause(
                                false, // isTypeOnly
                                undefined, // name
                                ts.factory.createNamedImports([
                                    ts.factory.createImportSpecifier(
                                        false, // isTypeOnly
                                        undefined, // propertyName
                                        ts.factory.createIdentifier(`${targetName}Schema`) // name
                                    )
                                ])
                            ),
                            ts.factory.createStringLiteral(resolved), // moduleSpecifier (resolved path)
                        );
                    }
                    // If resolution fails, return the original node
                    return node;
                }
                return ts.visitEachChild(node, visit, context);
            };
            return ts.visitEachChild(rootNode, visit, context); // Return the modified SourceFile
        },
    ]);

    return printer.printNode(
        ts.EmitHint.Unspecified,
        transformed.transformed[0],
        sourceFile
    );
};


export const convertToZod = async (config: ZodGeneratorConfig) => {
    const tsFiles = await readFilesRecursively(config.tsOutputPath);

    await Promise.all(tsFiles.map(async (tsFile) => {
        if (!tsFile.endsWith('.ts')) return;

        const content = await readFile(tsFile);
        if (!content) return; // Handle empty file content

        const zodResult = generateZod({ sourceText: content });
        if (zodResult.errors.length) {
            console.error(`Zod generation errors in ${tsFile}:\n`, zodResult.errors);
            return; // Skip file if zod generation has errors
        }
        let zodContent = zodResult.getZodSchemasFile('../ts'); // default import path, will be processed

        try {
            zodContent = processImports(zodContent, tsFile, config);
        } catch (processImportError) {
            console.error(`Error processing imports in ${tsFile}:\n`, processImportError);
            return; // Skip file if import processing fails
        }


        const relativePath = path.relative(config.tsOutputPath, tsFile);
        // *** FIX: Use config.zodOutputPath as the base for the output path ***
        const zodFile = path.join(config.zodOutputPath, relativePath.replace(/\.ts$/, '.zod.ts')); // change extension to .zod.ts
        await ensureDir(path.dirname(zodFile));
        await writeFile(zodFile, zodContent);
    }));
};


const readFilesRecursively = async (dirPath: string): Promise<string[]> => {
    let files: string[] = [];
    try {
        const entries = await readdir(dirPath);
        for (const entry of entries) {
            const fullPath = joinPath(dirPath, entry);
            const stat = await Bun.file(fullPath).stat(); // Use Bun.file().stat()
            if (stat.isDirectory()) {
                files = files.concat(await readFilesRecursively(fullPath));
            } else {
                files.push(fullPath);
            }
        }
    } catch (error) {
        if ((error as any).code === 'ENOENT') {
            console.warn(`Directory not found: ${dirPath}`); // Or handle directory not found as needed
            return [];
        }
        console.error(`Error reading directory ${dirPath}:`, error);
        throw error; // Re-throw error if it's not ENOENT
    }
    return files;
};


// src/generate-zod.ts
export const generateZodSchemas = async (config: GeneratorConfig): Promise<void> => {
    const { outputPath, multiFiles } = config;
    // Use  paths for ts and zod output directories
    const tsOutputPath = joinPath(outputPath, 'ts'); // only join zod here
    const zodOutputPath = joinPath(outputPath, 'zod'); // only join zod here

    const importConfig: ImportResolutionConfig = {
        outputStructure: multiFiles ? 'nested' : 'flat',
        baseOutputDir: zodOutputPath,
        fileExtension: '.zod.ts',
        fileNameConvention: 'PascalCase',
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
