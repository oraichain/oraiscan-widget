<script setup lang="ts">
import { reactive, ref, watch } from 'vue';
import { walletStation } from '../../walletStation';
import { VueEditor } from "vue3-editor";
import BigNumber from 'bignumber.js';
import { TYPE_PROPOSAL, VOTING_PERIOD_OPTIONS } from '../../../constants';
import { QueryClient } from '@cosmjs/stargate';
import { Tendermint37Client } from "@cosmjs/tendermint-rpc";
import {
    QueryModuleAccountByNameRequest,
    QueryModuleAccountByNameResponse,
} from "cosmjs-types/cosmos/auth/v1beta1/query";

const props = defineProps({
    sender: { type: String, required: true },
    denom: { type: String, required: true },
    chainId: { type: String, required: true },
    urlRpc: { type: String, required: true },
});

const { TEXT_PROPOSAL, UNBONDING_TIME, VOTING_PERIOD, COMMUNITY_TAX, INFLATION_MIN, INFLATION_MAX, DEPOSIT_PARAMS, UPDATE_ADMIN_PROPOSAL, COMMUNITY_POOL_SPEND_PROPOSAL } = TYPE_PROPOSAL;

const { VOTING_DAY, VOTING_TIME } = VOTING_PERIOD_OPTIONS;

const typesProposal = [
    { label: "Text Proposal", value: TEXT_PROPOSAL },
    { label: "Unbonding Time", value: UNBONDING_TIME },
    { label: "Voting Period", value: VOTING_PERIOD },
    { label: "Community Tax", value: COMMUNITY_TAX },
    { label: "Minimum Inflation", value: INFLATION_MIN },
    { label: "Maximum Inflation", value: INFLATION_MAX },
    { label: "Minimum Deposit Amount", value: DEPOSIT_PARAMS },
    { label: "Update Admin Proposal", value: UPDATE_ADMIN_PROPOSAL },
    { label: "DAO Treasury Spend Proposal", value: COMMUNITY_POOL_SPEND_PROPOSAL },
];

const votingFields = [
    {
        label: "Day",
        value: VOTING_DAY,
    },
    {
        label: "Time",
        value: VOTING_TIME,
    },
];

const emit = defineEmits(['viewTraction', 'viewProposal']);

const initData = {
    title: "",
    description: "",
    amount: 10,
    unbondingTime: 1209600,
    votingPeriodTime: "01:00:00",
    votingPeriodDay: 1,
    communityTax: 1,
    inflationMin: 1,
    inflationMax: 1,
    minDeposit: 10,
    newAdmin: "",
    contract: "",
    recipient: "",
    receiveAmount: 10
}

const open = ref(false);
const typeState = ref(TEXT_PROPOSAL);
const votingType = ref(VOTING_DAY);
const error = ref("");
const isCreating = ref(false);
const isEndProcess = ref(false);
const isSuccessfully = ref(false);
const txhash = ref("");
let formData = reactive({ ...initData });

watch(open, () => {
    if (!open.value) {
        Object.assign(formData, { ...initData });
        isEndProcess.value = false;
        error.value = "";
    }
})

const hmsToMiliSeconds = times => {
    const hmsArr = times.split(":");
    const seconds = +hmsArr[0] * 60 * 60 + +hmsArr[1] * 60 + +hmsArr[2];
    return new BigNumber(seconds).multipliedBy(new BigNumber(Math.pow(10, 9))).toFixed(0);
};

const handleDayTimePeriod = (days, times) => {
    if (days) {
        return new BigNumber(Math.round(days * 24 * 60 * 60)).multipliedBy(new BigNumber(Math.pow(10, 9))).toFixed(0);
    }
    return hmsToMiliSeconds(times);
};

