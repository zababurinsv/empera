/*
 * @project: TERA
 * @version: Development (beta)
 * @license: MIT (not for evil)
 * @copyright: Yuriy Ivanov (Vtools) 2017-2019 [progr76@gmail.com]
 * Web: https://terafoundation.org
 * Twitter: https://twitter.com/terafoundation
 * Telegram:  https://t.me/terafoundation
*/

LexerJS = global.LexerJS;
var MaxAccCreate = 102;
var VM_VALUE = {CurBlockNum:1000, MaxDappsID:1, };
var VM_VLOCKS = [];
var VM_ACCOUNTS = [];
var VM_SMARTS = [];
InitVMArrays();
VM_VALUE.Smart = {};
VM_VALUE.ArrWallet = [];
var DefPubKeyArr0 = [2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1];
VM_VALUE.PrivKey = GetHexFromArr([1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1,
1, 1]);
var DefPubKeyArr = {data:DefPubKeyArr0};
var UPDATE_CODE_1 = 0;
var UPDATE_CODE_2 = 0;
function RunFrame(Code,Parent,bRecreate)
{
    SetStatus("");
    DoNewSession();
    VM_VALUE.PubKey0 = SignLib.publicKeyCreate(VM_VALUE.PrivKey, 1);
    VM_VALUE.PubKey = {data:VM_VALUE.PubKey0};
    if(editHTML)
        editHTML.NeedReplay = 0;
    SetDialogToSmart(SMART);
    SMART.ID = undefined;
    SMART.EditorHTML = undefined;
    SMART.EditorCode = undefined;
    if(CurProjectValue)
    {
        DapNumber = 7;
    }
    else
    {
        DapNumber =  + ($("idSmartList").value);
    }
    if(DapNumber > VM_VALUE.MaxDappsID)
    {
        VM_VALUE.MaxDappsID = DapNumber;
        InitVMArrays();
    }
    glSmart = DapNumber;
    SMART.Num = DapNumber;
    VM_SMARTS[glSmart] = SMART;
    VM_VALUE.Smart = SMART;
    if(bRecreate || VM_VALUE.PrevName !== SMART.Name || VM_VALUE.PrevStateFormat !== SMART.StateFormat)
    {
        bRecreate = 1;
        VM_VALUE.SmartBlock = CreateNewBlock({Type:130});
        var Currency = 0;
        if(SMART.TokenGenerate)
            Currency = glSmart;
        VM_VALUE.WalletAccount = GetNewAccount(100, "TEST", 1000, glSmart, Currency);
        VM_VALUE.WalletAccount2 = GetNewAccount(101, "TEST USD", 2000, glSmart, 1);
        VM_VALUE.OwnerAccount = GetNewAccount(102, "OWNER ACCOUNT", 3000, glSmart, Currency);
        VM_VALUE.ArrWallet = [VM_VALUE.WalletAccount, VM_VALUE.WalletAccount2, VM_VALUE.OwnerAccount];
        for(var i = 0; i < SMART.AccountLength; i++)
        {
            var Item = GetNewAccount(103 + i, "Smart base", i === 0 ? 10000 : 0, glSmart, Currency);
            if(SMART.OwnerPubKey)
                VM_VALUE.ArrWallet.push(Item);
            if(i === 0)
                VM_VALUE.BaseAccount = Item;
        }
        BASE_ACCOUNT = VM_VALUE.BaseAccount;
        InitStorageEmulate();
    }
    VM_VALUE.PrevStateFormat = SMART.StateFormat;
    VM_VALUE.PrevName = SMART.Name;
    BASE_ACCOUNT = VM_VALUE.BaseAccount;
    SMART.Account = BASE_ACCOUNT.Num;
    SMART.Owner = VM_VALUE.OwnerAccount.Num;
    SMART.HTML = undefined;
    SMART.Code = undefined;
    CreateFrame(Code, Parent);
    if(bRecreate)
    {
        try
        {
            var PayContext = {FromID:SMART.Owner, ToID:0, Description:"Smart create", Value:{SumCOIN:GetPrice(SMART), SumCENT:0}};
            RunPublicMethod("OnCreate", VM_VALUE.SmartBlock, BASE_ACCOUNT, PayContext);
            PayContext = {FromID:VM_VALUE.WalletAccount.Num, ToID:0, Description:"Smart set", Value:{SumCOIN:0, SumCENT:0}};
            RunPublicMethod("OnSetSmart", VM_VALUE.SmartBlock, VM_VALUE.WalletAccount, PayContext);
        }
        catch(e)
        {
            ToLog("Error: " + e);
        }
    }
}
function InitStorageEmulate()
{
    var StorageEmulate = {setItem:function (Key,Value)
        {
            this[Key] = Value;
        }, getItem:function (Key)
        {
            return this[Key];
        }};
    EmulateStorage = StorageEmulate;
    EmulateSessionStorage = StorageEmulate;
}
function GetNewAccount(Num,Name,Sum,Smart,Currency)
{
    if(!Smart)
        Smart = 0;
    if(!Currency)
        Currency = 0;
    var Item = VM_ACCOUNTS[Num];
    if(!Item)
    {
        Item = {};
        VM_ACCOUNTS[Num] = Item;
    }
    Item.Num = Num;
    Item.Name = Name;
    Item.Value = {SumCOIN:Sum, SumCENT:0, Smart:Smart};
    Item.SmartState = InitSmartState(Num, Smart);
    Item.Currency = Currency;
    Item.PubKey = DefPubKeyArr;
    if(Smart)
    {
        Item.PubKey = VM_VALUE.PubKey;
        Item.SmartObj = VM_SMARTS[Smart];
    }
    return Item;
}
var WasStartBlock;
function InitVMArrays()
{
    for(var Num = 0; Num <= VM_VALUE.CurBlockNum; Num++)
    {
        var Block = {Type:1, Body:"0101020304AABBCCDD", Params:"{}"};
        AddHash(Block);
        VM_VLOCKS[Num] = Block;
    }
    for(var Num = 8; Num <= VM_VALUE.MaxDappsID; Num++)
    {
        VM_SMARTS[Num] = {Num:Num, Name:"SMART#" + Num, ShortName:"TST"};
    }
    VM_SMARTS[1] = {Num:1, Name:"USD TOKEN" + Num, ShortName:"USD", TokenGenerate:1};
    for(var Num = 0; Num <= MaxAccCreate; Num++)
    {
        GetNewAccount(Num, "TEST#" + Num, 1000);
    }
    GetNewAccount(0, "System account", 900000000);
    if(!WasStartBlock)
    {
        setInterval(AddNewBlock, 1000);
        WasStartBlock = 1;
    }
}
function AddHash(Block)
{
    Block.AddrHash = sha3(JSON.stringify(Block));
    Block.Hash = sha3(JSON.stringify(Block));
}
function GetVMAccount(Num)
{
    var Item = VM_ACCOUNTS[Num];
    if(!Item)
        throw "Error account num=" + Num;
    else
        return Item;
}
function GetVMSmart(Num)
{
    var Item = VM_SMARTS[Num];
    if(!Item)
        throw "Error smart num=" + Num;
    else
        return Item;
}
function DoComputeSecret(Account,PubKey,F)
{
    var Result = ComputeSecretWithSmartNum(PubKey, VM_VALUE.PrivKey, glSmart);
    F(Result);
}
function SetMobileMode()
{
    ToLog("Run:SetMobileMode");
}
function CheckInstall()
{
    ToLog("Run:CheckInstall");
}
function CreateNewAccount(Currency)
{
    ToLogDebug("Run:CreateNewAccount");
    var Item = GetNewAccount(VM_ACCOUNTS.length, SMART.Name, 0, glSmart, Currency);
    VM_VALUE.ArrWallet.push(Item);
}
function ReloadDapp()
{
    ToLog("Run:ReloadDapp");
}
function SetLocationHash(Str)
{
    ToLog("Run:SetLocationHash: " + Str);
}
function DoTranslate(Data)
{
}
function SendCallMethod(ToNum,MethodName,Params,FromNum,FromSmartNum,bStatic)
{
    SetStatus("");
    var StrCode = GetSmartCode();
    var Account = GetVMAccount(ToNum);
    var PayContext = {FromID:ParseNum(FromNum), ToID:Account.Num, Description:"", Value:{SumCOIN:0, SumCENT:0}};
    var Data = {Type:135, Account:Account.Num, MethodName:MethodName, FromNum:FromNum, Params:JSON.stringify(Params)};
    var Block = CreateNewBlock(Data);
    if(bStatic)
        Block.BlockNum = 0;
    ToLogDebug("" + Block.BlockNum + ". CallMethod " + MethodName + " " + ToNum + "<-" + FromNum);
    try
    {
        return RunSmartMethod(Block, VM_VALUE.Smart, Account, Block.BlockNum, Block.TrNum, PayContext, MethodName, Params, 1, StrCode);
    }
    catch(e)
    {
        SendMessageError("" + e);
    }
}
function RunPublicMethod(MethodName,Block,Account,PayContext)
{
    var StrCode = GetSmartCode();
    ToLogDebug("RunPublicMethod " + MethodName);
    RunSmartMethod(Block, VM_VALUE.Smart, Account, Block.BlockNum, 0, PayContext, MethodName, undefined, 0, StrCode);
}
function CreateNewBlock(Data)
{
    VM_VALUE.CurBlockNum++;
    var Block = {BlockNum:VM_VALUE.CurBlockNum, TrNum:0, TxArray:[Data]};
    AddHash(Block);
    VM_VLOCKS[VM_VALUE.CurBlockNum] = Data;
    VM_VALUE.CurrentBlock = Block;
    return Block;
}
function AddNewBlock()
{
    var Block = CreateNewBlock({Type:0});
    ToLogDebug("Block: " + Block.BlockNum);
}
function DoGetData(Name,Params,Func)
{
    var SetData = {result:0};
    switch(Name)
    {
        case "DappWalletList":
            SetData.result = 1;
            SetData.arr = VM_VALUE.ArrWallet;
            break;
        case "DappSmartHTMLFile":
            SetData.result = 1;
            SetData.Body = GetHTMLCode();
            break;
        case "DappBlockFile":
            SetData.Body = VM_VLOCKS[Params.BlockNum];
            SetData.result = !!SetData.Body;
            break;
        case "DappAccountList":
            SetData.result = 1;
            SetData.arr = VM_ACCOUNTS.slice(Params.StartNum, Params.StartNum + Params.CountNum);
            break;
        case "DappSmartList":
            SetData.result = 1;
            SetData.arr = VM_SMARTS.slice(Params.StartNum, Params.StartNum + Params.CountNum);
            break;
        case "DappBlockList":
            SetData.result = 1;
            SetData.arr = VM_VLOCKS.slice(Params.StartNum, Params.StartNum + Params.CountNum);
            break;
        case "DappTransactionList":
            break;
        case "DappStaticCall":
            if(Params.Account >= VM_ACCOUNTS.length)
            {
                GetData(Name, Params, Func);
                return ;
            }
            else
            {
                SetData.RetValue = SendCallMethod(Params.Account, Params.MethodName, Params.Params, 0, glSmart, 1);
            }
            SetData.result = 1;
            break;
        default:
            ToLog("Error method name: " + Name);
    }
    ToLogDebug("GetData:\n" + JSON.stringify(Params));
    ToLogDebug("RESULT:\n" + JSON.stringify(SetData));
    Func(SetData);
}
function DoDappInfo(Data)
{
    var Network_Name = CONFIG_DATA.NETWORK;
    if(!Network_Name)
        Network_Name = "VIRTUAL-NET";
    ToLogDebug("DoDappInfo");
    Data.EmulateMode = 1;
    Data.CanReloadDapp = 0;
    Data.result = 1;
    Data.DELTA_CURRENT_TIME = 0;
    Data.MIN_POWER_POW_TR = 0;
    Data.FIRST_TIME_BLOCK = 0;
    Data.CONSENSUS_PERIOD_TIME = 1000;
    Data.PRICE_DAO = {NewAccount:10, NewSmart:100, NewTokenSmart:10000};
    Data.NEW_SIGN_TIME = 0;
    Data.NETWORK = Network_Name;
    Data.PubKey = DefPubKeyArr;
    Data.WalletIsOpen = 1;
    Data.WalletCanSign = 1;
    Data.Smart = SMART;
    Data.Account = BASE_ACCOUNT;
    Data.NumDappInfo = 0;
    Data.CurTime = Date.now();
    Data.CurBlockNum = VM_VALUE.CurBlockNum;
    Data.MaxAccID = VM_ACCOUNTS.length - 1;
    Data.MaxDappsID = VM_VALUE.MaxDappsID;
    Data.OPEN_PATH = OPEN_PATH;
    Data.ArrWallet = VM_VALUE.ArrWallet;
    Data.ArrEvent = [];
    Data.ArrLog = [];
    SendMessage(Data);
}
function InitSmartState(Num,Smart)
{
    if(Smart === glSmart && SMART.StateFormat)
    {
        var Map = {uint:0, byte:0, double:0, str:"\"\"", hash:"[]", arr:"[]"};
        var Str = SMART.StateFormat;
        Str = Str.replace(/[" "]/g, "");
        for(var key in Map)
        {
            var value = Map[key];
            Str = Str.replace(new RegExp(":" + key + "[0-9]{0,2}", "g"), ":" + value);
            Str = Str.replace(new RegExp("\\[" + key + "[0-9]{0,2}", "g"), "[" + value);
        }
        var Result;
        try
        {
            eval("Result=" + Str);
            Result.Num = Num;
        }
        catch(e)
        {
            ToLog("Error in StateFormat:\n" + e);
            Result = {Num:Num};
        }
        return Result;
    }
    else
    {
        return {Num:Num};
    }
}
window.$ToLog = ToLog;
window.$JSON = JSON;
function CoinSumHelper(CoinSum)
{
    if(typeof CoinSum === "number")
    {
        CoinSum = COIN_FROM_FLOAT(CoinSum);
    }
    CHECKSUM(CoinSum);
    if(CoinSum.SumCENT >= 1e9)
    {
        throw "ERROR SumCENT>=1e9";
    }
    if(CoinSum.SumCOIN < 0 || CoinSum.SumCENT < 0)
    {
        throw "ERROR Sum<0";
    }
    return CoinSum;
}
function $SetValue(ID,CoinSum)
{
    DO(3000);
    if(!RunContext.Smart.TokenGenerate)
    {
        throw "The smart-contract is not token generate, access to change values is denied";
    }
    CoinSum = CoinSumHelper(CoinSum);
    var ToData = GetVMAccount(ID);
    ToData.Value.SumCOIN = Math.trunc(CoinSum.SumCOIN);
    ToData.Value.SumCENT = Math.trunc(CoinSum.SumCENT);
    return true;
}
function MoveCoin(FromID,ToID,CoinSum,Description)
{
    CoinSum = CoinSumHelper(CoinSum);
    var FromData = GetVMAccount(FromID);
    var ToData = GetVMAccount(ToID);
    if(FromData.Currency !== ToData.Currency)
    {
        throw "Different currencies. Accounts: " + FromData.Num + " and " + ToData.Num;
    }
    if(FromData.Value.Smart !== RunContext.Smart.Num)
    {
        throw "The account: " + FromID + " does not belong to the smart-contract: " + RunContext.Smart.Num + ", access is denied";
    }
    if(FromData.Currency && (CoinSum.SumCOIN || CoinSum.SumCENT))
    {
        if(FromData.Value.SumCOIN >= 1e12 || ToData.Value.SumCOIN >= 1e12)
        {
            if(!FromData.Value.SumCOIN)
                throw "There is no token on the account ID:" + FromID;
            if(ToData.Value.SumCOIN)
                throw "The token is already on the account ID:" + ToID;
            CoinSum = {SumCOIN:FromData.Value.SumCOIN, SumCENT:FromData.Value.SumCENT};
        }
    }
    var Value = {SumCOIN:FromData.Value.SumCOIN, SumCENT:FromData.Value.SumCENT};
    if(!SUB(Value, CoinSum))
        throw "Not enough money on the account ID:" + FromID;
    SUB(FromData.Value, CoinSum);
    ADD(ToData.Value, CoinSum);
    var Context = {FromID:FromID, ToID:ToID, Description:Description, Value:CoinSum};
    if(FromData.Value.Smart)
    {
        RunPublicMethod("OnSend", VM_VALUE.CurrentBlock, FromData, Context);
    }
    if(ToData.Value.Smart)
    {
        RunPublicMethod("OnGet", VM_VALUE.CurrentBlock, ToData, Context);
    }
}
function $Send(ToID,CoinSum,Description)
{
    DO(3000);
    MoveCoin(RunContext.Account.Num, ToID, CoinSum, Description);
}
function $Move(FromID,ToID,CoinSum,Description)
{
    DO(3000);
    MoveCoin(FromID, ToID, CoinSum, Description);
}
function $Event(Description)
{
    DO(50);
    var Data = {cmd:"OnEvent", Description:Description, Smart:RunContext.Smart.Num, Account:RunContext.Account.Num, BlockNum:RunContext.BlockNum,
        TrNum:RunContext.TrNum};
    SendMessage(Data);
}
function $ReadAccount(ID)
{
    DO(900);
    var AccObj = GetVMAccount(ID);
    return GET_ACCOUNT(AccObj);
}
function $ReadSmart(ID)
{
    DO(900);
    var SmartObj = GetVMSmart(ID);
    return GET_SMART(SmartObj);
}
function $ReadState(ID)
{
    DO(900);
    var AccObj = GetVMAccount(ID);
    ToLogDebug("ReadState: " + ID + "\n" + JSON.stringify(AccObj.SmartState));
    return AccObj.SmartState;
}
function $WriteState(SmartState,ID)
{
    DO(3000);
    if(!ID)
        ID = SmartState.Num;
    ToLogDebug("WriteState: " + ID + "\n" + JSON.stringify(SmartState));
    var AccObj = GetVMAccount(ID);
    AccObj.SmartState = SmartState;
}
function $GetMaxAccount()
{
    DO(20);
    return VM_ACCOUNTS.length - 1;
}
var EvalContextMap = {};
function $require(SmartNum)
{
    DO(2000);
    var EvalContext = EvalContextMap[SmartNum];
    if(!EvalContext)
    {
        ToLog("Loading smart " + SmartNum + " from blockchain");
        var SmartCode = GetData("/smart/" + SmartNum);
        EvalContext = CreateSmartEvalContext(SmartCode);
        EvalContextMap[SmartNum] = EvalContext;
    }
    EvalContext.funclist.SetContext(RunContext.context);
    return EvalContext.publist;
}
function ToLogDebug(Str)
{
    if($("idDebugLog").checked)
    {
        ToLog(Str);
    }
}
function SendMessageError(Str)
{
    var Data = {};
    Data.cmd = "OnEvent";
    Data.Description = Str;
    Data.Error = 1;
    SendMessage(Data);
}
