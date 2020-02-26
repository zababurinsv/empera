/*
 * @project: JINN
 * @version: 1.0
 * @license: MIT (not for evil)
 * @copyright: Yuriy Ivanov (Vtools) 2019-2020 [progr76@gmail.com]
 * Telegram:  https://t.me/progr76
*/

/**
 *
 * The entry in the database (the base class, DB emulation)
 *
**/
'use strict';
global.JINN_MODULES.push({InitClass:InitClass});

global.DB_BLOCK_FORMAT = {BlockNum:"uint", LinkHash:"hash", TreeHash:"hash", MinerHash:"hash", PrevBlockHash:"hash", SumPow:"uint",
    TxData:[{HASH:"hash", HashPow:"hash", body:"tr"}], };
global.DB_BLOCK_FORMATWRK = {};
const DB_BLOCK_HEADER_FORMAT = GetCopyObj(DB_BLOCK_FORMAT);
delete DB_BLOCK_HEADER_FORMAT.TxData;
const DB_BLOCK_HEADER_FORMATWRK = {};

//Engine context

function InitClass(Engine)
{
    Engine.InitDB = function ()
    {
        Engine.ArrDB = [];
    };
    Engine.WriteGenesisDB = function ()
    {
        if(!Engine.GenesisArr)
            Engine.CreateGenesisArray();
        for(var Num = 0; Num < JINN_CONST.BLOCK_GENESIS_COUNT; Num++)
        {
            var Block = Engine.GetGenesisBlock(Num);
            Engine.SaveToDB(Block);
        }
    };
    
    Engine.GetBlockDB = function (BlockNum)
    {
        var MaxNum = Engine.GetMaxNumBlockDB();
        if(BlockNum > MaxNum)
            return undefined;
        
        var Find = Engine.FindBlockDBInCache(BlockNum, 1);
        if(Find)
            return Find;
        else
        {
            JINN_STAT.LoadDB++;
            var Block = Engine.GetBlockDBInner(BlockNum);
            if(Block)
                Engine.AddBlockDBToCache(Block, 1);
            return Block;
        }
    };
    
    Engine.GetBlockHeaderDB = function (BlockNum,bRawMode)
    {
        var MaxNum = Engine.GetMaxNumBlockDB();
        if(BlockNum > MaxNum)
            return undefined;
        
        var Find = Engine.FindBlockDBInCache(BlockNum, 0);
        if(Find)
            return Find;
        else
        {
            JINN_STAT.LoadHDB++;
            var Block = Engine.GetBlockHeaderDBInner(BlockNum, bRawMode);
            if(Block && !bRawMode)
                Engine.AddBlockDBToCache(Block, 0);
            
            return Block;
        }
    };
    
    Engine.SaveToDB = function (Block,bCheckSum)
    {
        Engine.ToDebug("SaveToDB  Block:" + Block.BlockNum);
        var MaxNum = Engine.GetMaxNumBlockDB();
        if(Block.BlockNum > MaxNum + 1)
        {
            ToLogTrace("Error SaveToDB Block.BlockNum>MaxNum+1   BlockNum=" + Block.BlockNum + "  MaxNum=" + MaxNum);
            return false;
        }
        
        if(!IsZeroArr(Block.TreeHash) && !Block.TxData)
        {
            Engine.ToLogTrace("B=" + Block.BlockNum + " SaveError Block TxData=" + Block.TxData + " " + Block.Description);
            return 0;
        }
        
        if(Block.BlockNum < MaxNum)
        {
            Engine.ClearCacheDBTree(Block.BlockNum);
        }
        
        JINN_STAT.SaveDB++;
        var Result = Engine.WriteBlockDBInner(Block, bCheckSum);
        if(Result)
        {
            Engine.AddBlockDBToCache(Block, 1);
            Engine.AddBlockToChain(Block);
        }
        
        return Result;
    };
    
    Engine.WriteBlockDBInner = function (Block,bCheckSum)
    {
        var BlockNum = Block.BlockNum;
        if(global.JINN_WARNING >= 5)
        {
            var BlockDB2 = SerializeLib.GetObjectFromBuffer(Buf, DB_BLOCK_FORMAT, DB_BLOCK_FORMATWRK);
            Engine.CalcBlockHash(BlockDB2);
            
            for(var i = 0; i < BlockDB2.TxData.length; i++)
            {
                var Item = BlockDB2.TxData[i];
                var Tx = Engine.GetTx(Item.body, Item.HASH, Item.HashPow);
                CheckTx("GetBlockDB", Tx, BlockNum);
            }
            if(!IsEqArr(BlockDB2.TreeHash, Block.TreeHash))
                Engine.ToLog("B=" + BlockNum + " SaveError Block TreeHash 1");
            var TreeHashTest = Engine.CalcTreeHash(Block.BlockNum, Block.TxData);
            if(!IsEqArr(TreeHashTest, Block.TreeHash))
                Engine.ToLog("B=" + BlockNum + " SaveError Block TreeHash 2");
        }
        
        if(BlockNum > 0)
        {
            var PrevBlock = Engine.GetBlockDB(BlockNum - 1);
            if(!PrevBlock)
                throw "SaveToDB: Error PrevBlock on Block=" + BlockNum;
            if(!Block.LinkHash)
                throw "SaveToDB: Error LinkHash";
            if(PrevBlock.BlockNum !== Block.BlockNum - 1)
                throw "SaveToDB: Error PrevBlock.BlockNum on Block=" + BlockNum;
            
            if(bCheckSum)
            {
                var SumPow = PrevBlock.SumPow + Block.Power;
                
                var PrevBlockHash = PrevBlock.Hash;
                
                if(Block.SumPow !== SumPow)
                {
                    var Str = "SaveToDB: Error Sum POW: " + Block.SumPow + "/" + SumPow + " on block=" + Block.BlockNum;
                    Engine.ToLog(Str);
                }
            }
            
            Block.PrevBlockHash = PrevBlock.Hash;
            Block.SumPow = PrevBlock.SumPow + Block.Power;
        }
        else
        {
            Block.PrevBlockHash = ZERO_ARR_32;
            Block.SumPow = 0;
        }
        if(Engine.ArrDB.length > BlockNum)
        {
            Engine.ArrDB.length = BlockNum;
        }
        var Buf = SerializeLib.GetBufferFromObject(Block, DB_BLOCK_FORMAT, DB_BLOCK_FORMATWRK);
        Engine.ArrDB[BlockNum] = Buf;
        return 1;
    };
    
    Engine.GetBlockDBInner = function (BlockNum)
    {
        var Buf = Engine.ArrDB[BlockNum];
        if(!Buf)
            return undefined;
        
        if(typeof Buf === "string")
        {
            var BlockDB = JSON.parse(Buf);
            Engine.CalcBlockHash(BlockDB);
            
            return BlockDB;
        }
        
        var BlockDB = SerializeLib.GetObjectFromBuffer(Buf, DB_BLOCK_FORMAT, DB_BLOCK_FORMATWRK);
        if(!BlockDB)
            throw "Error GetBlockDB";
        
        for(var i = 0; i < BlockDB.TxData.length; i++)
        {
            var Item = BlockDB.TxData[i];
            var Tx = Engine.GetTx(Item.body, Item.HASH, Item.HashPow);
            BlockDB.TxData[i] = Tx;
            CheckTx("GetBlockDB", Tx, BlockNum);
        }
        Engine.CalcBlockHash(BlockDB);
        
        return BlockDB;
    };
    
    Engine.GetBlockHeaderDBInner = function (BlockNum)
    {
        var Buf = Engine.ArrDB[BlockNum];
        if(!Buf)
            return undefined;
        
        if(typeof Buf === "string")
        {
            var BlockHDB = JSON.parse(Buf);
            Engine.CalcBlockHash(BlockHDB);
            
            return BlockHDB;
        }
        
        var BlockHDB = SerializeLib.GetObjectFromBuffer(Buf, DB_BLOCK_HEADER_FORMAT, DB_BLOCK_HEADER_FORMATWRK, 1);
        if(!BlockHDB)
            throw "Error GetBlockHeaderDB";
        Engine.CalcBlockHash(BlockHDB);
        
        return BlockHDB;
    };
    
    Engine.GetMaxNumBlockDB = function ()
    {
        return Engine.ArrDB.length - 1;
    };
    
    Engine.GetLastBlockDB = function ()
    {
        return Engine.GetBlockDB(Engine.GetMaxNumBlockDB());
    };
    
    Engine.ClearDataBase = function ()
    {
        
        Engine.BlockStore = {};
        Engine.Header1 = 0;
        Engine.Header2 = 0;
        Engine.Block1 = 0;
        Engine.Block2 = 0;
        
        Engine.ListTreeTx = {};
        Engine.ListTreeTicket = {};
        Engine.BAN_IP = {};
        
        Engine.InitDB();
        Engine.ClearChainDB();
        Engine.InitCacheDBTree();
        Engine.InitChainTree();
        Engine.InitBlockList();
        
        Engine.WriteGenesisDB();
        for(var i = 0; i < Engine.LevelArr.length; i++)
        {
            var Child = Engine.LevelArr[i];
            if(Child)
            {
                Child.CahcheVersion++;
                Child.CacheAll = {};
                Child.CacheBlockNumAll = {};
            }
        }
    };
    Engine.InitDB();
}

function GetCopyObj(Obj)
{
    var Obj2 = {};
    for(var key in Obj)
        Obj2[key] = Obj[key];
    return Obj2;
}
