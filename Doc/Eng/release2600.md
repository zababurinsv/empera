# Update 2600
**2021/09/14**

### System transaction
* The update will be launched through the initiating transaction
* The pricing of the cost of operations for creating new smart contracts and the cost of storing information in the blockchain is determined by the PriceDAO parameter, which is set by the system transaction.

### Added to smarts
* Increased the length of the token code (up to 12)
* Changed the maximum number of smart execution ticks (specified in the transaction’s TxTicks parameter, the maximum allowed value is set in the PriceDAO parameter)
* Now is allowed to read Storage (KeyValue methods) of other smart contracts
* The minimum free Storage size is set in the PriceDAO parameter
* Added serialization methods from the terabuf library (GetObjectFromBuffer, GetBufferFromObject)
* Added the method method for working with fromCodePoint () strings
* Fixed the behavior of sha256 for byte arrays
* Increased the maximum size of dapps from 16 to 64 kbytes
* The alive time (relative to the block number) has been added to the Run and Transfer transaction format
* Added a transaction for managing the visibility of the dapp client part (HTML part)
* Added a new format for creating smart contract version 2 (each smart can be a software token)
* Added a new format for sending coin transfer transactions with token support (including NFT)

### New and changed Methods
* GetBalance(Account,Currency,ID) — method for getting the balance of the ERC / NFT token
* RegInWallet(Account) — a method for registering a new currency in the wallet
* Call(Smart,Method,Params,ParamsArr) — calling other smart methods
* MoveCall(FromID,ToID,CoinSum,Description,Currency,TokenID, Method,Params,ParamsArr) — move coins and calling other smart methods
* CreateSmart(FromSmartNum,Params) — creating a new smart contract based on another one
* Move (FromID,ToID,CoinSum,Description, Currency,TokenID) — added new parameters (Currency,TokenID) for sending coins with support ERC / NFT tokens
* Send (ToID,CoinSum,Description, Currency,TokenID) — added new parameters (Currency,TokenID) for sending coins with support ERC / NFT tokens

### New Events
* OnProxy (Method,Params,ParamsArr,PublicMode) — a predefined event called if a method is not found (called externally)
* OnTransfer (Params) — event for physically sending an ERC / NFT token
* OnGetBalance (Account,ID) — event for getting the balance of the ERC / NFT token
* context.Currency — token currency
* context.ID — token ID

