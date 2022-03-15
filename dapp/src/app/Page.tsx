import React from 'react';


const Page = (props: React.PropsWithChildren<any>) => {
    return (
        <div className="mint-section wf-section">
            <div className="mint-c">
                {props.children}
            </div>
            <div className="mint-line"/>
            <div className="mint-info-c">
                <div className="mint-info-w">
                    <h3 className="mint-info-h3">Additional Information</h3>
                    <div className="mint-info-p">
                        You currently have <span className="mint-info-tickets">0</span> tickets.
                    </div>
                </div>
                <div className="mint-info-w">
                    <h3 className="mint-info-h3">ERC-721S Benefits</h3>
                    <p className="mint-info-p">
                        You will only have to claim the tickets. All the other costs to mint the NFT is paid
                        by our team through the ERC-721S contract.<br/><br/>
                        We will bulk mint all NFTs after a maximum of 96 hours after the auction has ended.
                    </p>
                </div>
            </div>
        </div>
    )
}

export default Page;