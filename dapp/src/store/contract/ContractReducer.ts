import {createAction, createAsyncThunk, createReducer} from '@reduxjs/toolkit';
import {createSelectorHook} from 'react-redux';
import {RootState} from '../Store';
import Contract from '../../model/Contract';
import {BigNumber, Contract as EthersContract, ContractTransaction} from 'ethers'
import {deepEqual} from 'wagmi';
import DisplayState from '../../model/DisplayState';
import {setContractState} from '../application/ApplicationReducer';
import ContractState from '../../model/ContractState';
import ContractMetadata from '../../model/ContractMetadata';
import TokenMetadata from '../../model/TokenMetadata';
import ContractToken from '../../model/ContractToken';

let syncedContract: EthersContract | undefined | null;

type WatchTransaction =
    {
        transaction: Promise<ContractTransaction>,
        type: "buy"
    } | {
    transaction: Promise<ContractTransaction>,
    type: "stake" | "unstake",
    token: ContractToken
}

const getTransactionKey = (args: WatchTransaction) => {
    switch (args.type) {
        case 'stake':
        case 'unstake':
            return `token.${args.token.id}`;
        case 'buy':
            return "buy";
    }
    return "unknown";
}

export const updateContractModel = createAction<Contract | undefined>("contract/model/update");

export const watchTransaction = createAsyncThunk<void, WatchTransaction, { state: RootState }>("contract/transaction/watch", async ({transaction}, thunkAPI) => {
    try {
        const tx = await transaction;
        await tx.wait(2);
        if (!syncedContract) throw "Contract is not available";
        await thunkAPI.dispatch(syncContract());
    } catch (error: any) {
        if (error.code !== "ACTION_REJECTED") {
            throw error;
        }
    }
});

export const syncContract = createAsyncThunk<Contract | undefined, void, { state: RootState }>("contract/model/sync", async (ignore, thunkAPI) => {
    if (!syncedContract) return undefined;
    const state = thunkAPI.getState();
    const {displayState} = state.application;
    if (state.contract.rawTokensSyncPending && displayState === DisplayState.STAKING || displayState === DisplayState.PRE_REVEAL) {
        thunkAPI.dispatch(syncRawTokens());
    }
    const contract = syncedContract;
    const updatedContractModel = await internalContractSync(contract);
    if (syncedContract !== contract) {
        return undefined;
    }
    const existingContractModel = thunkAPI.getState().contract.contractModel;
    if (!deepEqual(updatedContractModel, existingContractModel)) {
        thunkAPI.dispatch(updateContractModel(updatedContractModel));
        const currentApplicationState = thunkAPI.getState().application.displayState;
        let applicationState = DisplayState.PRE_MINT;
        if (updatedContractModel.privateMint.hasStarted) {
            applicationState = DisplayState.PRIVATE_MINT;
        }
        if (updatedContractModel.privateMint.hasStarted && !updatedContractModel.privateMint.isActive) {
            applicationState = DisplayState.PRE_PUBLIC_MINT;
        }
        if (updatedContractModel.privateMint.hasStarted && updatedContractModel.publicMint.hasStarted) {
            applicationState = DisplayState.PUBLIC_MINT;
        }
        if (updatedContractModel.publicMint.hasStarted && !updatedContractModel.publicMint.isActive) {
            applicationState = DisplayState.PRE_REVEAL;
        }
        if (updatedContractModel.tokensRevealed) {
            applicationState = DisplayState.STAKING;
        }
        if (applicationState !== currentApplicationState) {
            thunkAPI.dispatch(setContractState(applicationState));
        }
        return updatedContractModel;
    }
    return existingContractModel;
})

export const stake = createAsyncThunk<void, ContractToken, { state: RootState }>("contract/token/stake", async (token, thunkAPI) => {
    if (!syncedContract) throw "No contract available. Please try again later.";
    const model = thunkAPI.getState().contract.contractModel;
    if (!model) throw "Local contract model is empty. Please try again later.";

    if (token.staked) throw "Token has already been staked";
    if (token.level === 3) throw "Token is already at max level"
    if (thunkAPI.getState().application.displayState !== DisplayState.STAKING) throw "Staking is not active";

    thunkAPI.dispatch(watchTransaction({
        transaction: syncedContract.stake(token.id),
        type: "stake",
        token
    }));

});

export const unStake = createAsyncThunk<void, ContractToken, { state: RootState }>("contract/token/unstake", async (token, thunkAPI) => {
    if (!syncedContract) throw "No contract available. Please try again later.";
    const model = thunkAPI.getState().contract.contractModel;
    if (!model) throw "Local contract model is empty. Please try again later.";

    if (!token.staked) throw "Token is not staked";
    if (thunkAPI.getState().application.displayState !== DisplayState.STAKING) throw "Staking is not active";

    thunkAPI.dispatch(watchTransaction({
        transaction: syncedContract.unStake(token.id),
        type: "unstake",
        token
    }));

});

