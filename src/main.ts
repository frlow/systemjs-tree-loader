const currentScript = document.currentScript as HTMLScriptElement
const assetsPath = currentScript.getAttribute('assets')
const code = currentScript.text

type Dictionary<T> = { [i: string]: T }
type AssetsFile = {
  children: Dictionary<string>
  imports: Dictionary<string>
}

const parseImports = (assetsFile: AssetsFile, name?: string) => {
  let imports = Object.entries(assetsFile.imports).reduce(
    (acc, [key, val]) => ({
      ...acc,
      [`${name ? `${name}/` : ''}${key}`]: val,
    }),
    {}
  )
  return Object.entries(assetsFile.children).reduce(
    (acc, [key, val]) => ({
      ...acc,
      [`@asset/${name ? `${name}/` : ''}${key}`]: val,
    }),
    imports
  )
}

const getImports = async (
  path: string,
  name?: string
): Promise<Dictionary<string>> => {
  const pathOverride = localStorage.getItem(
    `import-map-override:@asset/${name || ''}`
  )
  const result = (await fetch(pathOverride || path)
    .then((r) => r.json())
    .catch(() => ({
      imports: {},
      children: {},
    }))) as AssetsFile
  const imports = parseImports(result, name)
  const results = await Promise.all(
    Object.keys(result.children).map(
      async (key) =>
        await getImports(
          result.children[key],
          `${name ? `${name}/` : ''}${key}`
        )
    )
  )
  return results.reduce((acc, cur) => ({ ...acc, ...cur }), imports)
}

const loadElements = async () => {
  if (!assetsPath) throw "attribute 'assets' not set"
  const metaElement = document.createElement('meta')
  metaElement.name = 'importmap-type'
  metaElement.content = 'systemjs-importmap'
  document.head.appendChild(metaElement)

  const assets = await getImports(assetsPath)
  const importMapElement = document.createElement('script')
  importMapElement.type = 'systemjs-importmap'
  importMapElement.text = JSON.stringify({ imports: { ...assets } })
  document.head.appendChild(importMapElement)

  // const systemJsOverrides = await fetch("https://cdn.jsdelivr.net/npm/import-map-overrides/dist/import-map-overrides.js").then(r => r.text())
  const systemJsElementOverrides = document.createElement('script')
  systemJsElementOverrides.text = importMapOverridesCode
  systemJsElementOverrides.type = 'text/javascript'
  document.head.appendChild(systemJsElementOverrides)

  const uiElement = document.createElement('import-map-overrides-full')
  uiElement.setAttribute('show-when-local-storage', 'devtools')
  document.body.appendChild(uiElement)

  // const systemJs = await fetch("https://cdn.jsdelivr.net/npm/systemjs/dist/system.js").then(r => r.text())
  const systemJsElement = document.createElement('script')
  systemJsElement.text = systemJsCode
  document.head.appendChild(systemJsElement)

  eval(code)
}

const importMapOverridesCode = `importMapOverridesCode`
const systemJsCode = `systemJsCode`

loadElements().then()
