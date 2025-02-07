await Bun.build({
  entrypoints: ['./src/index.ts'],
  outdir: './dist',
  format: 'esm',
  minify: false,
  sourcemap: 'inline',
  external: ['prisma-to-ts-generator', 'dynamic-import-resolution', 'ts-to-zod', 'zod']
});
console.log('Build complete');
