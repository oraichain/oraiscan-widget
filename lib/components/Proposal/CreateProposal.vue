<script lang="ts" setup>
import { ref, toRaw } from 'vue';

const props = defineProps({
    sender: { type: String, required: true },
    denom: { type: String, required: true }
});

const types = [
    { title: "Text Proposal", value: "text_proposal" },
    { title: "Unbonding Time", value: "unboding_time" },
    { title: "Voting Period", value: "voting_period" },
    { title: "Community Tax", value: "community_tax" },
    { title: "Minimum Inflation", value: "minium_inflation" },
    { title: "Maximum Inflation", value: "maximum_inflation" },
    { title: "Minimum Deposit Amount", value: "minimum_deposit_amount" },
    { title: "Update Admin Proposal", value: "update_admin_proposal" },
    { title: "DAO Treasury Spend Proposal", value: "treasury_spend_proposal" },
];

const open = ref(false);
const type = ref("text_proposal");
const title = ref("");
const description = ref("");
const amount = ref(10);

function handleCreateProposal(e: Event) {
    e.preventDefault();
    console.log({ title: toRaw(title.value) });
    console.log({ description: toRaw(description.value) });
    console.log({ amount: toRaw(amount.value) });
}

</script>
<template>
    <div>
        <input v-model="open" type="checkbox" id="CreateProposal" class="modal-toggle" />
        <label for="CreateProposal" class="modal cursor-pointer">
            <label class="modal-box bg-base-100 rounded-lg" for="">
                <div v-if="!sender" class="text-center h-16 items-center">
                    No wallet connected!
                </div>
                <form class="flex gap-5 flex-col" :onsubmit="handleCreateProposal" method="get" v-if="sender">
                    <h1>Create Proposal</h1>
                    <select v-model="type"
                        class="h-10 w-1/2 border p-2 rounded-lg border-base-300 outline-none hover:cursor-pointer">
                        <option v-for="i in types" :value="i.value">{{ i.title }}</option>
                    </select>
                    <div class="flex flex-col gap-2">
                        <h2>Title</h2>
                        <input v-model="title" class="w-full h-10 rounded-lg border border-base-300 outline-none p-2"
                            placeholder="Enter title proposal" required />
                    </div>
                    <div class="flex flex-col gap-2">
                        <h2>Description</h2>
                        <textarea v-model="description"
                            class="w-full h-48 rounded-lg border border-base-300 outline-none p-2"
                            placeholder="Enter description proposal" required />
                    </div>
                    <div class="flex flex-col gap-2">
                        <h2>Deposit Amount (ORAI)</h2>
                        <input v-model="amount" class="w-full h-10 rounded-lg border border-base-300 outline-none p-2"
                            placeholder="Enter title proposal" type='number' :step="0.00000001" required>
                    </div>
                    <div class="flex flex-col gap-2">
                        <h2>Notes</h2>
                        <p>If the proposal cannot pass the deposit period, then all the deposited tokens will be burned.
                            So please create & choose the proposals wisely!</p>
                    </div>
                    <button class="!text-white btn grow bg-primary border-0 hover:brightness-150 hover:bg-primary"
                        type="submit">Create</button>
                </form>
            </label>
        </label>
    </div>
</template>

<script lang="ts">
export default {
    name: 'CreateProposal',
};
</script>