const handleOptionData = data => {
    data.amount *= 10 ** 6;
    switch (typeState.value) {
        case VOTING_PERIOD:
            const { votingPeriodDay: days, votingPeriodTime: times } = data;
            return {
                ...data,
                subspace: "gov",
                key: VOTING_PERIOD,
                value: JSON.stringify({
                    voting_period: handleDayTimePeriod(days, times),
                }),
            };
        case DEPOSIT_PARAMS:
            return {
                ...data,
                subspace: "gov",
                key: DEPOSIT_PARAMS,
                value: JSON.stringify({
                    min_deposit: [{ denom: props.denom, amount: (data.minDeposit * 10 ** 6).toString() }],
                }),
            };
        case COMMUNITY_TAX:
            return {
                ...data,
                subspace: "distribution",
                key: COMMUNITY_TAX,
                value: JSON.stringify(JSON.stringify(data?.communityTax / 100)),
            };
        case INFLATION_MIN:
            return {
                ...data,
                subspace: "mint",
                key: INFLATION_MIN,
                value: JSON.stringify(JSON.stringify(data?.inflationMin / 100)),
            };
        case INFLATION_MAX:
            return {
                ...data,
                subspace: "mint",
                key: INFLATION_MAX,
                value: JSON.stringify(JSON.stringify(data?.inflationMax / 100)),
            };
        case TEXT_PROPOSAL:
            return {
                ...data,
                key: TEXT_PROPOSAL,
            };
        case UPDATE_ADMIN_PROPOSAL:
            return {
                ...data,
                key: UPDATE_ADMIN_PROPOSAL,
            };
        case COMMUNITY_POOL_SPEND_PROPOSAL:
            return {
                ...data,
                key: COMMUNITY_POOL_SPEND_PROPOSAL,
            };
        default:
            return {
                ...data,
                subspace: "staking",
                key: UNBONDING_TIME,
                value: JSON.stringify(new BigNumber(+data?.unbondingTime * Math.pow(10, 9)).toFixed(0))
            };
    }
};

const queryCosmos = async (
    client: QueryClient,
    requestType: any,
    reponseType: any,
    requestInfo: any,
    typeUrl: string
) => {
    console.log({
        client,
        requestType,
        reponseType,
        requestInfo,
        typeUrl
    })
    const requestData = Uint8Array.from(requestType.encode(requestInfo).finish());

    const { value } = await client.queryAbci(typeUrl, requestData);
    const res = reponseType.decode(value);

    console.log({ res })
    return res;
};

const queryGovAddress = async (urlRpc: string) => {
    const cometClient = await Tendermint37Client.connect(urlRpc);
    const queryClient = QueryClient.withExtensions(cometClient as any);

    const govRes = (await queryCosmos(
        queryClient,
        QueryModuleAccountByNameRequest,
        QueryModuleAccountByNameResponse,
        QueryModuleAccountByNameRequest.fromPartial({
            name: "gov",
        }),
        "/cosmos.auth.v1beta1.Query/ModuleAccountByName"
    )) as QueryModuleAccountByNameResponse;

    let govAddress: any = ""
    if (govRes.account)
        govAddress = QueryModuleAccountByNameResponse.decode(
            govRes.account?.value
        ).account?.typeUrl;

    return govAddress
}

const handleCreateProposal = async (e: Event) => {
    e.preventDefault();
    isCreating.value = true;
    error.value = "";
    const data = { ...formData };
    const newData = handleOptionData(data);
    const { title, description, subspace, key, value, amount, newAdmin, contract, recipient, receiveAmount } = newData;
    const { urlRpc, chainId, sender, denom } = props;

    const govAddress = "orai10d07y265gmmuvt4z0w9aw880jnsr700jf39xhq"

    let response: any;
    try {
        if (key === TEXT_PROPOSAL) {
            response = await walletStation.textProposal(sender, govAddress, { title, description, amount, denom }, { urlRpc, chainId });
        } else if (key == UPDATE_ADMIN_PROPOSAL) {
            response = await walletStation.updateAdminProposal(sender, govAddress, {
                title: title,
                description: description.trim(),
                newAdmin: newAdmin,
                contract: contract,
                denom,
                amount,
            }, { urlRpc, chainId });
        } else if (key == COMMUNITY_POOL_SPEND_PROPOSAL) {
            response = await walletStation.communityPoolSpendProposal(sender, govAddress,
                {
                    title,
                    description: description.trim(),
                    recipient,
                    amount: (receiveAmount * Math.pow(10, 6)).toString(),
                    denom,
                }, { urlRpc, chainId });
        } else {
            response = await walletStation.parameterChangeProposal(sender, govAddress, {
                title,
                description,
                amount,
                denom,
                subspace,
                value,
                key
            }, { urlRpc, chainId });
        }
        isEndProcess.value = true;
    } catch (err) {
        console.log({ err });
        error.value = err;
    }

    txhash.value = response?.transactionHash;

    if (response?.code === 0) {
        isSuccessfully.value = true;
    } else {
        isSuccessfully.value = false;
    }
    isCreating.value = false;
}

