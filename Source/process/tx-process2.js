/*
 * @project: TERA
 * @version: Development (beta)
 * @license: MIT (not for evil)
 * @copyright: Yuriy Ivanov (Vtools) 2017-2020 [progr76@gmail.com]
 * Web: https://terafoundation.org
 * Twitter: https://twitter.com/terafoundation
 * Telegram:  https://t.me/terafoundation
*/


global.PROCESS_NAME = "TX";

const crypto = require('crypto');
const fs = require('fs');

require("../core/constant");
global.DATA_PATH = GetNormalPathString(global.DATA_PATH);
global.CODE_PATH = GetNormalPathString(global.CODE_PATH);
require("../core/library");



global.READ_ONLY_DB = 0;

require("./child-process");

setInterval(PrepareStatEverySecond, 1000);

process.on('message', function (msg)
{
    switch(msg.cmd)
    {
        case "FindTX":
            global.TreeFindTX.SaveValue(msg.TX, msg);
            break;
        case "SetSmartEvent":
            global.TreeFindTX.SaveValue("Smart:" + msg.Smart, 1);
            break;
            
        default:
            break;
    }
}
);

global.SetStatMode = function (Val)
{
    global.STAT_MODE = Val;
    return global.STAT_MODE;
}


global.HTTP_PORT_NUMBER = 0;
var CServerDB = require("../core/transaction-validator");
global.TreeFindTX = new STreeBuffer(30 * 1000, CompareItemHashSimple, "string");

var KeyPair = crypto.createECDH('secp256k1');
KeyPair.setPrivateKey(Buffer.from([77, 77, 77, 77, 77, 77, 77, 77, 77, 77, 77, 77, 77, 77, 77, 77, 77, 77, 77, 77, 77, 77,
77, 77, 77, 77, 77, 77, 77, 77, 77, 77]));
global.SERVER = new CServerDB(KeyPair, undefined, undefined, false, true);
if(global.JINN_MODE)
{
    SERVER.port = 0;
    SERVER.ip = "0.0.0.0";
    
    var JinnLib = require("../jinn/tera");
    var Map = {"Block":1, "BlockDB":1, "Log":1, };
    JinnLib.Create(SERVER, Map);
}

global.bShowDetail = 0;
global.StopTxProcess = 0;


global.ClearDataBase = ClearDataBase;
function ClearDataBase()
{
    for(var key in DApps)
    {
        DApps[key].ClearDataBase();
    }
    
    if(global.JINN)
        global.JINN.DBResult.Clear();
    ToLog("Start num = 0", 2);
}

global.RewriteAllTransactions = RewriteAllTransactions;
function RewriteAllTransactions(bSilent)
{
    var StateTX = DApps.Accounts.DBStateTX.Read(0);
    var MinimalValidBlock = StateTX.BlockNumMin;
    if(MinimalValidBlock > 0)
    {
        if(!bSilent)
            ToLog("*************Cant run RewriteAllTransactions, MinimalValidBlock:" + MinimalValidBlock, 2);
        return 0;
    }
    
    if(!bSilent)
        ToLog("*************RewriteAllTransactions");
    
    ClearDataBase();
    return 1;
}

global.ReWriteDAppTransactions = ReWriteDAppTransactions;
function ReWriteDAppTransactions(Params)
{
    StopTxProcess = 0;
    
    var StartNum = Params.StartNum;
    var EndNum = Params.EndNum;
    ToLog("ReWriteDAppTransactions: " + StartNum + " - " + EndNum);
    
    while(1)
    {
        var LastBlockNum = DApps.Accounts.GetLastBlockNumAct();
        if(LastBlockNum <= 0)
        {
            ToLog("Find LastBlockNum=" + LastBlockNum);
            RewriteAllTransactions();
            return ;
        }
        if(LastBlockNum >= StartNum)
        {
            BlockDeleteTX(LastBlockNum);
        }
        else
        {
            break;
        }
    }
    
    ToLog("Start num = " + StartNum, 2);
}

function TXPrepareLoadRest(BlockNum)
{
    StopTxProcess = 1;
    ToLog("*************TXPrepareLoadRest:" + BlockNum, 2);
    
    ClearDataBase();
    
    var StateTX = DApps.Accounts.DBStateTX.Read(0);
    StateTX.BlockNumMin = BlockNum;
    DApps.Accounts.DBStateTX.Write(StateTX);
}
global.TXPrepareLoadRest = TXPrepareLoadRest;

function TXWriteAccArr(Params)
{
    var StateTX = DApps.Accounts.DBStateTX.Read(0);
    var MinimalValidBlock = StateTX.BlockNumMin;
    
    var WorkStruct = {};
    var WorkFormat = DApps.Accounts.FORMAT_ACCOUNT_ROW;
    
    ToLog("Write accounts: " + Params.StartNum + "-" + Params.Arr.length, 2);
    for(var i = 0; i < Params.Arr.length; i++)
    {
        var Data = BufLib.GetObjectFromBuffer(Params.Arr[i], WorkFormat, WorkStruct);
        Data.Num = Params.StartNum + i;
        DApps.Accounts.DBStateWriteInner(Data, MinimalValidBlock);
    }
}
global.TXWriteAccArr = TXWriteAccArr;

