<script lang="ts" setup>
import { ComputedRef, PropType, computed, ref } from 'vue';
import { TokenUnitConverter } from '../../../utils/TokenUnitConverter';
import { decimal2percent } from '../../../utils/format';
import {
    getActiveValidators,
    getInactiveValidators,
    getStakingParam,
} from '../../../utils/http';
import { Coin, CoinMetadata } from '../../../utils/type';
import {
    BondStatus,
    Validator,
} from 'cosmjs-types/cosmos/staking/v1beta1/staking';
import { Metadata } from 'cosmjs-types/cosmos/bank/v1beta1/bank';
import { fromTimestamp } from 'cosmjs-types/helpers';

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
const inactiveValidators = ref([] as Validator[]);
const stakingDenom = ref('');
const unbondingTime = ref('');
const amount = ref('');
const amountDenom = ref('');

const msgs = computed(() => {
    const convert = new TokenUnitConverter(props.metadata);
    return [
        {
            typeUrl: '/cosmos.staking.v1beta1.MsgDelegate',
            value: {
                delegatorAddress: props.sender,
                validatorAddress: validator.value,
                amount: convert.displayToBase(stakingDenom.value, {
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
    const base = props.balances?.find(
        (x) => x.denom === stakingDenom.value
    ) || { amount: '0', denom: stakingDenom.value };
    return {
        base,
        display: convert.baseToUnit(base, amountDenom.value),
    };
});

function loadInactiveValidators() {
    getInactiveValidators(props.endpoint).then((x) => {
        inactiveValidators.value = x.validators;
    });
}

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
    if (!(Number(amount.value) > 0)) {
        ok = false;
        error = 'Amount should be great than 0';
    }
    if (!amountDenom.value) {
        ok = false;
        error = 'Amount Denom is empty';
    }
    return { ok, error };
});

function initial() {
    activeValidators.value = [];
    validator.value = params.value.validator_address;
    getStakingParam(props.endpoint).then((x) => {
        stakingDenom.value = x.params.bondDenom;
        unbondingTime.value = fromTimestamp(
            x.params.unbondingTime
        ).toDateString();
    });

    getActiveValidators(props.endpoint).then((x) => {
        activeValidators.value = x.validators;
        if (!params.value.validator_address) {
            validator.value =
                x.validators.find(
                    (v) => v.description.identity === '6783E9F948541962'
                )?.operatorAddress ?? '';
        }
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
            <input
                :value="sender"
                type="text"
                class="text-gray-600 dark:text-white input border !border-gray-300 dark:!border-gray-600"
            />
        </div>
        <div class="form-control">
            <label class="label">
                <span class="label-text">Validator</span>
                <a class="label-text" @click="loadInactiveValidators()"
                    >Show Inactive</a
                >
            </label>
            <select v-model="validator" class="select select-bordered">
                <option value="">Select a validator</option>
                <option v-for="v in list" :value="v.operatorAddress">
                    {{ v.description.moniker }} ({{
                        decimal2percent(v.commission.commissionRates.rate)
                    }}%)
                    <span v-if="v.status !== BondStatus.BOND_STATUS_BONDED"
                        >x</span
                    >
                </option>
            </select>
        </div>
        <div class="form-control">
            <label class="label">
                <span class="label-text">Amount</span>
                <span>
                    {{ available?.display.amount }}
                    {{ available?.display.denom }}
                </span>
            </label>
            <label class="join">
                <input
                    v-model="amount"
                    type="number"
                    :placeholder="`Available: ${available?.display.amount}`"
                    class="input border border-gray-300 dark:border-gray-600 w-full join-item"
                />
                <select
                    v-model="amountDenom"
                    class="select select-bordered join-item"
                >
                    <option v-for="u in units">{{ u.denom }}</option>
                </select>
            </label>
        </div>
    </div>
</template>
