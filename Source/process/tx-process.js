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


global.TreeFindTX = new STreeBuffer(30 * 1000, CompareItemHashSimple, "string");

setInterval(function ()
{
    if(SERVER)
    {
        SERVER.Close();
    }
    
    DoTXProcess();
}
, 20);

var BlockTree = new STreeBuffer(30 * 1000, CompareItemHashSimple, "number");

global.bShowDetail = 0;
global.StopTxProcess = 0;
var MinimalValidBlock = 0;
var glLastBlockNum = undefined;

var CountProcessWait = 0;
var CountProcessSkip = 0;
function DoTXProcess()
{
    if(CountProcessWait * 2 > CountProcessSkip)
    {
        CountProcessSkip++;
        return ;
    }
    
    var Count = DoTXProcessNext();
    if(Count)
    {
        CountProcessWait = 0;
    }
    else
    {
        CountProcessWait++;
    }
    CountProcessSkip = 0;
}

function DoTXProcessNext()
{
    var Count = 0;
    if(StopTxProcess)
        return Count;
    
    if(glLastBlockNum === undefined)
        InitTXProcess();
    var BlockMin = FindMinimal();
    if(!BlockMin)
    {
        if(bShowDetail)
            ToLog("!BlockMin");
        return Count;
    }
    
    var StartTime = Date.now();
    
    if(bShowDetail)
        ToLog("BlockMin: " + BlockMin.BlockNum + "  LastBlockNum=" + glLastBlockNum);
    var CountTX = 0;
    for(var Num = BlockMin.BlockNum; Num < BlockMin.BlockNum + 1000; Num++)
    {
        var EndTime = Date.now();
        var Delta = EndTime - StartTime;
        if(Delta >= 1000)
            break;
        
        var Block = SERVER.ReadBlockHeaderDB(Num);
        if(!Block)
            break;
        
        var LastBlockNumAct = DApps.Accounts.GetLastBlockNumAct();
        if(LastBlockNumAct >= 0 && LastBlockNumAct + 1 < Num)
        {
            var Delta = Num - LastBlockNumAct;
            
            if(bShowDetail)
                ToLog("************Skip on Block: " + LastBlockNumAct + " --" + Delta + "--> " + Num);
            BlockTree.Clear();
            break;
        }
        if(global.glStopTxProcessNum && Num >= global.glStopTxProcessNum)
        {
            if(global.WasStopTxProcessNum !== Num)
                ToLog("--------------------------------Stop TX AT NUM: " + Num);
            global.WasStopTxProcessNum = Num;
            break;
        }
        if(!IsValidSumHash(Block))
        {
            break;
        }
        
        var Item = BlockTree.LoadValue(Block.BlockNum, 1);
        if(Item && CompareArr(Item.SumHash, Block.SumHash) === 0)
        {
            if(bShowDetail)
                ToLog("WAS CALC: " + Num + " SumHash: " + GetHexFromArr(Block.SumHash).substr(0, 12));
            continue;
        }
        if(Num > 0)
        {
            var Block0 = SERVER.ReadBlockHeaderDB(Num - 1);
            if(Block0)
            {
                var Item0 = BlockTree.LoadValue(Block0.BlockNum, 1);
                if(Item0 && CompareArr(Item0.SumHash, Block0.SumHash) !== 0)
                {
                    if(bShowDetail)
                        ToLog("WAS_CHANGED_PREV_BLOCK = " + Block0.BlockNum);
                    break;
                }
            }
        }
        Block = SERVER.ReadBlockDB(Block.BlockNum);
        if(!Block)
            break;
        if(Block.BlockNum > 0)
        {
            var PrevBlock = SERVER.ReadBlockHeaderDB(Block.BlockNum - 1);
            if(!PrevBlock)
                break;
            Block.PrevSumHash = PrevBlock.SumHash;
        }
        else
        {
            Block.PrevSumHash = ZERO_ARR_32;
        }
        
        Count++;
        SERVER.BlockProcessTX(Block);
        if(Num % 100000 === 0)
            ToLog("CALC: " + Num);
        
        CountTX++;
        
        if(bShowDetail)
            ToLog("    CALC: " + Num + " SumHash: " + GetHexFromArr(Block.SumHash).substr(0, 12));
        
        BlockTree.SaveValue(Block.BlockNum, {BlockNum:Block.BlockNum, SumHash:Block.SumHash});
        glLastBlockNum = Block.BlockNum;
    }
    
    return CountTX;
}

function FindMinimal()
{
    
    var MaxNumBlockDB = SERVER.GetMaxNumBlockDB();
    if(MaxNumBlockDB && MaxNumBlockDB < glLastBlockNum)
    {
        if(bShowDetail)
            ToLog("MaxNumBlockDB<LastBlockNum: " + MaxNumBlockDB + "<" + glLastBlockNum);
        glLastBlockNum = MaxNumBlockDB - 1;
        BlockTree.Clear();
    }
    
    if(glLastBlockNum < MinimalValidBlock)
        glLastBlockNum = MinimalValidBlock;
    
    if(bShowDetail)
        ToLog("FindMinimal from LastBlockNum=" + glLastBlockNum);
    for(var Num = glLastBlockNum; Num--; Num >= 0)
    {
        if(Num < MinimalValidBlock)
            break;
        
        var Block = SERVER.ReadBlockHeaderDB(Num);
        if(!Block)
        {
            continue;
        }
        if(!IsValidSumHash(Block))
        {
            continue;
        }
        
        if(Block.BlockNum % PERIOD_ACCOUNT_HASH === 0)
        {
            var Item = DApps.Accounts.GetAccountHashItem(Block.BlockNum);
            if(Item)
            {
                BlockTree.SaveValue(Block.BlockNum, Item);
            }
        }
        
        var Item = BlockTree.LoadValue(Block.BlockNum, 1);
        if(Item && CompareArr(Item.SumHash, Block.SumHash) === 0)
            return Block;
        
        if(bShowDetail)
            ToLog("" + Num + "  " + Block.BlockNum + ". Item=" + JSON.stringify(Item) + "  MinimalValidBlock=" + MinimalValidBlock);
    }
    
    if(bShowDetail)
        ToLog("MinimalValidBlock:" + MinimalValidBlock);
    
    if(MinimalValidBlock === 0 && glLastBlockNum > 0)
    {
        RewriteAllTransactions();
    }
    Block = SERVER.ReadBlockHeaderDB(MinimalValidBlock);
    return Block;
}