function TXWriteSmartArr(Params)
{
    var WorkStruct = {};
    var WorkFormat = DApps.Smart.FORMAT_ROW;
    
    ToLog("Write smarts: " + Params.StartNum + "-" + Params.Arr.length, 2);
    for(var i = 0; i < Params.Arr.length; i++)
    {
        var Data = BufLib.GetObjectFromBuffer(Params.Arr[i], WorkFormat, WorkStruct);
        Data.Num = Params.StartNum + i;
        DApps.Smart.DBSmart.Write(Data);
    }
}
global.TXWriteSmartArr = TXWriteSmartArr;

function TXWriteAccHash()
{
    StopTxProcess = 0;
    
    ToLog("Start TXWriteAccHash", 2);
    for(var num = 0; true; num++)
    {
        var Item = DApps.Smart.DBSmart.Read(num);
        if(!Item)
            break;
        DApps.Smart.DBSmartWrite(Item);
    }
    
    DApps.Accounts.CalcMerkleTree(1);
    
    var Block = {BlockNum:MinimalValidBlock, SumHash:[]};
    var MaxAccount = DApps.Accounts.GetMaxAccount();
    var DataHash = DApps.Accounts.CalcHash(Block, MaxAccount);
    return DataHash;
}
global.TXWriteAccHash = TXWriteAccHash;





class CTXProcess
{
    constructor()
    {
        
        var LastBlockNum = DApps.Accounts.GetLastBlockNumAct();
        ToLog("Init CTXProcess: " + LastBlockNum)
        this.ErrorAccHash = 0
        this.TimeWait = 0
    }
    
    Run()
    {
        if(StopTxProcess)
            return ;
        
        var StartTime = Date.now();
        if(this.TimeWait)
        {
            if(StartTime - this.TimeWait < 600)
                return ;
        }
        this.TimeWait = 0
        if(this.ErrorAccHash >= 10000)
        {
            this.ErrorAccHash = 0
            ToLog("FORCE CalcMerkleTree")
            DApps.Accounts.CalcMerkleTree(1)
            return ;
        }
        
        for(var i = 0; i < 500; i++)
        {
            var Result = this.RunItem();
            if(!Result)
            {
                this.TimeWait = Date.now()
                return ;
            }
            
            if(Date.now() - StartTime > 1000)
                return ;
        }
    }
    
    RunItem()
    {
        
        var LastItem = DApps.Accounts.GetLastBlockNumItem();
        if(!LastItem)
        {
            ToLog("Detect all rewrite tx")
            if(!RewriteAllTransactions(1))
            {
                ToLog("ERROR DATABASE TX")
                return 0;
            }
            LastItem = {BlockNum:0, Mode:100}
        }
        
        var Block = SERVER.ReadBlockHeaderDB(LastItem.BlockNum);
        if(!Block)
        {
            if(bShowDetail)
                ToLog("Block:DeleteTX on Block=" + LastItem.BlockNum)
            BlockDeleteTX(LastItem.BlockNum)
            return  - 1;
        }
        
        if(LastItem.HashData)
        {
            if(!IsEqArr(LastItem.HashData.SumHash, Block.SumHash))
            {
                if(bShowDetail)
                    ToLog("SumHash:DeleteTX on Block=" + LastItem.BlockNum)
                BlockDeleteTX(LastItem.BlockNum)
                return  - 1;
            }
            
            var AccHash = DApps.Accounts.GetCalcHash();
            if(!IsEqArr(LastItem.HashData.AccHash, AccHash))
            {
                this.ErrorAccHash++
                ToLog("AccHash:DeleteTX on Block=" + LastItem.BlockNum)
                BlockDeleteTX(LastItem.BlockNum)
                return  - 1;
            }
        }
        
        var BlockNum = Block.BlockNum + 1;
        var Block2 = SERVER.ReadBlockDB(BlockNum);
        if(!Block2)
            return 0;
        Block2.PrevSumHash = Block.SumHash
        
        this.ErrorAccHash = 0
        SERVER.BlockProcessTX(Block2)
        if(BlockNum % 100000 === 0 || bShowDetail)
            ToLog("CALC: " + BlockNum)
        return 1;
    }
};

function BlockDeleteTX(BlockNum)
{
    SERVER.BlockDeleteTX({BlockNum:BlockNum});
}

var TxProcess = new CTXProcess();

setInterval(function ()
{
    if(SERVER)
    {
        SERVER.Close();
    }
    
    TxProcess.Run();
}
, 50);
