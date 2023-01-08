import {createAction, createAsyncThunk, createReducer, Dispatch} from '@reduxjs/toolkit';
import {createSelectorHook} from 'react-redux';
import {RootState} from '../Store';
import Contract from '../../model/Contract';
import {Contract as EthersContract} from 'ethers'
import {deepEqual} from 'wagmi';
import ApplicationState from '../../model/ApplicationState';
import {setApplicationState} from './ApplicationStateReducer';

let intervalId: any = undefined;

export const stopContractSync = () => {
    clearInterval(intervalId);
    intervalId = undefined;
}

export const updateContract = createAction<Contract>("contract/update");

let syncedContract: EthersContract | undefined | null = undefined;

export const syncContract = createAsyncThunk("contract/sync", async (contract?: EthersContract | null) => {
    if (!contract) return undefined;
    return await internalContractSync(contract);
})

const internalContractSync = async (contract: EthersContract): Promise<Contract> => {
    // General
    const mintedPromise = contract.minted();
    const revealedPromise = contract.revealed();
    const ticketsPromise = contract.tickets();
    const whitelistedPromise = contract.whitelisted();

    // Private Auction
    const privateStartedPromise = contract.privateAuctionStarted();
    const privateActivePromise = contract.privateAuctionActive();
    const privateStoppedPromise = contract.privateAuctionStopped();
    const privateTicketsPromise = contract.privateAuctionTickets();
    const privateTicketsPerWalletPromise = contract.privateAuctionTicketsPerWallet();
    const privatePricePromise = contract.privateAuctionPrice();
    const privateTicketCountPromise = contract.privateAuctionTicketCount();
    const privateTicketSupplyPromise = contract.privateAuctionTicketSupply();

    // Public Auction
    const publicStartedPromise = contract.publicAuctionStarted();
    const publicActivePromise = contract.publicAuctionActive();
    const publicStoppedPromise = contract.publicAuctionStopped();
    const publicTicketsPromise = contract.publicAuctionTickets();
    const publicTicketsPerWalletPromise = contract.publicAuctionTicketsPerWallet();
    const publicPricePromise = contract.publicAuctionPrice();
    const publicTicketCountPromise = contract.publicAuctionTicketCount();
    const publicTicketSupplyPromise = contract.publicAuctionTicketSupply();

    return {
        privateAuction: {
            hasStarted: await privateStartedPromise,
            isActive: await privateActivePromise,
            hasStopped: await privateStoppedPromise,
            walletTickets: (await privateTicketsPromise).toNumber(),
            ticketsSold: (await privateTicketCountPromise).toNumber(),
            ticketSupply: (await privateTicketSupplyPromise).toNumber(),
            ticketLimit: (await privateTicketsPerWalletPromise).toNumber(),
            price: (await privatePricePromise).toString()
        },
        publicAuction: {
            hasStarted: await publicStartedPromise,
            isActive: await publicActivePromise,
            hasStopped: await publicStoppedPromise,
            walletTickets: (await publicTicketsPromise).toNumber(),
            ticketsSold: (await publicTicketCountPromise).toNumber(),
            ticketSupply: (await publicTicketSupplyPromise).toNumber(),
            ticketLimit: (await publicTicketsPerWalletPromise).toNumber(),
            price: (await publicPricePromise).toString()
        },
        tokensMinted: await mintedPromise,
        tokensRevealed: await revealedPromise,
        walletTickets: (await ticketsPromise).toNumber(),
        tokens: [], // TODO: Implement token fetch
        whitelisted: await whitelistedPromise
    };
}

export const updateContractSyncLoop = (contract: EthersContract | undefined | null) => async (dispatch: Dispatch, getState: () => RootState) => {
    syncedContract = contract;
    if (!contract) return;
    const timerId = setInterval(async () => {
        if (syncedContract !== contract) {
            clearInterval(timerId);
            return;
        }
        const updatedContractModel = await internalContractSync(contract);
        if (syncedContract !== contract) {
            clearInterval(timerId);
            return;
        }
        const existingContractModel = getState().contract.contract;
        if (!deepEqual(updatedContractModel, existingContractModel)) {
            dispatch(updateContract(updatedContractModel));
            let applicationState = undefined;
            if (!existingContractModel?.privateAuction.hasStarted && updatedContractModel.privateAuction.hasStarted) {
                applicationState = ApplicationState.PRIVATE_AUCTION;
            }
            // TODO: Add contidions to match actual state
            if (existingContractModel?.privateAuction.isActive && !updatedContractModel.privateAuction.isActive) {
                applicationState = ApplicationState.PRE_PUBLIC_AUCTION;
            }
            if (!existingContractModel?.publicAuction.hasStarted && updatedContractModel.publicAuction.hasStarted) {
                applicationState = ApplicationState.PUBLIC_AUCTION;
            }
            if (existingContractModel?.publicAuction.isActive && !updatedContractModel.publicAuction.isActive) {
                applicationState = ApplicationState.PRE_MINT;
            }
            if (!existingContractModel?.tokensMinted && updatedContractModel.tokensMinted) {
                applicationState = ApplicationState.PRE_REVEAL;
            }
            if (!existingContractModel?.tokensRevealed && updatedContractModel.tokensRevealed) {
                applicationState = ApplicationState.STAKING;
            }
            if (applicationState) {
                dispatch(setApplicationState(applicationState));
            }
        }

    }, 1000);
}

const initialState: { contract?: Contract } = {};

const reducer = createReducer(initialState, builder => {
    builder.addCase(updateContract, (state, action) => {
        state.contract = action.payload;
    });
    builder.addCase(syncContract.fulfilled, (state, action) => {
        state.contract = action.payload;
    });
});

export const useContractModel = () => createSelectorHook()((state: RootState) => state.contract.contract);
export default reducer;