export const mint = createAsyncThunk<void, number, { state: RootState }>("contract/function/mint", async (tokenCount, thunkAPI) => {
    if (!syncedContract) throw "No contract available. Please try again later.";
    if (tokenCount <= 0) throw "You must buy at least one token";
    const model = thunkAPI.getState().contract.contractModel;
    if (!model) throw "Local contract model is empty. Please try again later.";

    const isPrivateMintActive = model.privateMint.isActive;
    const isPublicMintActive = model.publicMint.isActive;

    if (!isPublicMintActive && !isPrivateMintActive) throw "No active mint.";
    if (isPrivateMintActive && !model.whitelisted) throw "Current wallet not whitelisted";

    const price = BigNumber.from(isPrivateMintActive ? model.privateMint.price : model.publicMint.price);
    const value = price.mul(tokenCount);
    const address = await syncedContract.signer.getAddress();

    const response = await fetch(`${import.meta.env.VITE_API_URL}/sign`, {
        method: "POST",
        body: JSON.stringify({address, value: value.toString()}),
        headers: {
            "Content-Type": "application/json"
        }
    });

    if (!response.ok) throw `HTTP ${response.status}: ${response.statusText}`;

    const signature = await response.text()
    let transactionPromise;
    if (isPrivateMintActive) {
        transactionPromise = syncedContract.privateMint(signature, {value});
    } else {
        transactionPromise = syncedContract.publicMint(signature, {value});
    }
    thunkAPI.dispatch(watchTransaction({transaction: transactionPromise, type: "buy"}))
})

export const updateContractSyncLoop = createAsyncThunk<void, EthersContract | undefined | null, { state: RootState }>("contract/sync/update", (contract, thunkAPI) => {
    const contractRemoved = syncedContract && !contract
    syncedContract = contract;
    if (!contract) {
        if (contractRemoved) {
            thunkAPI.dispatch(updateContractModel(undefined));
        }
        return;
    }
    const syncContractLoop = async () => {
        if (syncedContract !== contract) {
            return;
        }
        try {
            thunkAPI.dispatch(syncContract());
        } catch (e) {
            console.error("Error while fetching contract model", e)
        }
        if (syncedContract === contract) {
            setTimeout(syncContractLoop, 5000);
        }

    };
    setTimeout(syncContractLoop, 0);
});

export const updateContractMetadata = createAction<ContractMetadata>("contract/metadata/update");

const syncRawTokens = createAsyncThunk<ContractToken[], void, { state: RootState }>("contract/tokens/sync", async (ignore, thunkAPI) => {
    if (!syncedContract) throw "No contract connected";
    const ids: number[] = (await syncedContract.tokens()).map((id: BigNumber) => id.toNumber());
    const loadedTokens = thunkAPI.getState().contract.rawTokens;
    const result: ContractToken[] = [];
    for (const id of ids) {
        const token: ContractToken = {
            id: id,
            level: (await syncedContract.stakeLevel(id)).toNumber(),
            stakeTime: (await syncedContract.stakeTime(id)).toNumber(),
            staked: await syncedContract.staked(id),
            tokenURI: await syncedContract.tokenURI(id),
        };
        const existingToken = loadedTokens?.find(token => token.id === id);
        const pendingSync = thunkAPI.getState().contract.tokenMetadataSyncPending[id];
        if (!pendingSync && (!existingToken || existingToken.tokenURI !== token.tokenURI)) {
            thunkAPI.dispatch(syncTokenMetadata(token));
        }
        result.push(token);
    }
    return result;
});

const syncTokenMetadata = createAsyncThunk<TokenMetadata, ContractToken, { state: RootState }>("contract/tokens/metadata/sync", async (rawToken) => {
    if (!syncedContract) throw "No contract connected";
    let tokenURI = rawToken.tokenURI;
    if (tokenURI.startsWith("ipfs://")) {
        tokenURI = `https://ipfs.squirreldegens.com/ipfs/${tokenURI.replaceAll("ipfs://", "")}`
    }
    const response = await fetch(tokenURI);
    const metadata = await response.json();
    metadata.image = `https://ipfs.squirreldegens.com/ipfs/${metadata.image.replaceAll("ipfs://", "")}`
    return metadata;
});

