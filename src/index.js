import defer * as deferred from './deferred.js';

// Using the namespace object as a value (rather than only `deferred.x` member
// access) makes rspack emit the __webpack_require__.z runtime helper, which reads
// the `__webpack_module_cache__` closure variable directly.
const { message } = deferred;

const el = document.createElement('div');
el.id = 'result';
el.textContent = message;
document.body.appendChild(el);
