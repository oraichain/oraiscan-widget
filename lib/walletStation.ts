// @ts-nocheck
import { Decimal } from '@cosmjs/math';
import { coin } from '@cosmjs/amino';
import {
    AminoTypes,
    GasPrice,
    createStakingAminoConverters,
    createDistributionAminoConverters,
    createBankAminoConverters,
    createGovAminoConverters,
} from '@cosmjs/stargate';
import { createWasmAminoConverters } from '@cosmjs/cosmwasm-stargate';
import {
    MsgSubmitProposal,
    MsgExecLegacyContent,
} from 'cosmjs-types/cosmos/gov/v1/tx';
import { MsgUpdateAdmin } from 'cosmjs-types/cosmwasm/wasm/v1/tx';
import { TextProposal } from 'cosmjs-types/cosmos/gov/v1beta1/gov';
import {
    ParameterChangeProposal,
    ParamChange,
} from 'cosmjs-types/cosmos/params/v1beta1/params';
import { MsgCommunityPoolSpend } from 'cosmjs-types/cosmos/distribution/v1beta1/tx';
import * as cosmwasm from '@cosmjs/cosmwasm-stargate';

export default class WalletStation {
    constructor() {}

    collectWallet = async (chainId: string) => {
        // @ts-ignore
        return window.getOfflineSigner(chainId);
    };

    signerClient = async (urlRpc: string, wallet: any, denom: string) => {
        const aminoTypes = new AminoTypes({
            ...createStakingAminoConverters(),
            ...createDistributionAminoConverters(),
            ...createBankAminoConverters(),
            ...createWasmAminoConverters(),
            ...createGovAminoConverters(),
        });
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
        chainInfo: {
            urlRpc: string;
            chainId: string;
        },
        denom: string,
        sender: string,
        messages: any
    ) => {
        try {
            const wallet = await this.collectWallet(chainInfo?.chainId);
            console.log({ wallet });
            const client = await this.signerClient(
                chainInfo?.urlRpc,
                wallet,
                denom
            );
            console.log({ client });
            const result = await client.signAndBroadcast(
                sender,
                messages,
                'auto'
            );
            console.log({ result });
            return result;
        } catch (error) {
            console.log('signAndBroadcast msg error: ', error);
            throw error;
        }
    };

    textProposal = async (
        sender: string,
        govAddress: string,
        changeInfo: {
            title: string;
            description: string;
            denom: string;
            amount: any;
        },
        chainInfo: {
            urlRpc: string;
            chainId: string;
        }
    ) => {
        const textProposalInfo = TextProposal.fromPartial({
            title: changeInfo.title,
            description: changeInfo.description,
        });

        const message = {
            typeUrl: '/cosmos.gov.v1.MsgSubmitProposal',
            value: MsgSubmitProposal.fromPartial({
                messages: [
                    {
                        typeUrl: '/cosmos.gov.v1.MsgExecLegacyContent',
                        value: MsgExecLegacyContent.encode({
                            authority: govAddress,
                            content: {
                                typeUrl: '/cosmos.gov.v1beta1.TextProposal',
                                value: TextProposal.encode(
                                    textProposalInfo
                                ).finish(),
                            },
                        }).finish(),
                    },
                ],
                initialDeposit: [coin(changeInfo.amount, changeInfo.denom)],
                proposer: sender,
                title: textProposalInfo.title,
                summary: textProposalInfo.description,
                metadata: '',
            }),
        };

        return this.signAndBroadCast(
            chainInfo,
            changeInfo.denom,
            sender,
            [message]
        );
    };

    updateAdminProposal = async (
        sender: string,
        govAddress: string,
        changeInfo: {
            contract: string;
            description: string;
            newAdmin: string;
            title: string;
            denom: string;
            amount: any;
        },
        chainInfo: {
            urlRpc: string;
            chainId: string;
        }
    ) => {
        const message = {
            typeUrl: '/cosmos.gov.v1.MsgSubmitProposal',
            value: MsgSubmitProposal.fromPartial({
                messages: [
                    {
                        typeUrl: '/cosmwasm.wasm.v1.MsgUpdateAdmin',
                        value: MsgUpdateAdmin.encode({
                            contract: changeInfo.contract,
                            newAdmin: changeInfo.newAdmin,
                            sender: govAddress,
                        }).finish(),
                    },
                ],
                initialDeposit: [coin(changeInfo.amount, changeInfo.denom)],
                proposer: sender,
                title: changeInfo.title,
                summary: changeInfo.description,
                metadata: '',
                expedited: true,
            } as any),
        };

        return this.signAndBroadCast(
            chainInfo,
            changeInfo.denom,
            sender,
            [message]
        );
    };

    communityPoolSpendProposal = async (sender: string, govAddress: string, changeInfo: {
        title: string;
        description: string;
        recipient: string;
        denom: string;
        amount: any;
        deposit: any
    }, 
        chainInfo: {
            urlRpc: string;
            chainId: string;
    }) => {
        const communityPoolInfo = MsgCommunityPoolSpend.fromPartial({
            amount: [
                {
                    amount: changeInfo.amount,
                    denom: changeInfo.denom,
                },
            ],
            authority: govAddress,
            recipient: changeInfo.recipient,
        });
        const message = {
            typeUrl: '/cosmos.gov.v1.MsgSubmitProposal',
            value: MsgSubmitProposal.fromPartial({
                messages: [
                    {
                        typeUrl:
                            '/cosmos.distribution.v1beta1.MsgCommunityPoolSpend',
                        value: MsgCommunityPoolSpend.encode(
                            communityPoolInfo
                        ).finish(),
                    },
                ],
                initialDeposit: [coin(changeInfo.deposit, changeInfo.denom)],
                proposer: sender,
                title: changeInfo.title,
                summary: changeInfo.description,
                metadata: '',
            }),
        };

        return this.signAndBroadCast(
            chainInfo,
            changeInfo.denom,
            sender,
            [message]
        );
    };

    parameterChangeProposal = async (
        sender: string,
        govAddress: string,
        changeInfo: {
            title: string;
            description: string;
            amount: any;
            denom: string;
            subspace: string,
            key: string,
            value: any
        },
        chainInfo: {
            urlRpc: string;
            chainId: string;
        }
    ) => {
        console.log({ sender, govAddress, changeInfo, chainInfo });
        const paramChangeInfo = ParameterChangeProposal.fromPartial({
            title: changeInfo.title,
            description: changeInfo.description,
            changes: [
                ParamChange.fromPartial({
                    subspace: changeInfo.subspace,
                    key: changeInfo.key,
                    value: changeInfo.value,
                }),
            ],
        });

        console.log({paramChangeInfo})
        const message = {
            typeUrl: '/cosmos.gov.v1.MsgSubmitProposal',
            value: MsgSubmitProposal.fromPartial({
                messages: [
                    {
                        typeUrl: '/cosmos.gov.v1.MsgExecLegacyContent',
                        value: MsgExecLegacyContent.encode({
                            authority: govAddress,
                            content: {
                                typeUrl:
                                    '/cosmos.params.v1beta1.ParameterChangeProposal',
                                value: ParameterChangeProposal.encode(
                                    paramChangeInfo
                                ).finish(),
                            },
                        }).finish(),
                    },
                ],
                initialDeposit: [coin(changeInfo.amount, changeInfo.denom)],
                proposer: sender,
                title: paramChangeInfo.title,
                summary: paramChangeInfo.description,
                metadata: '',
            }),
        };

        console.log({ message });

        return this.signAndBroadCast(
            chainInfo,
            changeInfo.denom,
            sender,
            [message]
        );
    };
}

export const walletStation = new WalletStation();