const internalContractSync = async (contract: EthersContract): Promise<Contract> => {
    return {
        privateMint: {
            hasStarted: await contract.privateMintStarted(),
            isActive: await contract.privateMintActive(),
            hasStopped: await contract.privateMintStopped(),
            walletTokens: (await contract.privateMintTokens()).toNumber(),
            tokensMinted: (await contract.privateMintTokenCount()).toNumber(),
            tokenSupply: (await contract.privateMintSupply()).toNumber(),
            tokenLimit: (await contract.privateMintTokensPerWallet()).toNumber(),
            price: (await contract.privateMintPrice()).toString()
        },
        publicMint: {
            hasStarted: await contract.publicMintStarted(),
            isActive: await contract.publicMintActive(),
            hasStopped: await contract.publicMintStopped(),
            walletTokens: (await contract.publicMintTokens()).toNumber(),
            tokensMinted: (await contract.publicMintTokenCount()).toNumber(),
            tokenSupply: (await contract.publicMintSupply()).toNumber(),
            tokenLimit: (await contract.publicMintTokensPerWallet()).toNumber(),
            price: (await contract.publicMintPrice()).toString()
        },
        tokensRevealed: await contract.revealed(),
        mintedTokens: (await contract.mintedTokenCount()).toNumber(),
        balance: (await contract.balanceOf(await contract.signer.getAddress())).toNumber(),
        whitelisted: await contract.whitelisted(),
        stakingLevels: (await contract.stakeLevels()).map((level: BigNumber) => level.toNumber())
    };
}

const initialState: ContractState = {
    metadata: {
        started: false
    },
    tokenMetadata: {},
    pendingTransactions: {},
    contractSyncPending: false,
    rawTokensSyncPending: false,
    tokenMetadataSyncPending: {}
};

const reducer = createReducer(initialState, builder => {
    builder
        .addCase(updateContractModel, (state, action) => {
            state.contractModel = action.payload;
        })
        .addCase(syncContract.fulfilled, (state, action) => {
            state.contractModel = action.payload;
        })
        .addCase(syncContract.rejected, (state) => {
            state.contractModel = undefined;
        })
        .addCase(updateContractMetadata, (state, action) => {
            state.metadata = action.payload;
        })
        .addCase(syncRawTokens.pending, (state) => {
            state.rawTokensSyncPending = true;
        })
        .addCase(syncRawTokens.fulfilled, (state, action) => {
            state.rawTokens = action.payload;
            state.rawTokensSyncPending = false;
        })
        .addCase(syncRawTokens.rejected, (state) => {
            state.rawTokensSyncPending = false;
            // TODO: Error handling
        })
        .addCase(stake.rejected, (state, action) => {
            state.pendingTransactions[`token.${action.meta.arg.id}`] = {
                pending: false,
                successful: false,
                error: true,
                errorMessage: action.error.message || "Unknown error occurred while staking token"
            };
        })
        .addCase(unStake.rejected, (state, action) => {
            state.pendingTransactions[`token.${action.meta.arg.id}`] = {
                pending: false,
                successful: false,
                error: true,
                errorMessage: action.error.message || "Unknown error occurred while unstaking token"
            };
        })
        .addCase(syncTokenMetadata.pending, (state, action) => {
            state.tokenMetadataSyncPending[action.meta.arg.id] = true;
        })
        .addCase(syncTokenMetadata.fulfilled, (state, action) => {
            state.tokenMetadata[action.meta.arg.id] = action.payload;
            state.tokenMetadataSyncPending[action.meta.arg.id] = false;
        })
        .addCase(syncTokenMetadata.rejected, (state, action) => {
            state.tokenMetadataSyncPending[action.meta.arg.id] = false;
            // TODO: Error handling
        })
        .addCase(watchTransaction.pending, (state, action) => {
            state.pendingTransactions[getTransactionKey(action.meta.arg)] = {
                pending: true,
                successful: false,
                error: false
            };
        })
        .addCase(watchTransaction.fulfilled, (state, action) => {
            state.pendingTransactions[getTransactionKey(action.meta.arg)] = {
                pending: false,
                successful: true,
                error: false
            };
        })
        .addCase(watchTransaction.rejected, (state, action) => {
            state.pendingTransactions[getTransactionKey(action.meta.arg)] = {
                pending: false,
                successful: false,
                error: true,
                errorMessage: action.error.message || "Unexpected error occurred during transaction"
            };
        });
});

export const useContractModel = () => createSelectorHook()((state: RootState) => state.contract.contractModel);
export const useContractTokens = () => createSelectorHook()((state: RootState) => state.contract.rawTokens);
export const useTokenMetadata = (idOrToken: number | ContractToken) => createSelectorHook()((state: RootState) => {
    let id;
    if (typeof idOrToken === "number") {
        id = idOrToken;
    } else {
        id = idOrToken.id;
    }
    return state.contract.tokenMetadata[id]
});

export const useRawTokensSyncPending = () => createSelectorHook()((state: RootState) => state.contract.rawTokensSyncPending);
export const useTokenMetadataSyncPending = (token: ContractToken) => createSelectorHook()((state: RootState) => state.contract.tokenMetadataSyncPending[token.id]);
export const useContractSyncPending = () => createSelectorHook()((state: RootState) => state.contract.contractSyncPending);
export const useContractMetadata = () => createSelectorHook()((state: RootState) => state.contract.metadata);
export const useMintTransaction = () => createSelectorHook()((state: RootState) => state.contract.pendingTransactions["buy"])
export const useTokenTransaction = (token: ContractToken) => createSelectorHook()((state: RootState) => state.contract.pendingTransactions[`token.${token.id}`])
export default reducer;