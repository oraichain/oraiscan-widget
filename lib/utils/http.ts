import {
    QueryClient,
    setupAuthExtension,
    setupBankExtension,
    setupDistributionExtension,
    setupGovExtension,
    setupIbcExtension,
    setupMintExtension,
    setupSlashingExtension,
    setupStakingExtension,
    setupTxExtension,
    type AuthExtension,
    type BankExtension,
    type DistributionExtension,
    type GovExtension,
    type IbcExtension,
    type MintExtension,
    type StakingExtension,
    type TxExtension,
} from '@cosmjs/stargate';
import {
    CometClient,
    HttpClient,
    Tendermint37Client,
    WebsocketClient,
} from '@cosmjs/tendermint-rpc';

import { QueryParamsResponse } from 'cosmjs-types/cosmos/staking/v1beta1/query';
import { GetTxResponse } from 'cosmjs-types/cosmos/tx/v1beta1/service';
import { BaseAccount } from 'cosmjs-types/cosmos/auth/v1beta1/auth';
import { Metadata } from 'cosmjs-types/cosmos/bank/v1beta1/bank';
import { Coin } from 'cosmjs-types/cosmos/base/v1beta1/coin';
import { QueryDelegationResponse } from 'cosmjs-types/cosmos/staking/v1beta1/query';
import { QueryDenomTraceResponse } from 'cosmjs-types/ibc/applications/transfer/v1/query';
import { CoinMetadata } from './type';

export async function get(url: string) {
    return (await fetch(url)).json();
}

export async function post(url: string, data: any) {
    const response = await fetch(url, {
        method: 'POST', // *GET, POST, PUT, DELETE, etc.
        // mode: 'cors', // no-cors, *cors, same-origin
        // credentials: 'same-origin', // redirect: 'follow', // manual, *follow, error
        // referrerPolicy: 'origin', // no-referrer, *no-referrer-when-downgrade, origin, origin-when-cross-origin, same-origin, strict-origin, strict-origin-when-cross-origin, unsafe-url
        headers: {
            'Content-Type': 'text/plain',
            Accept: '*/*',
            // 'Accept-Encoding': 'gzip, deflate, br',
        },
        body: JSON.stringify(data), // body data type must match "Content-Type" header
    });
    // const response = axios.post((config ? config.api : this.config.api) + url, data)
    return response.json(); // parses JSON response into native JavaScript objects
}

type CustomQueryClient = QueryClient &
    AuthExtension &
    BankExtension &
    StakingExtension &
    MintExtension &
    GovExtension &
    IbcExtension &
    DistributionExtension &
    TxExtension & {
        client: CometClient;
    };

export const createTmClient = (endpoint: string): Tendermint37Client => {
    const useHttp =
        endpoint.startsWith('http://') || endpoint.startsWith('https://');
    const rpcClient = useHttp
        ? new HttpClient(endpoint)
        : new WebsocketClient(endpoint);
    // @ts-ignore
    const tmClient = new Tendermint37Client(rpcClient);
    return tmClient;
};

export const createQueryClient = (endpoint: string): CustomQueryClient => {
    // init queryClient
    const tmClient = createTmClient(endpoint);
    const queryClient = QueryClient.withExtensions(
        // @ts-ignore
        tmClient,
        setupAuthExtension,
        setupBankExtension,
        setupStakingExtension,
        setupMintExtension,
        setupGovExtension,
        setupIbcExtension,
        setupSlashingExtension,
        setupDistributionExtension,
        setupTxExtension
    );
    // @ts-ignore
    queryClient.client = tmClient;
    // @ts-ignore
    return queryClient;
};

// function findField(obj: any, name: string) {
//     if (!obj) return undefined;

//     const list = Object.keys(obj).filter((x) => x && !x.startsWith('@'));
//     if (list.includes(name)) {
//         return obj[name];
//     }
//     for (let i = 0; i < list.length; i++) {
//         const field = obj[list[i]];
//         if (typeof field === 'string') continue;
//         if (Array.isArray(field)) continue;

//         const sub = findField(field, name);
//         if (sub) return sub;
//     }
//     return undefined;
// }

// /cosmos/base/tendermint/v1beta1/blocks/latest
export async function getLatestBlock(endpoint: string) {
    const client = createTmClient(endpoint);

    // const url = `${endpoint}/cosmos/base/tendermint/v1beta1/blocks/latest`
    // return get(url)
    const block = await client.block();
    return block;
}

export async function getAccount(
    endpoint: string,
    address: string
): Promise<BaseAccount | undefined> {
    const queryClient = createQueryClient(endpoint);

    const account = await queryClient.auth.account(address);
    if (account?.value) return BaseAccount.decode(account.value);
    // const url = `${endpoint}/cosmos/auth/v1beta1/accounts/${address}`
    // try{
    //     const res = await get(url)
    //     return {
    //         account: {
    //             account_number: findField(res, "account_number"),
    //             sequence: findField(res, "sequence")
    //         }
    //     }
    // }catch(err) {
    //     throw new Error(err)
    // }
}

