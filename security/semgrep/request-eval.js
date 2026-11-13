function unsafe(request) {
  // ruleid: request-data-evaluated-as-code
  return eval(request.body);
}
function safe(request) {
  // ok: request-data-evaluated-as-code
  return JSON.parse(request.body);
}

function unsafeConstructor(request) {
  // ruleid: request-data-evaluated-as-code
  return new Function(request.body);
}
function unsafeInterpolatedConstructor(request) {
  // ruleid: request-data-evaluated-as-code
  return new Function(`return ${request.body}`);
}
function unsafeParameterName(request) {
  // ruleid: request-data-evaluated-as-code
  return new Function(request.body, "return 1");
}
function staticGlobalFallback() {
  // ok: request-data-evaluated-as-code
  return new Function("return this")();
}