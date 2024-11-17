// @ts-nocheck
import { TextProposal } from 'cosmjs-types/cosmos/gov/v1beta1/gov';
import { Any } from 'cosmjs-types/google/protobuf/any';
import { createWasmAminoConverters } from '@cosmjs/cosmwasm-stargate/build/modules/wasm/aminomessages';
import { createStakingAminoConverters } from '@cosmjs/stargate/build/modules/staking/aminomessages';
import { createDistributionAminoConverters } from '@cosmjs/stargate/build/modules/distribution/aminomessages';
import { createBankAminoConverters } from '@cosmjs/stargate/build/modules/bank/aminomessages';
import { createGovAminoConverters } from '@cosmjs/stargate/build/modules/gov/aminomessages';
import { ParameterChangeProposal } from 'cosmjs-types/cosmos/params/v1beta1/params';
import {
    MsgDeposit,
    MsgSubmitProposal,
    MsgVote,
} from 'cosmjs-types/cosmos/gov/v1beta1/tx';
import { UpdateAdminProposal } from 'cosmjs-types/cosmwasm/wasm/v1/proposal';
import { CommunityPoolSpendProposal } from "cosmjs-types/cosmos/distribution/v1beta1/distribution";
import { GasPrice, AminoTypes } from '@cosmjs/stargate';
import * as cosmwasm from '@cosmjs/cosmwasm-stargate';
import { Decimal } from '@cosmjs/math';

export default class WalletStation {
    constructor() {}

    collectWallet = async (chainId: string) => {
        // @ts-ignore
        return window.getOfflineSigner(chainId);
    };

    signerClient = async (urlRpc, wallet, denom) => {
        const aminoTypes = new AminoTypes({
            ...createStakingAminoConverters(),
            ...createDistributionAminoConverters(),
            ...createBankAminoConverters(),
            ...createWasmAminoConverters(),
            ...createGovAminoConverters(),
        });
        console.log({ urlRpc });
        return await cosmwasm.SigningCosmWasmClient.connectWithSigner(
            urlRpc,
            wallet,
            {
                gasPrice: new GasPrice(Decimal.fromUserInput('0', 6), denom),
                prefix: denom,
                aminoTypes,
            }
        );
    };

    signAndBroadCast = async (
        urlRpc: string,
        denom: string,
        chainId: string,
        address: any,
        messages: any
    ) => {
        try {
            const wallet = await this.collectWallet(chainId);
            console.log({ wallet });
            const client = await this.signerClient(urlRpc, wallet, denom);
            console.log({ client });
            const result = await client.signAndBroadcast(
                address,
                messages,
                'auto'
            );
            return result;
        } catch (error) {
            console.log('signAndBroadcast msg error: ', error);
            throw error;
        }
    };

    textProposal = async (
        urlRpc: string,
        denom: string,
        chainId: string,
        proposer: any,
        amount: any,
        changeInfo: any
    ) => {
        console.log({ urlRpc, denom, chainId, amount });
        const initial_deposit = [{ denom, amount: amount.toString() }];
        const message = {
            typeUrl: '/cosmos.gov.v1beta1.MsgSubmitProposal',
            value: {
                content: Any.fromPartial({
                    typeUrl: '/cosmos.gov.v1beta1.TextProposal',
                    value: TextProposal.encode(changeInfo).finish(),
                }),
                proposer: proposer,
                initialDeposit: initial_deposit,
            },
        };
        return this.signAndBroadCast(urlRpc, denom, chainId, proposer, [
            message,
        ]);
    };

    updateAdminProposal = async (
        urlRpc,
        denom,
        chainId,
        proposer,
        amount,
        change_info
    ) => {
        const initial_deposit = [{ denom, amount: amount.toString() }];
        const message = {
            typeUrl: '/cosmos.gov.v1beta1.MsgSubmitProposal',
            value: MsgSubmitProposal.fromPartial({
                content: Any.fromPartial({
                    typeUrl: '/cosmwasm.wasm.v1.UpdateAdminProposal',
                    value: UpdateAdminProposal.encode(change_info).finish(),
                }),
                proposer: proposer,
                initialDeposit: initial_deposit,
            }),
        };
        return this.signAndBroadCast(urlRpc, denom, chainId, proposer, [
            message,
        ]);
    };

    communityPoolSpendProposal = async (
        urlRpc,
        denom,
        chainId,
        sender,
        amount,
        community_pool_info
    ) => {
        const initial_deposit = [{ denom, amount: amount.toString() }];
        const message = {
            typeUrl: '/cosmos.gov.v1beta1.MsgSubmitProposal',
            value: {
                content: Any.fromPartial({
                    typeUrl:
                        '/cosmos.distribution.v1beta1.CommunityPoolSpendProposal',
                    value: CommunityPoolSpendProposal.encode(
                        community_pool_info
                    ).finish(),
                }),
                proposer: sender,
                initialDeposit: initial_deposit,
            },
        };
        return this.signAndBroadCast(urlRpc, denom, chainId, sender, [
            message,
        ]);
    };

    parameterChangeProposal = async (
        urlRpc,
        denom,
        chainId,
        proposer,
        amount,
        changeInfo
    ) => {
        const initial_deposit = [{ denom, amount: amount.toString() }];
        const message = {
            typeUrl: '/cosmos.gov.v1beta1.MsgSubmitProposal',
            value: {
                content: Any.fromPartial({
                    typeUrl: '/cosmos.params.v1beta1.ParameterChangeProposal',
                    value: ParameterChangeProposal.encode(changeInfo).finish(),
                }),
                proposer: proposer,
                initialDeposit: initial_deposit,
            },
        };
        return this.signAndBroadCast(urlRpc, denom, chainId, proposer, [
            message,
        ]);
    };
}

export const walletStation = new WalletStation();
