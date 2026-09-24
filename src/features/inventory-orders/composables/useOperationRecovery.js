import { computed, ref } from 'vue';

import { getOperationResult } from '../services/inventoryOrdersService';
import { generateClientOperationId } from '../../../shared/utils/clientOperation';
import { createRecoveryFlow } from '../utils/recoveryFlow';

/**
 * Confirmación con recuperación (plan secciones 9 y 17).
 *
 * Mientras la respuesta es incierta se conserva el mismo UUID; la UI consulta
 * la operación almacenada antes de ofrecer repetir. Un rechazo definido
 * (409/422) libera el UUID porque cambiar la intención es seguro.
 */
export function useOperationRecovery() {
  const flow = createRecoveryFlow({
    apiGetOperation: getOperationResult,
    uuidFactory: generateClientOperationId,
  });

  const submitting = ref(false);
  const uncertain = ref(false);
  const lookup = ref(null);
  const result = ref(null);
  const lastError = ref(null);

  async function execute({ command, orderUuid, signature, executor }) {
    if (submitting.value) return { status: 'busy' };

    submitting.value = true;
    lookup.value = null;

    try {
      const outcome = await flow.execute({ command, orderUuid, signature, executor });

      uncertain.value = outcome.status === 'uncertain';
      lastError.value = outcome.error ?? null;
      if (outcome.response !== undefined) result.value = outcome.response;

      return outcome;
    } finally {
      submitting.value = false;
    }
  }

  async function consult({ command, orderUuid }) {
    submitting.value = true;

    try {
      const outcome = await flow.consult({ command, orderUuid });

      lookup.value = outcome.status;
      if (outcome.response !== undefined) result.value = outcome.response;
      uncertain.value = !['recuperada', 'no_registrada'].includes(outcome.status);

      return outcome;
    } finally {
      submitting.value = false;
    }
  }

  function reset() {
    flow.reset();
    uncertain.value = false;
    lookup.value = null;
    result.value = null;
    lastError.value = null;
  }

  return {
    submitting,
    busy: computed(() => submitting.value),
    uncertain: computed(() => uncertain.value),
    lookup: computed(() => lookup.value),
    lastError: computed(() => lastError.value),
    result: computed(() => result.value),
    operationId: computed(() => flow.currentOperationId()),
    execute,
    consult,
    reset,
  };
}
