<script lang="ts" setup>
import { PropType, computed, onMounted, ref } from 'vue';
import { getDelegations } from '../../../utils/http';
import { Coin, CoinMetadata } from '../../../utils/type';
import { TokenUnitConverter } from '../../../utils/TokenUnitConverter';
import { DelegationResponse } from 'cosmjs-types/cosmos/staking/v1beta1/staking';
import { Metadata } from 'cosmjs-types/cosmos/bank/v1beta1/bank';

const props = defineProps({
    endpoint: { type: String, required: true },
    sender: { type: String, required: true },
    metadata: Object as PropType<Record<string, Metadata>>,
    params: String,
});

const params = computed(() => JSON.parse(props.params || '{}'));
const delegation = ref({} as DelegationResponse | undefined);
const amount = ref('');
const amountDenom = ref('');
const error = ref('');

const msgs = computed(() => {
    const convert = new TokenUnitConverter(props.metadata);
    if (!delegation.value) return [];
    return [
        {
            typeUrl: '/cosmos.staking.v1beta1.MsgUndelegate',
            value: {
                delegatorAddress: props.sender,
                validatorAddress: params.value.validator_address,
                amount: convert.displayToBase(delegation.value.balance?.denom, {
                    amount: String(amount.value),
                    denom: amountDenom.value,
                }),
            },
        },
    ];
});

const units = computed(() => {
    if (!delegation.value) return [];
    const denom = delegation.value.balance?.denom;
    if (!props.metadata || !props.metadata[denom]) {
        amountDenom.value = denom;
        return [{ denom: denom, exponent: 0, aliases: [] }];
    }
    const list = props.metadata[denom].denomUnits.sort(
        (a, b) => b.exponent - a.exponent
    );
    if (list.length > 0) amountDenom.value = list[0].denom;
    return list;
});

const isValid = computed(() => {
    let ok = true;
    let error = '';
    if (!props.sender) {
        ok = false;
        error = 'Sender is empty';
    }
    if (!params.value.validator_address) {
        ok = false;
        error = 'Validator is empty';
    }
    if (!(Number(amount.value) > 0)) {
        ok = false;
        error = 'Amount should be great than 0';
    }
    return { ok, error };
});

function initial() {
    getDelegations(props.endpoint, params.value.validator_address, props.sender)
        .then((x) => {
            delegation.value = x.delegationResponse;
        })
        .catch((err) => {
            error.value = err;
        });
}

const available = computed(() => {
    const convert = new TokenUnitConverter(props.metadata);
    const base = delegation.value?.balance || { amount: '', denom: '' };
    return {
        base,
        display: convert.baseToUnit(base, amountDenom.value),
    };
});

defineExpose({ msgs, isValid, initial });
</script>
<template>
    <div>
        <div class="form-control">
            <label class="label">
                <span class="label-text">Sender</span>
            </label>
            <input
                :value="sender"
                type="text"
                class="text-gray-600 dark:text-white input border !border-gray-300 dark:!border-gray-600"
            />
        </div>
        <div class="form-control">
            <label class="label">
                <span class="label-text">Amount</span>
            </label>
            <label class="join">
                <div class="w-full relative flex justify-center items-center">
                    <input v-model="amount" type="number" :placeholder="`Available: ${available?.display.amount}`"
                        class="input border border-gray-300 dark:border-gray-600 w-full join-item text-white" />
                    <button
                        class="absolute right-2 p-1 z-10 bg-[rgb(46,46,51)] text-white hover:bg-[hsl(222,6%,43%)] text-sm"
                        @click="amount = available?.display.amount">Max</button>
                </div>
                <select v-model="amountDenom" class="select select-bordered join-item text-white">
                    <option v-for="u in units" class="text-white">{{ u.denom }}</option>
                </select>
            </label>
        </div>
        <div class="text-error">{{ error }}</div>
    </div>
</template>
