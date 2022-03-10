const fs = require('fs')
const path = require('path')
const filter = /(main).ts/
const fakeFiles = () => ({
  name: 'fake-files-plugin',
  setup(build) {
    build.onResolve({ filter }, (args) => {
      return { path: path.join(args.resolveDir, args.path) }
    })
    build.onLoad({ filter }, async () => {
      let code = fs.readFileSync(path.join('src', 'main.ts'), 'utf8')
      const systemJsCode = fs.readFileSync(
        path.join('node_modules', 'systemjs', 'dist', 'system.js'),
        'utf8'
      )
      const importMapOverridesCode = fs
        .readFileSync(
          path.join(
            'node_modules',
            'import-map-overrides',
            'dist',
            'import-map-overrides.js'
          ),
          'utf8'
        )
        .split('\n')[1]
      code = code.replace('importMapOverridesCode', importMapOverridesCode)
      code = code.replace('systemJsCode', systemJsCode)
      return {
        loader: 'ts',
        contents: code,
      }
    })
  },
})

require('esbuild')
  .build({
    entryPoints: ['./src/main.ts'],
    bundle: true,
    globalName: 'systemjsloader',
    format: 'iife',
    sourcemap: true,
    outfile: 'dist/loader.js',
    plugins: [fakeFiles()],
    write: true,
    minify: true,
  })
  .then()
