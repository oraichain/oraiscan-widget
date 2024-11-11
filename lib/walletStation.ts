import { TextProposal } from "cosmjs-types/cosmos/gov/v1beta1/gov";
import { Any } from "cosmjs-types/google/protobuf/any";

export default class WalletStation {
	constructor() {}

    signAndBroadCast = async (address, messages, gas = "auto") => {
		// try {
		// 	const wallet = await this.collectWallet();
		// 	const client = await this.signerClient(wallet);
		// 	console.log({ messages });
		// 	return await client.signAndBroadcast(address, messages, gas);
		// } catch (ex) {
		// 	console.log("signAndBroadcast msg error: ", ex);
		// 	throw ex;
		// }
	};

    textProposal = async (proposer, amount, change_info, denom: string) => {
		const initial_deposit = [{ denom: denom, amount: amount.toString() }];
		const message = {
			typeUrl: "/cosmos.gov.v1beta1.MsgSubmitProposal",
			value: {
				content: Any.fromPartial({
					typeUrl: "/cosmos.gov.v1beta1.TextProposal",
					value: TextProposal.encode(change_info).finish(),
				}),
				proposer: proposer,
				initialDeposit: initial_deposit,
			},
		};
		console.log("message: ", message);
		return this.signAndBroadCast(proposer, [message]);
	};
}

export const walletStation = new WalletStation();