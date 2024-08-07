export const OpCodes = { 
    GET_STORAGE_DATA:         0x5B88E5CC, 
    REPORT_STORAGE_DATA:      0xAAB4A8EF, 
    EXCESSES:                 0xD53276DB,
 
    TRANSFER_JETTON:          0xF8A7EA5, 
    TRANSFER_NOTIFICATION:    0x7362D09C, 
    PROVIDE_WALLET_ADDRESS:   0x2C76B973, 
    TAKE_WALLET_ADDRESS:      0xD1735400, 
    BURN_JETTON:              0x595F07BC,
 
    CHANGE_OWNER:             0x93B05B31, 
    CHANGE_PURCHASE_INFO:     0xA7DD3E8D, 
    ADD_REF_ADDRESSES:        0x7AE5C1CA, 
    WITHDRAW_TON:             0x37726BDB, 
    WITHDRAW_JETTON:          0x11C09682,
 
    BUY_WL:                   0x90612494,  
    APPROVE_PURCHASE:         0x9F48D36D, 
    CANCEL_PURCHASE:          0x7D1D7445,
 
    TRANSFER:                 0x5FCC3D14, 
    REQUEST_OWNER:            0xD0C3BFEA, 
    OWNER_INFO:               0x0DD607E3, 
    PROVE_OWNERSHIP:          0x04DED148, 
    OWNERSHIP_PROOF:          0x0524C7AE, 
    OWNERSHIP_PROOF_BOUNCED:  0xC18E86D2, 
    DESTROY:                  0x1F04537A, 
    REVOKE:                   0x6F89F5E3, 
    TAKE_EXCESS:              0xD136D3B3, 
    GET_static_DATA:          0x2FCB26A2, 
    REPORT_static_DATA:       0x8B771735, 
    GET_ROYALTY_PARAMS:       0x693D3950, 
    REPORT_ROYALTY_PARAMS:    0xA8CB00AD, 
    CLAIM :                   0xA769DE27, 
    REQUEST_REFUND:           0x1075D7A3, 
    UPDATE_SBT_DATA:          0xDCA3DA4C, 
    END_SALE:                 0xCB81BC08,
 
    CHANGE_JETTON_WALLET:     0x781b74d6,
    CHANGE_CODES:             0xb97d7c00,
    UPDATE_REF_WALLET:        0x940298FC, 
    CLAIM_REF:                0x1F7B4E41,
    DEPLOY_REFS:              0xd6078a7b,
 
    DEPLOY_ICO_SALE:          0x16CCCA41, 
    SEND_COMMISSIONS:         0xB96ADAEA, 
    SEND_ANY_MESSAGE:         0x9EC1E14,
 
    DEPOSIT_LIQUIDITY_NATIVE: 0xD55E4686, 
    DEPOSIT_LIQUIDITY_JETTON: 0x40E108D6, 
    LIQUIDITY_FULFILL:        0xB9B68EF4, 
    LIQUIDITY_REJECT:         0x9364A426,
};

export const Gas = {
    MIN_TONS_FOR_STORAGE: 25000000,   
    SEND_JETTONS:         40000000,
    BURN_JETTONS:         30000000,
    PROVIDE_ADDR:         10000000,

    DEPLOY_ICO_SALE:      50000000,
    DEPLOY_SBT:           50000000,
    DEPLOY_REF:           50000000,

    PURCHASE:             20000000,
    END_SALE:             500000000,
    PROVIDE_TON:          400000000,
    PROVIDE_JETTON:       400000000,

    CLAIM_JETTONS:        42000000,

    UPDATE_WALLET:        20000000,
    CLAIM_REF:            20000000,

};

export const ErrorCodes = {
    outOfGas: 13,
    lessThanMinPurchase: 41,
    moreThanMaxPurchase: 42,
    incorrectJetton: 43,
    notUnlockedYet: 44,
    notEnoughJettons: 45,
    saleNotStarted: 46,
    saleFinished: 47,
    saleNotFinished: 48,
    incorrectSender: 49,
    nothingToClaim: 50,
    intOutOfRange: 51,
    nftBurned: 52,
    userNotInWl: 53,
    saleFailed: 54,
    saleSucceed: 55,
    refundRequested: 56,
    alreadyInited: 57,
    alreadyStarted: 58,
    wrongChain: 333,
    unsupportedOp: 0xffff
  };
  

  export const PERCENT_DEVIDER = 100000000n;