const viewTransaction = () => {
    emit('viewTraction', { txhash: txhash.value });
    open.value = false;
}

const viewProposal = () => {
    open.value = false;
    emit('viewProposal');
}

</script>
<template>
    <div>
        <input v-model="open" type="checkbox" id="CreateProposal" class="modal-toggle" />
        <label for="CreateProposal" class="modal cursor-pointer" v-if="open">
            <label class="modal-box bg-base-100 rounded-lg" for="" v-if="!isEndProcess">
                <div v-if="!sender" class="text-center h-16 items-center">
                    No wallet connected!
                </div>
                <form class="flex gap-5 flex-col" :onsubmit="handleCreateProposal" method="get" v-if="sender">
                    <h1 class="text-white text-2xl">Create Proposal</h1>
                    <div class="flex flex-col gap-2">
                        <h2>Type Proposal</h2>
                        <select v-model="typeState"
                            class="h-10 w-1/2 border p-2 rounded-lg border-base-300 outline-none hover:cursor-pointer text-white">
                            <option v-for="i in typesProposal" :value="i.value">{{ i.label }}</option>
                        </select>
                    </div>

                    <div class="flex flex-col gap-2">
                        <h2>Title</h2>
                        <input v-model="formData.title"
                            class="w-full h-10 rounded-lg border border-base-300 outline-none p-2 text-white"
                            placeholder="Enter title proposal" required />
                    </div>
                    <div class="flex flex-col gap-2">
                        <h2>Description</h2>
                        <vue-editor id="editor" useCustomImageHandler="false"
                            v-model="formData.description"></vue-editor>
                    </div>
                    <div class="flex flex-col gap-2">
                        <h2>Deposit Amount ({{ denom }})</h2>
                        <input v-model="formData.amount"
                            class="w-full h-10 rounded-lg border border-base-300 outline-none p-2 text-white"
                            placeholder="Enter deposit amount" type="number" :step="0.00000001" min="0" required>
                    </div>

                    <!-- Unbonding Time -->
                    <div class="flex flex-col gap-2" v-if="typeState === UNBONDING_TIME">
                        <h2>Unbonding time</h2>
                        <input v-model="formData.unbondingTime"
                            class="w-full h-10 rounded-lg border border-base-300 outline-none p-2 text-white"
                            placeholder="Enter unbonding time" type="number" required>
                    </div>

                    <!-- Voting Period -->
                    <div class="flex flex-col gap-2" v-if="typeState === VOTING_PERIOD">
                        <h2>Voting Period</h2>
                        <div class="flex gap-2">
                            <select v-model="votingType"
                                class="h-10 w-1/3 border p-2 rounded-lg border-base-300 outline-none hover:cursor-pointer text-white">
                                <option v-for="i in votingFields" :value="i.value">{{ i.label }}</option>
                            </select>
                            <input v-if="votingType === VOTING_DAY"
                                class="h-10 w-2/3 rounded-lg border border-base-300 outline-none p-2 text-white"
                                type="number" min=1 v-model="formData.votingPeriodDay" required>
                            <input v-else
                                class="h-10 w-2/3 rounded-lg border border-base-300 outline-none p-2 text-white"
                                v-model="formData.votingPeriodTime" type="time" step="1" required>
                        </div>
                    </div>

                    <!-- Community Tax -->
                    <div class="flex flex-col gap-2" v-if="typeState === COMMUNITY_TAX">
                        <h2>Community Tax (%)</h2>
                        <input v-model="formData.communityTax"
                            class="w-full h-10 rounded-lg border border-base-300 outline-none p-2 text-white"
                            placeholder="Enter community tax" type="number" required>
                    </div>

                    <!-- Inflation Min -->
                    <div class="flex flex-col gap-2" v-if="typeState === INFLATION_MIN">
                        <h2>Minimum Inflation (%)</h2>
                        <input v-model="formData.inflationMin"
                            class="w-full h-10 rounded-lg border border-base-300 outline-none p-2 text-white"
                            placeholder="Enter minimum inflation" type="number" required>
                    </div>

                    <!-- Inflation Max -->
                    <div class="flex flex-col gap-2" v-if="typeState === INFLATION_MAX">
                        <h2>Maximum Inflation (%)</h2>
                        <input v-model="formData.inflationMax"
                            class="w-full h-10 rounded-lg border border-base-300 outline-none p-2 text-white"
                            placeholder="Enter maximum inflation" type="number" required>
                    </div>

                    <!-- Min Deposit Amount -->
                    <div class="flex flex-col gap-2" v-if="typeState === DEPOSIT_PARAMS">
                        <h2>Minimum Deposit Amount ({{ denom }})</h2>
                        <input v-model="formData.minDeposit"
                            class="w-full h-10 rounded-lg border border-base-300 outline-none p-2 text-white"
                            placeholder="Enter minimum deposit amount" type="number" required>
                    </div>

                    <!-- Update Admin Proposal -->
                    <div class="flex flex-col gap-2" v-if="typeState === UPDATE_ADMIN_PROPOSAL">
                        <h2>New Admin</h2>
                        <input v-model="formData.newAdmin"
                            class="w-full h-10 rounded-lg border border-base-300 outline-none p-2 text-white"
                            placeholder="Enter new admin" type="text" required>
                    </div>

                    <div class="flex flex-col gap-2" v-if="typeState === UPDATE_ADMIN_PROPOSAL">
                        <h2>Contract</h2>
                        <input v-model="formData.contract"
                            class="w-full h-10 rounded-lg border border-base-300 outline-none p-2 text-white"
                            placeholder="Enter contract" type="text" required>
                    </div>

                    <!-- DAO Treasury Spend Proposal -->
                    <div class="flex flex-col gap-2" v-if="typeState === COMMUNITY_POOL_SPEND_PROPOSAL">
                        <h2>Recipient</h2>
                        <input v-model="formData.recipient"
                            class="w-full h-10 rounded-lg border border-base-300 outline-none p-2 text-white"
                            placeholder="Enter recipient" type="text" required>
                    </div>

                    <div class="flex flex-col gap-2" v-if="typeState === COMMUNITY_POOL_SPEND_PROPOSAL">
                        <h2>Amount({{ denom }})</h2>
                        <input v-model="formData.receiveAmount"
                            class="w-full h-10 rounded-lg border border-base-300 outline-none p-2 text-white"
                            placeholder="Enter amount" type="number" min="0" required>
                    </div>

                    <div class="flex flex-col gap-2">
                        <h2>Notes</h2>
                        <p class="text-sm">If the proposal cannot pass the deposit period, then all the deposited tokens
                            will be burned.
                            So please create & choose the proposals wisely!</p>
                    </div>

                    <div v-show="error" class="alert alert-error shadow-lg" @click="error = ''">
                        <div class="flex">
                            <svg xmlns="http://www.w3.org/2000/svg" class="stroke-current flex-shrink-0 h-6 w-6"
                                fill="none" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                    d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span>{{ error }}.</span>
                        </div>
                    </div>

                    <button class="!text-white btn grow bg-primary border-0 hover:brightness-150 hover:bg-primary"
                        type="submit">
                        <span v-if="isCreating" :class="isCreating ? 'loading loading-spinner' : ''"></span>
                        Create</button>
                </form>
            </label>
            <label class="modal-box bg-base-100 rounded-lg" for="" v-else>
                <div v-if="isSuccessfully" class="flex flex-col items-center justify-center gap-5 w-full">
                    <p class="font-bold text-green-500">Create Proposal Successfully</p>
                    <button
                        class="!text-white btn grow bg-primary border-0 hover:brightness-150 hover:bg-primary w-full"
                        @click="viewProposal">View
                        Proposal</button>
                </div>
                <div v-else>
                    <p class="font-bold text-red-500">Create Proposal Failed</p>
                    <button
                        class="!text-white btn grow bg-primary border-0 hover:brightness-150 hover:bg-primary w-full"
                        @click="viewTransaction">View
                        Transaction</button>
                </div>
            </label>
        </label>
    </div>
</template>

<style lang="css">
.ql-toolbar.ql-snow {
    border-radius: 10px 10px 0px 0px;
    border: 1px solid #383B40;
}

.ql-container.ql-snow {
    border-radius: 0px 0px 10px 10px;
    border: 1px solid #383B40;
}
</style>

<script lang="ts">
export default {
    name: 'CreateProposal',
};
</script>
