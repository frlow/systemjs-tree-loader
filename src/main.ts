const currentScript = document.currentScript as HTMLScriptElement
const assetsPath = currentScript.getAttribute('assets')
const code = currentScript.text

type Dictionary<T> = { [i: string]: T }
type AssetsFile = {
  children: Dictionary<string>
  imports: Dictionary<string>
}

const validateAssetsFile = (assetsFile: AssetsFile, name?: string) => {
  if (!assetsFile.children) {
    console.warn(`Children is not set in '${name}'`)
    return false
  }
  if (!assetsFile.imports) {
    console.warn(`Imports is not set in '${name}'`)
    return false
  }
  const duplicates = Object.keys(assetsFile.imports)
    .concat(Object.keys(assetsFile.children))
    .filter((e, i, a) => a.indexOf(e) !== i)
  if (duplicates.length > 0) {
    console.warn(`Duplicate key "${duplicates[0]}" in "${name}"`)
    return false
  }
  return true
}

const parseImports = (
  assetsFile: AssetsFile,
  name?: string
): Dictionary<string> =>
  Object.entries(assetsFile.imports)
    .concat(Object.entries(assetsFile.children))
    .reduce(
      (acc, [key, val]) => ({
        ...acc,
        [`${name ? `${name}/` : ''}${key}`]: val,
      }),
      {}
    )

const getImports = async (
  path: string,
  name?: string
): Promise<Dictionary<string>> => {
  const disabled = JSON.parse(
    localStorage.getItem('import-map-overrides-disabled') || '[]'
  ).includes(name)
  const pathOverride = disabled
    ? undefined
    : localStorage.getItem(`import-map-override:${name || ''}`)
  const result = (await fetch(pathOverride || path)
    .then((r) => r.json())
    .catch(() => ({
      imports: {},
      children: {},
    }))) as AssetsFile
  if (!validateAssetsFile(result, name)) return {}
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