export async function getBalance(
    endpoint: string,
    address: string
): Promise<{ balances: Coin[] }> {
    // const url = `${endpoint}/cosmos/bank/v1beta1/balances/${address}`;
    // return get(url);
    const queryClient = createQueryClient(endpoint);
    const res = await queryClient.bank.allBalances(address);
    return { balances: res };
}

export async function getBalanceMetadata(
    endpoint: string,
    denom: string
): Promise<{ metadata: Metadata }> {
    // const url = `${endpoint}/cosmos/bank/v1beta1/denoms_metadata/${denom}`;
    // return get(url);
    if (denom === 'orai')
        return {
            metadata: {
                description: 'The native token of Osmosis',
                denomUnits: [
                    {
                        denom: 'orai',
                        exponent: 6,
                        aliases: [],
                    },
                ],
                base: 'orai',
                display: 'orai',
                name: '',
                symbol: '',
                uri: '',
                uriHash: '',
            },
        };
    const queryClient = createQueryClient(endpoint);
    const res = await queryClient.bank.denomMetadata(denom);
    return { metadata: res };
}

export async function getIBCDenomMetadata(denom: string): Promise<Metadata> {
    const url = `https://metadata.ping.pub/metadata/${denom.replace(
        'ibc/',
        ''
    )}`;
    return get(url);
}

export async function getCoinMetadata(endpoint: string, denom: string) {
    // const url = `${endpoint}/cosmos/bank/v1beta1/denoms_metadata/${denom}`;
    // return get(url);
    return getBalanceMetadata(endpoint, denom);
}

export async function getDelegateRewards(endpoint: string, address: string) {
    // const url = `${endpoint}/cosmos/distribution/v1beta1/delegators/${address}/rewards`;
    // return get(url);
    const queryClient = createQueryClient(endpoint);
    const res = await queryClient.distribution.delegationTotalRewards(address);
    return res;
}

export async function getDelegations(
    endpoint: string,
    validator_addr: string,
    address: string
): Promise<QueryDelegationResponse> {
    // const url = `${endpoint}/cosmos/staking/v1beta1/validators/${validator_addr}/delegations/${address}`;
    // return get(url);
    const queryClient = createQueryClient(endpoint);
    const res = await queryClient.staking.delegation(address, validator_addr);
    return res;
}

export async function getActiveValidators(endpoint: string) {
    // const url = `${endpoint}/cosmos/staking/v1beta1/validators?pagination.limit=300&status=BOND_STATUS_BONDED`;
    // return get(url);
    const queryClient = createQueryClient(endpoint);
    const res = await queryClient.staking.validators('BOND_STATUS_BONDED');
    return res;
}

export async function getInactiveValidators(endpoint: string) {
    // const url = `${endpoint}/cosmos/staking/v1beta1/validators?pagination.limit=300&status=BOND_STATUS_UNBONDED`;
    // return get(url);
    const queryClient = createQueryClient(endpoint);
    const res = await queryClient.staking.validators('BOND_STATUS_UNBONDED');
    return res;
}

// /ibc/apps/transfer/v1/denom_traces/{hash}
export async function getDenomTraces(
    endpoint: string,
    hash: string
): Promise<QueryDenomTraceResponse> {
    // const url = `${endpoint}/ibc/apps/transfer/v1/denom_traces/${hash}`;
    // return get(url);
    const queryClient = createQueryClient(endpoint);
    const res = await queryClient.ibc.transfer.denomTrace(hash);
    return res;
}
// /cosmos/tx/v1beta1/txs/{hash}
export async function getTxByHash(
    endpoint: string,
    hash: string
): Promise<GetTxResponse> {
    // const url = `${endpoint}/cosmos/tx/v1beta1/txs/${hash}`;
    // return get(url);
    const queryClient = createQueryClient(endpoint);
    const res = await queryClient.tx.getTx(hash);
    return res;
}
// /cosmos/staking/v1beta1/params
export async function getStakingParam(
    endpoint: string
): Promise<QueryParamsResponse> {
    // const url = `${endpoint}/cosmos/staking/v1beta1/params`;
    // return get(url);
    const queryClient = createQueryClient(endpoint);
    const res = await queryClient.staking.params();
    return res;
}

export async function getOsmosisPools(endpoint: string) {
    const url = `${endpoint}/osmosis/gamm/v1beta1/pools?pagination.limit=1000`;
    return get(url);
}
// https://lcd.osmosis.zone
// /osmosis/gamm/v1beta1/{pool_id}/estimate/swap_exact_amount_in
export async function estimateSwapAmountIn(
    endpoint: string,
    poolId: string,
    token: Coin
) {
    const url = `${endpoint}/osmosis/gamm/v1beta1/${poolId}/estimate/swap_exact_amount_in?token_in=${token.amount}${token.denom}`;
    return get(url);
}
