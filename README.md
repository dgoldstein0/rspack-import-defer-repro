# rspack repro: `import defer` + lazy compilation + HMR → `__webpack_module_cache__ is not defined`

Rspack 2.2.7.

## Reproduce

```sh
pnpm install
pnpm exec playwright install chromium-headless-shell
pnpm repro   # starts `rspack dev` fresh, loads the page once in headless chromium
```

Or manually: run `pnpm dev:rspack`, then open http://localhost:8080/ in a browser. Only the
**first** load after starting the dev server fails; reloading works.

```
ReferenceError: __webpack_module_cache__ is not defined
    at __webpack_require__.z (main.<hash>.hot-update.js:78:22)
    at ./src/index.js (src_index_js.js:21:190)
    at __webpack_require__ (main.js)
```

## Required ingredients

All of these are needed; removing any one of them makes the error go away:

- `experiments.deferImport: true`, and `import defer * as ns` with the namespace used as a
  value (`const { message } = ns`). Plain member access (`ns.message`) only emits the
  optimized `__webpack_require__.zO` helper, which doesn't touch the module cache.
- `lazyCompilation: { entries: true }`
- `devServer.hot: true`

## What goes wrong

With lazy entries, the initial `main.js` contains only a lazy-compilation proxy for the
entry. When the page loads, the proxy triggers compilation of the real entry, which brings
new runtime requirements (the deferred namespace helpers). Rspack delivers the code for those
runtime modules in the HMR update chunk (`main.<hash>.hot-update.js`).

The `make_deferred_namespace_object` runtime module (`__webpack_require__.z`) reads
`__webpack_module_cache__` directly:

```js
__webpack_require__.z = (moduleId, mode) => {
  var cachedModule = __webpack_module_cache__[moduleId];
  ...
```

`__webpack_module_cache__` is a local variable inside the bootstrap closure of `main.js`.
Code in the hot-update chunk runs outside that closure, so the reference throws. On reload
the entry is already compiled, the helper is inlined into `main.js`, and it works.

`__webpack_require__.zT` in the `async_module` runtime has the same direct
`__webpack_module_cache__[id]` access and would presumably fail the same way when it is
emitted through a hot update.

Expected: runtime modules that can be emitted in hot updates access the module cache
through `__webpack_require__.c` (or otherwise avoid closure variables).
