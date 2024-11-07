<script lang="ts" setup>
import { ComputedRef, PropType, computed, onMounted, ref } from 'vue';
import {
    getActiveValidators,
    getDelegations,
    getInactiveValidators,
    getStakingParam,
} from '../../../utils/http';
import { decimal2percent } from '../../../utils/format';
import { TokenUnitConverter } from '../../../utils/TokenUnitConverter';
import { Coin } from 'cosmjs-types/cosmos/base/v1beta1/coin';
import { Metadata } from 'cosmjs-types/cosmos/bank/v1beta1/bank';
import {
    Validator,
    BondStatus,
} from 'cosmjs-types/cosmos/staking/v1beta1/staking';

const props = defineProps({
    endpoint: { type: String, required: true },
    sender: { type: String, required: true },
    balances: Object as PropType<Coin[]>,
    metadata: Object as PropType<Record<string, Metadata>>,
    params: String,
});
const params = computed(() => JSON.parse(props.params || '{}'));

const validator = ref('');

const activeValidators = ref([] as Validator[]);
const inactiveValidators = ref([]);
const stakingDenom = ref('');
const amount = ref('');
const amountDenom = ref('');
const delegation = ref({} as Coin | undefined);
const error = ref('');

const sourceValidator = computed(() => {
    const v = activeValidators.value.find(
        // @ts-ignore
        (v) => v.operatorAddress === params.validator_address
    );
    if (v) {
        // @ts-ignore
        return `${v.description.moniker} (${decimal2percent(
            v.commission.commissionRates.rate
        )}%)`;
    }
    return params.value.validator_address;
});

const msgs = computed(() => {
    const convert = new TokenUnitConverter(props.metadata);
    return [
        {
            typeUrl: '/cosmos.staking.v1beta1.MsgBeginRedelegate',
            value: {
                delegatorAddress: props.sender,
                validatorSrcAddress: params.value.validator_address,
                validatorDstAddress: validator.value,
                amount: convert.displayToBase(delegation.value?.denom ?? '', {
                    amount: String(amount.value),
                    denom: amountDenom.value,
                }),
            },
        },
    ];
});

const list: ComputedRef<Validator[]> = computed(() => {
    return [...activeValidators.value, ...inactiveValidators.value];
});

const available = computed(() => {
    const convert = new TokenUnitConverter(props.metadata);
    const base = delegation.value || { amount: '0', denom: stakingDenom.value };
    return {
        base,
        display: convert.baseToUnit(base, amountDenom.value),
    };
});

const units = computed(() => {
    if (!props.metadata || !props.metadata[stakingDenom.value]) {
        amountDenom.value = stakingDenom.value;
        return [{ denom: stakingDenom.value, exponent: 0, aliases: [] }];
    }
    const list = props.metadata[stakingDenom.value].denomUnits.sort(
        (a, b) => b.exponent - a.exponent
    );
    if (list.length > 0) amountDenom.value = list[0].denom;
    return list;
});

const isValid = computed(() => {
    let ok = true;
    let error = '';
    if (!validator.value) {
        ok = false;
        error = 'Validator is empty';
    }
    if (!validator.value) {
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
            delegation.value = x.delegationResponse?.balance;
        })
        .catch((err) => {
            error.value = err;
        });

    getStakingParam(props.endpoint).then((x) => {
        stakingDenom.value = x.params.bondDenom;
        // unbondingTime.value = x.params.unbonding_time;
    });

    getActiveValidators(props.endpoint).then((x) => {
        activeValidators.value = x.validators;
        validator.value =
            x.validators.find(
                (v) => v.description.identity === '6783E9F948541962'
            )?.operatorAddress ?? '';
    });
}

defineExpose({ msgs, isValid, initial });
</script>
<template>
    <div>
        <div class="form-control">
            <label class="label">
                <span class="label-text">Sender</span>
            </label>
            <input :value="sender" type="text"
                class="text-gray-600 dark:text-white input border !border-gray-300 dark:!border-gray-600" />
        </div>
        <div class="form-control">
            <label class="label">
                <span class="label-text">Source Validator</span>
            </label>
            <input :value="sourceValidator" type="text" class="input border border-gray-300 dark:border-gray-600 text-white"
                readonly />
        </div>
        <div class="form-control">
            <label class="label">
                <span class="label-text">Destination Validator</span>
            </label>
            <select v-model="validator" class="select select-bordered text-white">
                <option value="">Select a validator</option>
                <option v-for="v in list" :value="v.operatorAddress">
                    {{ v.description.moniker }}
                    ({{
                    Number(decimal2percent(v.commission.commissionRates.rate)) / 1e18
                    }}%)
                    <span v-if="v.status !== BondStatus.BOND_STATUS_BONDED">x</span>
                </option>
            </select>
        </div>
        <div class="form-control">
            <label class="label">
                <span class="label-text">Amount</span>
                <!-- <span>{{ available?.display.amount
                    }}{{ available?.display.denom }}</span> -->
                <span>{{ available?.display.amount
                    }}</span>
            </label>
            <!-- <label class="join">
                <div class="w-full relative flex justify-center items-center">
                    <input v-model="amount" type="number"
                        :placeholder="`Available: ${available?.display.amount}${available?.display.denom}`"
                        class="input border border-gray-300 dark:border-gray-600 w-full" />
                    <button
                        class="absolute right-1 px-2 !h-[80%] z-10 bg-[rgb(46,46,51)] text-white hover:bg-[hsl(222,6%,43%)] text-sm rounded-sm"
                        @click="amount = available?.display.amount">Max</button>
                </div>

                <select v-model="amountDenom" class="select select-bordered">
                    <option v-for="u in units" class="text-white">{{ u.denom }}</option>
                </select>
            </label> -->

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
        <div class="text-error">
            {{ error }}
        </div>
    </div>
</template>
