/*
 * @project: TERA
 * @version: Development (beta)
 * @license: MIT (not for evil)
 * @copyright: Yuriy Ivanov (Vtools) 2017-2019 [progr76@gmail.com]
 * Web: https://terafoundation.org
 * Twitter: https://twitter.com/terafoundation
 * Telegram:  https://t.me/terafoundation
*/

"use strict";
var LOC_ADD_NAME = "$";
const MAX_LENGTH_STRING = 5000;
const $Math = {};
const $JSON = {};
var ListF = {};
ListF.$Math = $Math;
ListF.$JSON = $JSON;
var TickCounter = 0;
global.SetTickCounter = function (Value)
{
    TickCounter = Value;
}
function DO(Count)
{
    TickCounter -= Count;
    if(TickCounter < 0)
        throw new Error("Stop the execution code. The limit of ticks is over.");
}
var Map404 = Object.assign(Object.create(null), {});
Map404["prototype"] = 100;
Map404["constructor"] = 100;
Map404["__proto__"] = 100;
Map404["__count__"] = 100;
Map404["__noSuchMethod__"] = 100;
Map404["__parent__"] = 100;
function CHK404(Name)
{
    if(Map404[Name])
    {
        throw new Error("Not allow Identifier '" + Name + "'");
    }
    return Name;
}
function CHKL(Str)
{
    if(typeof Str === "string" && Str.length > MAX_LENGTH_STRING)
        throw new Error("Invalid string length:" + Str.length);
    return Str;
}
ListF.DO = DO;
ListF.CHK404 = CHK404;
ListF.CHKL = CHKL;
function GET_ACCOUNT(Obj)
{
    let Data = Obj;
    var GET_PROP = {get Num()
        {
            return Data.Num;
        }, get Currency()
        {
            return Data.Currency;
        }, get PubKey()
        {
            return CopyArr(Data.PubKey);
        }, get Name()
        {
            return Data.Name;
        }, get BlockNumCreate()
        {
            return Data.BlockNumCreate;
        }, get Adviser()
        {
            return Data.Adviser;
        }, get Smart()
        {
            return Data.Smart;
        }, get Value()
        {
            return {SumCOIN:Data.Value.SumCOIN, SumCENT:Data.Value.SumCENT, OperationID:Data.Value.OperationID, Smart:Data.Value.Smart};
        }, };
    return GET_PROP;
}
function GET_SMART(Obj)
{
    let Data = Obj;
    var GET_PROP = {get Num()
        {
            return Data.Num;
        }, get Version()
        {
            return Data.Version;
        }, get TokenGenerate()
        {
            return Data.TokenGenerate;
        }, get ISIN()
        {
            return Data.ISIN;
        }, get Zip()
        {
            return Data.Zip;
        }, get BlockNum()
        {
            return Data.BlockNum;
        }, get TrNum()
        {
            return Data.TrNum;
        }, get IconBlockNum()
        {
            return Data.IconBlockNum;
        }, get IconTrNum()
        {
            return Data.IconTrNum;
        }, get ShortName()
        {
            return Data.ShortName;
        }, get Name()
        {
            return Data.Name;
        }, get Description()
        {
            return Data.Description;
        }, get Account()
        {
            return Data.Account;
        }, get AccountLength()
        {
            return Data.AccountLength;
        }, get Owner()
        {
            return Data.Owner;
        }, get Code()
        {
            return Data.Code;
        }, get HTML()
        {
            return Data.HTML;
        }, get Fixed()
        {
            return Data.Fixed;
        }, get CoinName()
        {
            return Data.ShortName;
        }, get CentName()
        {
            return Data.CentName;
        }, };
    return GET_PROP;
}
function InitEval()
{
    $Math.abs = function ()
    {
        DO(6);
        return Math.abs.apply(Math, arguments);
    };
    $Math.acos = function ()
    {
        DO(16);
        return Math.acos.apply(Math, arguments);
    };
    $Math.acosh = function ()
    {
        DO(9);
        return Math.acosh.apply(Math, arguments);
    };
    $Math.asin = function ()
    {
        DO(19);
        return Math.asin.apply(Math, arguments);
    };
    $Math.asinh = function ()
    {
        DO(32);
        return Math.asinh.apply(Math, arguments);
    };
    $Math.atan = function ()
    {
        DO(13);
        return Math.atan.apply(Math, arguments);
    };
    $Math.atanh = function ()
    {
        DO(30);
        return Math.atanh.apply(Math, arguments);
    };
    $Math.atan2 = function ()
    {
        DO(15);
        return Math.atan2.apply(Math, arguments);
    };
    $Math.ceil = function ()
    {
        DO(6);
        return Math.ceil.apply(Math, arguments);
    };
    $Math.cbrt = function ()
    {
        DO(22);
        return Math.cbrt.apply(Math, arguments);
    };
    $Math.expm1 = function ()
    {
        DO(18);
        return Math.expm1.apply(Math, arguments);
    };
    $Math.clz32 = function ()
    {
        DO(5);
        return Math.clz32.apply(Math, arguments);
    };
    $Math.cos = function ()
    {
        DO(12);
        return Math.cos.apply(Math, arguments);
    };
    $Math.cosh = function ()
    {
        DO(20);
        return Math.cosh.apply(Math, arguments);
    };
    $Math.exp = function ()
    {
        DO(16);
        return Math.exp.apply(Math, arguments);
    };
    $Math.floor = function ()
    {
        DO(7);
        return Math.floor.apply(Math, arguments);
    };
    $Math.fround = function ()
    {
        DO(6);
        return Math.fround.apply(Math, arguments);
    };
    $Math.hypot = function ()
    {
        DO(56);
        return Math.hypot.apply(Math, arguments);
    };
    $Math.imul = function ()
    {
        DO(3);
        return Math.imul.apply(Math, arguments);
    };
    $Math.log = function ()
    {
        DO(10);
        return Math.log.apply(Math, arguments);
    };
    $Math.log1p = function ()
    {
        DO(23);
        return Math.log1p.apply(Math, arguments);
    };
    $Math.log2 = function ()
    {
        DO(19);
        return Math.log2.apply(Math, arguments);
    };
    $Math.log10 = function ()
    {
        DO(16);
        return Math.log10.apply(Math, arguments);
    };
    $Math.max = function ()
    {
        DO(6);
        return Math.max.apply(Math, arguments);
    };
    $Math.min = function ()
    {
        DO(6);
        return Math.min.apply(Math, arguments);
    };
    $Math.pow = function ()
    {
        DO(40);
        return Math.pow.apply(Math, arguments);
    };
    $Math.round = function ()
    {
        DO(7);
        return Math.round.apply(Math, arguments);
    };
    $Math.sign = function ()
    {
        DO(5);
        return Math.sign.apply(Math, arguments);
    };
    $Math.sin = function ()
    {
        DO(10);
        return Math.sin.apply(Math, arguments);
    };
    $Math.sinh = function ()
    {
        DO(24);
        return Math.sinh.apply(Math, arguments);
    };
    $Math.sqrt = function ()
    {
        DO(6);
        return Math.sqrt.apply(Math, arguments);
    };
    $Math.tan = function ()
    {
        DO(13);
        return Math.tan.apply(Math, arguments);
    };
    $Math.tanh = function ()
    {
        DO(24);
        return Math.tanh.apply(Math, arguments);
    };
    $Math.trunc = function ()
    {
        DO(6);
        return Math.trunc.apply(Math, arguments);
    };
    $Math.random = function ()
    {
        DO(1);
        return 0;
    };
    var arr = Object.getOwnPropertyNames(JSON);
    for(var name of arr)
    {
        $JSON[name] = JSON[name];
    }
    FreezeObjectChilds($Math);
    Object.freeze($Math);
    FreezeObjectChilds($JSON);
    Object.freeze($JSON);
    FreezeObjectChilds(Array.prototype);
    FreezeObjectChilds(Object.prototype);
    FreezeObjectChilds(String.prototype);
    FreezeObjectChilds(Number.prototype);
    FreezeObjectChilds(Boolean.prototype);
    var Obj = function ()
    {
    };
    Object.freeze(Obj.bind);
    Object.freeze(Obj.apply);
    Object.freeze(Obj.call);
    Object.freeze(Obj.toString);
    Object.freeze(Obj.constructor);
    for(var key in ListF)
    {
        Object.freeze(ListF[key]);
    }
}
function FreezeObjectChilds(Value)
{
    var arr = Object.getOwnPropertyNames(Value);
    for(var name of arr)
    {
        Object.freeze(Value[name]);
    }
}
function ChangePrototype()
{
    var Array_prototype_concat = Array.prototype.concat;
    var Array_prototype_toString = Array.prototype.toString;
    Array.prototype.concat = function ()
    {
        if(RunContext)
            throw "Error Access denied: concat";
        else
            return Array_prototype_concat.apply(this, arguments);
    };
    Array.prototype.toString = function ()
    {
        if(RunContext)
            throw "Error Access denied: toString";
        else
            return Array_prototype_toString.apply(this, arguments);
    };
    Array.prototype.toLocaleString = Array.prototype.toString;
    Number.prototype.toLocaleString = function ()
    {
        return this.toString();
    };
    String.prototype.toLocaleLowerCase = String.prototype.toLowerCase;
    String.prototype.toLocaleUpperCase = String.prototype.toUpperCase;
    var String_prototype_localeCompare = String.prototype.localeCompare;
    String.prototype.localeCompare = function ()
    {
        if(RunContext)
            throw "Error Access denied: localeCompare";
        else
            return String_prototype_localeCompare.apply(this, arguments);
    };
    var String_prototype_match = String.prototype.match;
    String.prototype.match = function ()
    {
        if(RunContext)
            throw "Error Access denied: match";
        else
            return String_prototype_match.apply(this, arguments);
    };
    var String_prototype_repeat = String.prototype.repeat;
    String.prototype.repeat = function ()
    {
        if(RunContext)
            throw "Error Access denied: repeat";
        else
            return String_prototype_repeat.apply(this, arguments);
    };
    var String_prototype_search = String.prototype.search;
    String.prototype.search = function ()
    {
        if(RunContext)
            throw "Error Access denied: search";
        else
            return String_prototype_search.apply(this, arguments);
    };
    var String_prototype_padStart = String.prototype.padStart;
    String.prototype.padStart = function ()
    {
        if(RunContext)
            throw "Error Access denied: padStart";
        else
            return String_prototype_padStart.apply(this, arguments);
    };
    var String_prototype_padEnd = String.prototype.padEnd;
    String.prototype.padEnd = function ()
    {
        if(RunContext)
            throw "Error Access denied: padEnd";
        else
            return String_prototype_padEnd.apply(this, arguments);
    };
    String.prototype.right = function (count)
    {
        if(this.length > count)
            return this.substr(this.length - count, count);
        else
            return this.substr(0, this.length);
    };
}
ListF.$SetValue = function (ID,CoinSum)
{
    DO(3000);
    ID = ParseNum(ID);
    if(!RunContext.Smart.TokenGenerate)
    {
        throw "The smart-contract is not token generate, access to change values is denied";
    }
    var ToData = DApps.Accounts.ReadStateTR(ID);
    if(!ToData)
    {
        throw "Account does not exist.Error id number: " + ID;
    }
    if(ToData.Currency !== RunContext.Smart.Num)
    {
        throw "The account currency does not belong to the smart-contract, access to change values is denied";
    }
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
    ToData.Value.SumCOIN = Math.trunc(CoinSum.SumCOIN);
    ToData.Value.SumCENT = Math.trunc(CoinSum.SumCENT);
    DApps.Accounts.WriteStateTR(ToData, RunContext.TrNum);
    return true;
}
ListF.$Send = function (ToID,CoinSum,Description)
{
    DO(3000);
    ToID = ParseNum(ToID);
    if(typeof CoinSum === "number")
        CoinSum = COIN_FROM_FLOAT(CoinSum);
    CHECKSUM(CoinSum);
    if(CoinSum.SumCENT >= 1e9)
    {
        throw "ERROR SumCENT>=1e9";
    }
    if(CoinSum.SumCOIN < 0 || CoinSum.SumCENT < 0)
    {
        throw "ERROR Sum<0";
    }
    var ToData = DApps.Accounts.ReadStateTR(ToID);
    if(!ToData)
    {
        throw "Error ToID - the account number does not exist.";
    }
    if(RunContext.Account.Currency !== ToData.Currency)
    {
        throw "Different currencies. Accounts: " + RunContext.Account.Num + " and " + ToID;
    }
    DApps.Accounts.SendMoneyTR(RunContext.Block, RunContext.Account.Num, ToID, CoinSum, RunContext.BlockNum, RunContext.TrNum,
    Description, Description, 1, 1);
}
ListF.$Move = function (FromID,ToID,CoinSum,Description)
{
    DO(3000);
    FromID = ParseNum(FromID);
    ToID = ParseNum(ToID);
    var FromData = DApps.Accounts.ReadStateTR(FromID);
    if(!FromData)
    {
        throw "Error FromID - the account number does not exist.";
    }
    var ToData = DApps.Accounts.ReadStateTR(ToID);
    if(!ToData)
    {
        throw "Error ToID - the account number does not exist.";
    }
    if(FromData.Currency !== ToData.Currency)
    {
        throw "Different currencies. Accounts: " + FromID + " and " + ToID;
    }
    if(FromData.Value.Smart !== RunContext.Smart.Num)
    {
        throw "The account: " + FromID + " does not belong to the smart-contract: " + RunContext.Smart.Num + ", access is denied";
    }
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
    CoinSum.SumCOIN = Math.trunc(CoinSum.SumCOIN);
    CoinSum.SumCENT = Math.trunc(CoinSum.SumCENT);
    DApps.Accounts.SendMoneyTR(RunContext.Block, FromID, ToID, CoinSum, RunContext.BlockNum, RunContext.TrNum, Description, Description,
    1, 1);
}
ListF.$Event = function (Description)
{
    DO(50);
    DApps.Accounts.DBChanges.TREvent.push({Description:Description, Smart:RunContext.Smart.Num, Account:RunContext.Account.Num,
        BlockNum:RunContext.BlockNum, TrNum:RunContext.TrNum});
    if(global.DebugEvent)
        DebugEvent(Description);
    if(global.CurTrItem)
    {
        ToLogClient(Description, global.CurTrItem, false);
    }
}
ListF.$ReadAccount = function (ID)
{
    DO(900);
    ID = ParseNum(ID);
    var Account = DApps.Accounts.ReadStateTR(ID);
    if(!Account)
        throw "Error read account Num: " + ID;
    return GET_ACCOUNT(Account);
}
ListF.$ReadSmart = function (ID)
{
    if(RunContext.BlockNum < global.UPDATE_CODE_2)
    {
        throw "Method call not available";
    }
    DO(900);
    ID = ParseNum(ID);
    var Smart = DApps.Smart.ReadSmart(ID);
    if(!Smart)
        throw "Error smart ID: " + ID;
    return GET_SMART(Smart);
}
ListF.$ReadState = function (ID)
{
    DO(900);
    ID = ParseNum(ID);
    var Account = DApps.Accounts.ReadStateTR(ID);
    if(!Account)
        throw "Error read state account Num: " + ID;
    var Smart;
    if(Account.Value.Smart === RunContext.Smart.Num)
    {
        Smart = RunContext.Smart;
    }
    else
    {
        DO(100);
        var Smart = DApps.Smart.ReadSmart(Account.Value.Smart);
        if(!Smart)
        {
            throw "Error smart ID: " + Account.Value.Smart;
        }
    }
    var Data;
    if(Smart.StateFormat)
        Data = BufLib.GetObjectFromBuffer(Account.Value.Data, Smart.StateFormat, Smart.WorkStruct, 1);
    else
        Data = {};
    if(typeof Data === "object")
        Data.Num = ID;
    return Data;
}
ListF.$WriteState = function (Obj,ID)
{
    DO(3000);
    if(ID === undefined)
        ID = Obj.Num;
    ID = ParseNum(ID);
    var Account = DApps.Accounts.ReadStateTR(ID);
    if(!Account)
        throw "Error write account Num: " + ID;
    var Smart = RunContext.Smart;
    if(Account.Value.Smart !== Smart.Num)
    {
        throw "The account: " + ID + " does not belong to the smart-contract: " + Smart.Num + ", access to change state is denied";
    }
    Account.Value.Data = BufLib.GetBufferFromObject(Obj, Smart.StateFormat, 80, Smart.WorkStruct, 1);
    DApps.Accounts.WriteStateTR(Account, RunContext.TrNum);
}
ListF.$GetMaxAccount = function ()
{
    DO(20);
    return DApps.Accounts.DBChanges.TRMaxAccount;
}
ListF.$ADD = function (Coin,Value2)
{
    DO(5);
    return ADD(Coin, Value2);
}
ListF.$SUB = function (Coin,Value2)
{
    DO(5);
    return SUB(Coin, Value2);
}
ListF.$ISZERO = function (Coin)
{
    DO(5);
    if(Coin.SumCOIN === 0 && Coin.SumCENT === 0)
        return true;
    else
        return false;
}
ListF.$FLOAT_FROM_COIN = function (Coin)
{
    DO(5);
    return FLOAT_FROM_COIN(Coin);
}
ListF.$COIN_FROM_FLOAT = function (Sum)
{
    DO(20);
    return COIN_FROM_FLOAT(Sum);
}
ListF.$COIN_FROM_STRING = function (Sum)
{
    DO(20);
    return COIN_FROM_STRING(Sum);
}
ListF.$require = function (SmartNum)
{
    DO(2000);
    SmartNum = ParseNum(SmartNum);
    var Smart = DApps.Smart.ReadSmart(SmartNum);
    if(!Smart)
    {
        throw "Smart does not exist. Error id number: " + SmartNum;
    }
    var EvalContext = GetSmartEvalContext(Smart);
    EvalContext.funclist.SetContext(RunContext.context);
    return EvalContext.publist;
}
ListF.$GetHexFromArr = function (Arr)
{
    DO(20);
    return GetHexFromArr(Arr);
}
ListF.$GetArrFromHex = function (Str)
{
    DO(20);
    return GetArrFromHex(Str);
}
ListF.$sha = function (Str)
{
    DO(1000);
    return shaarr(Str);
}
ListF.$isFinite = function (a)
{
    DO(5);
    return isFinite(a);
}
ListF.$isNaN = function (a)
{
    DO(5);
    return isNaN(a);
}
ListF.$parseFloat = function (a)
{
    DO(10);
    var Num = parseFloat(a);
    if(!Num)
        Num = 0;
    if(isNaN(Num))
        Num = 0;
    return Num;
}
ListF.$parseInt = function (a)
{
    DO(10);
    var Num = parseInt(a);
    if(!Num)
        Num = 0;
    if(isNaN(Num))
        Num = 0;
    return Num;
}
ListF.$parseUint = function (a)
{
    DO(10);
    return ParseNum(a);
}
ListF.$String = function (a)
{
    DO(5);
    return String(a);
}
ListF.$Number = function (a)
{
    DO(5);
    return Number(a);
}
ListF.$Boolean = function (a)
{
    DO(5);
    return Boolean(a);
}
function GetParsing(Str)
{
    LexerJS.ParseCode(Str);
    var Code = LexerJS.stream;
    for(var key in LexerJS.FunctionMap)
    {
        Code += ";\nfunclist." + key + "=" + LOC_ADD_NAME + key;
    }
    for(var key in LexerJS.ExternMap)
    {
        Code += ";\npublist." + key + "=" + LOC_ADD_NAME + key;
    }
    Code += "\n\
    var context;\
    funclist.SetContext=function(cont){context=cont;};\
    ";
    return Code;
}
function GetSmartEvalContext(Smart)
{
    var EvalContext = DApps.Smart.DBSmart.GetMap("EVAL" + Smart.Num);
    if(!EvalContext)
    {
        EvalContext = CreateSmartEvalContext(Smart.Code);
        DApps.Smart.DBSmart.SetMap("EVAL" + Smart.Num, EvalContext);
    }
    return EvalContext;
}
function CreateSmartEvalContext(Code)
{
    var CodeLex = GetParsing(Code);
    var EvalContext = {};
    RunSmartEvalContext(CodeLex, EvalContext);
    for(var key in ListF)
    {
        Object.defineProperty(EvalContext, key, {writable:false, value:ListF[key]});
    }
    for(var key in EvalContext.funclist)
    {
        Object.freeze(EvalContext.funclist[key]);
    }
    for(var key in EvalContext)
    {
        Object.freeze(EvalContext[key]);
    }
    Object.freeze(EvalContext.funclist);
    Object.freeze(EvalContext.publist);
    return EvalContext;
}
global.CreateSmartEvalContext = CreateSmartEvalContext;
var RunContext = undefined;
global.RunSmartMethod = RunSmartMethod;
function RunSmartMethod(Block,SmartOrSmartID,Account,BlockNum,TrNum,PayContext,MethodName,Params,bPublic,SmartCode)
{
    var Smart = SmartOrSmartID;
    if(typeof SmartOrSmartID === "number")
    {
        Smart = DApps.Smart.ReadSmart(SmartOrSmartID);
        if(!Smart)
        {
            if(bPublic)
                throw "Smart does not exist. Error id number: " + SmartOrSmartID;
            else
                return ;
        }
    }
    var EvalContext;
    if(typeof SmartCode === "string")
        EvalContext = CreateSmartEvalContext(SmartCode);
    else
        EvalContext = GetSmartEvalContext(Smart);
    if(!EvalContext.funclist[MethodName] || (bPublic && !EvalContext.publist[MethodName]))
    {
        if(bPublic)
            throw "Method '" + MethodName + "' not found in smart contract";
        else
            return ;
    }
    var context = {};
    if(BlockNum >= global.UPDATE_CODE_1 && !PayContext)
    {
        PayContext = {FromID:0, ToID:Account.Num, Description:"", Value:{SumCOIN:0, SumCENT:0}};
    }
    if(PayContext)
    {
        context.BlockNum = BlockNum;
        context.BlockHash = CopyArr(Block.Hash);
        context.BlockAddrHash = CopyArr(Block.AddrHash);
        context.TrNum = TrNum;
        context.Account = GET_ACCOUNT(Account);
        context.Smart = GET_SMART(Smart);
        context.FromNum = PayContext.FromID;
        context.ToNum = PayContext.ToID;
        context.Description = PayContext.Description;
        if(PayContext.Value)
            context.Value = {SumCOIN:PayContext.Value.SumCOIN, SumCENT:PayContext.Value.SumCENT};
    }
    if(Block.BlockNum === 0)
    {
        context.GetBlockHeader = StaticGetBlockHeader;
        context.GetBlockNumDB = StaticGetBlockNumDB;
        context.GetSmart = StaticGetSmart;
    }
    var LocalRunContext = {Block:Block, Smart:Smart, Account:Account, BlockNum:BlockNum, TrNum:TrNum, context:context};
    var RetValue;
    var _RunContext = RunContext;
    RunContext = LocalRunContext;
    EvalContext.funclist.SetContext(RunContext.context);
    try
    {
        RetValue = EvalContext.funclist[MethodName](Params);
    }
    catch(e)
    {
        throw e;
    }
    finally
    {
        RunContext = _RunContext;
    }
    return RetValue;
}
var glBlock0;
global.RunStaticSmartMethod = RunStaticSmartMethod;
function RunStaticSmartMethod(AccountNum,MethodName,Params)
{
    DApps.Accounts.BeginBlock();
    DApps.Accounts.BeginTransaction();
    SetTickCounter(100000);
    var Account = DApps.Accounts.ReadStateTR(AccountNum);
    if(!Account)
    {
        return {result:0, RetValue:"Error account Num: " + AccountNum};
    }
    if(!glBlock0)
        glBlock0 = SERVER.ReadBlockHeaderDB(0);
    try
    {
        var BlockNum = GetCurrentBlockNumByTime();
        var RetValue = RunSmartMethod(glBlock0, Account.Value.Smart, Account, BlockNum, 0, undefined, MethodName, Params, 1);
        return {result:1, RetValue:RetValue};
    }
    catch(e)
    {
        return {result:0, RetValue:"" + e};
    }
}
function StaticGetBlockHeader(BlockNum)
{
    DO(100);
    return SERVER.ReadBlockHeaderDB(BlockNum);
}
function StaticGetBlockNumDB()
{
    return SERVER.GetMaxNumBlockDB();
}
function StaticGetSmart(Num)
{
    DO(100);
    var Smart = DApps.Smart.ReadSmart(Num);
    return GET_SMART(Smart);
}
ChangePrototype();
InitEval();