function IsValidSumHash(Block)
{
    if(Block.BlockNum <= MinimalValidBlock + BLOCK_PROCESSING_LENGTH2)
        return 1;
    
    if(Block.BlockNum < 16)
        return 1;
    
    if(IsZeroArr(Block.SumHash))
        return 0;
    
    var PrevBlock = SERVER.ReadBlockHeaderDB(Block.BlockNum - 1);
    if(!PrevBlock)
        return 0;
    
    var SumHash2 = CalcSumHash(PrevBlock.SumHash, Block.Hash, Block.BlockNum, Block.SumPow);
    if(CompareArr(SumHash2, Block.SumHash) === 0)
        return 1;
    
    return 0;
}

function InitTXProcess()
{
    
    var StateTX = DApps.Accounts.DBStateTX.Read(0);
    if(!StateTX)
    {
        glLastBlockNum = 0;
        var MaxNum = DApps.Accounts.DBAccountsHash.GetMaxNum();
        if(MaxNum > 0)
        {
            var Item = DApps.Accounts.DBAccountsHash.Read(MaxNum);
            if(Item)
            {
                glLastBlockNum = Item.BlockNum;
            }
        }
        
        ToLog("DETECT NEW VER on BlockNum=" + glLastBlockNum, 2);
        DApps.Accounts.DBStateTX.Write({Num:0, BlockNum:glLastBlockNum, BlockNumMin:MinimalValidBlock});
    }
    StateTX = DApps.Accounts.DBStateTX.Read(0);
    glLastBlockNum = StateTX.BlockNum;
    MinimalValidBlock = StateTX.BlockNumMin;
    
    glLastBlockNum = PERIOD_ACCOUNT_HASH * Math.trunc(glLastBlockNum / PERIOD_ACCOUNT_HASH);
    
    if(glLastBlockNum > 100)
    {
        glLastBlockNum = 1 + glLastBlockNum - 100;
    }
    
    ToLog("Start CalcMerkleTree", 2);
    DApps.Accounts.CalcMerkleTree(1);
    ToLog("Finsih CalcMerkleTree", 2);
    
    if(glLastBlockNum <= 0)
        RewriteAllTransactions();
    else
        ToLog("Start NUM = " + glLastBlockNum, 2);
}


global.ClearDataBase = ClearDataBase;
function ClearDataBase()
{
    MinimalValidBlock = 0;
    for(var key in DApps)
    {
        DApps[key].ClearDataBase();
    }
    glLastBlockNum = 0;
    BlockTree.Clear();
    
    if(global.JINN)
        global.JINN.DBResult.Clear();
    ToLog("Start num = " + glLastBlockNum, 2);
}

global.RewriteAllTransactions = RewriteAllTransactions;
function RewriteAllTransactions()
{
    if(MinimalValidBlock > 0)
    {
        ToLog("*************Cant run RewriteAllTransactions, MinimalValidBlock:" + MinimalValidBlock, 2);
        return ;
    }
    
    ToLog("*************RewriteAllTransactions");
    
    ClearDataBase();
}

global.ReWriteDAppTransactions = ReWriteDAppTransactions;
function ReWriteDAppTransactions(Params)
{
    StopTxProcess = 0;
    
    var StartNum = Params.StartNum;
    var EndNum = Params.EndNum;
    ToLog("ReWriteDAppTransactions: " + StartNum + " - " + EndNum);
    BlockTree.Clear();
    if(StartNum < glLastBlockNum)
        glLastBlockNum = StartNum;
    
    ToLog("Start num = " + glLastBlockNum, 2);
}

function TXPrepareLoadRest(BlockNum)
{
    StopTxProcess = 1;
    MinimalValidBlock = BlockNum;
    ToLog("*************TXPrepareLoadRest:" + BlockNum, 2);
    ClearDataBase();
    
    DApps.Accounts.DBStateTX.Write({Num:0, BlockNum:glLastBlockNum, BlockNumMin:glLastBlockNum});
}
global.TXPrepareLoadRest = TXPrepareLoadRest;

function TXWriteAccArr(Params)
{
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
    
    ToLog("Start TXWriteAccHash: " + MinimalValidBlock, 2);
    for(var num = 0; true; num++)
    {
        var Item = DApps.Smart.DBSmart.Read(num);
        if(!Item)
            break;
        var Body = BufLib.GetBufferFromObject(Item, DApps.Smart.FORMAT_ROW, 20000, {});
        DApps.Smart.DBSmartWrite(Item);
    }
    
    DApps.Accounts.CalcMerkleTree(1);
    
    var Block = {BlockNum:MinimalValidBlock, SumHash:[]};
    var MaxAccount = DApps.Accounts.GetMaxAccount();
    var DataHash = DApps.Accounts.CalcHash(Block, MaxAccount);
    return DataHash;
}
global.TXWriteAccHash = TXWriteAccHash;
