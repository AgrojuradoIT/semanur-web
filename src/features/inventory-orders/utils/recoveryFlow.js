import { needsOperationLookup, classifyOperationLookup } from './recovery.js';

/**
 * Flujo de operación idempotente con recuperación (plan secciones 9 y 17):
 * conserva el MISMO client_operation_id mientras la intención no cambie, y
 * ante una respuesta incierta (timeout/5xx) consulta la operación almacenada
 * antes de ofrecer un reintento. Fábrica sin Vue, testeable en node:test.
 */
export function createRecoveryFlow({ apiGetOperation, uuidFactory }) {
  let operationId = null;
  let operationSignature = null;

  const state = {
    uncertain: false,
    lastError: null,
    result: null,
    lookup: null,
  };

  function idFor(signature) {
    const next = typeof signature === 'string' ? signature : JSON.stringify(signature);

    if (!operationId || operationSignature !== next) {
      operationId = uuidFactory();
      operationSignature = next;
    }

    return operationId;
  }

  function currentOperationId() {
    return operationId;
  }

  async function execute({ command, orderUuid, signature, executor }) {
    state.lastError = null;
    state.lookup = null;
    state.uncertain = false;

    const uuid = idFor(signature ?? command);

    try {
      const response = await executor(uuid);
      state.result = response;
      reset();
      return { status: 'ok', response, operationId: uuid };
    } catch (error) {
      state.lastError = error;

      if (!needsOperationLookup(error)) {
        // Rechazo definido (409/422/403...): cambiar de intención es seguro.
        reset();
        return { status: 'error', error, operationId: uuid };
      }

      state.uncertain = true;
      return { status: 'uncertain', error, operationId: uuid };
    }
  }

  async function consult({ command, orderUuid }) {
    if (!operationId || !orderUuid) {
      return { status: 'sin_operacion', operationId };
    }

    try {
      const response = await apiGetOperation(orderUuid, command, operationId);
      state.result = response;
      state.uncertain = false;
      state.lookup = 'recuperada';
      const recuperada = { status: 'recuperada', response, operationId };
      reset();
      return recuperada;
    } catch (error) {
      const classification = classifyOperationLookup(error?.response?.status ?? 0);
      state.lookup = classification;
      state.lastError = error;

      return { status: classification, error, operationId };
    }
  }

  function reset() {
    operationId = null;
    operationSignature = null;
    state.uncertain = false;
  }

  return {
    state,
    idFor,
    currentOperationId,
    execute,
    consult,
    reset,
  };
}
