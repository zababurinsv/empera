# Update 2600
**2021/09/14**

Note: below, the term **ERC** refers to the new format of software tokens  that allow you to have several coins on one wallet account.

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

### New Events
* OnProxy (Method,Params,ParamsArr,PublicMode) — a predefined event called if a method is not found (called externally)
* OnTransfer (Params) — event for physically sending an ERC / NFT token (it is called inside a smart contract that supports software tokens). If a fee is used that reduces the amount on the receiving account, the function should return a new amount value (the returned value is an object with fields: {SumCOIN, SumCENT})
* OnGetBalance (Account,ID) — event for getting the balance of the ERC / NFT token (it is called inside a smart contract that supports software tokens)
* context.Currency — token currency
* context.ID — token ID

### New and changed smart contract Methods
* GetBalance(Account,Currency,ID) — getting the balance of the ERC / NFT token
* RegInWallet(Account) — registering a new currency in the wallet
* Call(Smart,Method,Params,ParamsArr) — calling the smart contract method
* MoveCall(FromID,ToID,CoinSum,Description,Currency,TokenID, Method,Params,ParamsArr) — move coins and calling the smart contract method on account ToID
* CreateSmart(FromSmartNum,Params) — creating a new smart contract based on another one
* Move (FromID,ToID,CoinSum,Description, Currency,TokenID) — added new parameters (Currency,TokenID) for sending coins with support ERC / NFT tokens
* Send (ToID,CoinSum,Description, Currency,TokenID) — added new parameters (Currency,TokenID) for sending coins with support ERC / NFT tokens
* GetObjectFromBuffer(ValueBuf,Format) - getting object from byte  array buffer by format string (example and format spec string see below)
* GetBufferFromObject(Value,Format) - getting byte buffer from object by format string (format spec string and example see below)
* fromCodePoint(Num) - returns a string character by code, it is standard JS String method: String.fromCodePoint with only one parameter
* ReadValue(Key,Format,IDFrom) - read value from DB by Key name string   (default: IDFrom is base smart account)

## New dapp (client side) Methods
* StartTransfer(ParamsPay:{FromID,ToID,Value,Description,Currency,ID},ParamsCall:{Method, Params, ParamsArr},TxTicks) - Initiating sending coins from any user account (FromID) and calling the smart contract method on the recipient account (ToID). The method calls an interactive dialog with the user to confirm the actions. ParamsCall - this parameter can be skipped (equal to undefined). Returns a promise.
#### Example
```js
var Ret=await StartTransfer(
    {FromID:100,ToID:SMART.Account,Value:500,Description:"Test transfer",Currency:0,ID:""},
    {Method:"Run",Params:{}},
    35000);

```    

* ASendCall(Account, MethodName,Params, ParamsArr,FromNum,TxTicks) - Send tx with calling the smart contract method and returns a promise. 
#### Example
```js
    async function DoMint()
    {
        var Ret=await ASendCall(SMART.Account,"DoMint",{Account:100,Amount:10000,ID:""},[],SMART.Owner);
        console.log("Ret:",Ret);
    }
```    

* ACall(Account, MethodName,Params,ParamsArr) - Static calling the smart contract method with returns a promise. 
#### Example
```js
   var Value=await ACall(SMART.Account,"MyCalc",{Account:100});
```    


#### Format spec string

The format  should contain a string of JSON type like key:"type”. The following designations are allowed as a type:
```text
 {} - object
 [] - array
 double - double number type (8-byte)
 uint - 6-byte unsigned integer
 uint32 - unsigned integer 4 bytes long
 uint16 - unsigned integer 2 bytes long
 byte - unsigned integer 1 bytes long
 str - the variable-length string
 strxx - string with fixed length of xx long
 arrxx - byte array with fixed-length of xx long
 data - byte array
```

Example format:
```js
 {Name:"str10", Value:"uint", PubKey:"arr33"}
 {Type:"byte",Account:"uint",SumCOIN:"uint",SumCENT:"uint32", arr:["uint"]}
```

Example code
```js
 var Data={some:123,data:345};
 var format={some:"uint",data:"uint32"};
 var Buf=GetBufferFromObject(Data,format);
 var Data2=GetObjectFromBuffer(Buf,format);
```

 
