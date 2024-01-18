import BigNumber from 'bignumber.js';
import { Metadata } from 'cosmjs-types/cosmos/bank/v1beta1/bank';
import { Coin } from 'cosmjs-types/cosmos/base/v1beta1/coin';

export class TokenUnitConverter {
    metadata: Record<string, Metadata>;
    constructor(metas?: Record<string, Metadata>) {
        this.metadata = metas ? metas : {};
    }
    addMetadata(denom: string, meta: Metadata) {
        this.metadata[denom] = meta;
    }
    baseToDisplay(token: Coin, decimal = 6) {
        const meta = this.metadata[token.denom];
        if (!meta) return token;
        const unit = meta.denomUnits.find(
            (unit) => unit.denom === meta.display
        );
        if (!unit) return token;
        const amount = BigNumber(Number(token.amount)).div(
            BigNumber(10).pow(unit.exponent)
        );
        return {
            amount: amount.toFixed(decimal),
            denom: unit.denom.toUpperCase(),
        };
    }
    baseToUnit(token: Coin, unitName: string, decimal = 6) {
        const meta = this.metadata[token.denom];
        if (!meta) return token;
        const unit = meta.denomUnits.find((unit) => unit.denom === unitName);
        if (!unit) return token;
        const amount = BigNumber(Number(token.amount)).div(
            BigNumber(10).pow(unit.exponent)
        );
        return {
            amount: parseFloat(amount.toFixed(decimal)).toString(),
            denom: unit.denom,
        };
    }
    displayToBase(baseDenom: string, display: Coin) {
        const meta = this.metadata[baseDenom];
        if (!meta) return display;
        const unit = meta.denomUnits.find(
            (unit) => unit.denom === display.denom
        );
        if (!unit) return display;
        const amount = BigNumber(Number(display.amount)).times(
            BigNumber(10).pow(unit.exponent)
        );
        return {
            amount: amount.toFixed(),
            denom: baseDenom,
        };
    }
}
