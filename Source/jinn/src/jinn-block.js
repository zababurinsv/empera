/*
 * @project: JINN
 * @version: 1.0
 * @license: MIT (not for evil)
 * @copyright: Yuriy Ivanov (Vtools) 2019-2020 [progr76@gmail.com]
 * Telegram:  https://t.me/progr76
*/


/**
 * Working with blocks, creating a new block, determining the Genesis of the block
 *
 * The formula for calculating hashes:
 *
 *   LinkSumHash | -----------> DataHash | ---------------->    Hash
 *        +      |                  +    |
 *     TreeHash  |              MinerHash|
 *
 * i.e.:
 * LinkSumHash + TreeHash  = DataHash
 * DataHash + MinerHash    = Hash
 **/


'use strict';
global.JINN_MODULES.push({InitClass:InitClass, DoNode:DoNode, Name:"Block"});

function DoNode(Engine)
{
    Engine.TickNum++;
}

//Engine context

function InitClass(Engine)
{
    Engine.TickNum = 0;
    Engine.MaxLiderTaskArr = [];
    
    Engine.DoBlockMining = function (CurBlockNum)
    {
        
        var Count = 0;
        while(1)
        {
            var Block;
            Count++;
            var LastBlockNum = Engine.GetMaxNumBlockDB();
            if(LastBlockNum >= 0)
            {
                if(!Engine.GetBlockHeaderDB(LastBlockNum))
                {
                    ToLog("--------------1 Error DB in Block=" + LastBlockNum);
                    return 0;
                }
                if(!Engine.GetBlockHeaderDB(LastBlockNum - 1))
                {
                    ToLog("--------------2 Error DB in Block=" + (LastBlockNum - 1));
                    return 0;
                }
            }
            
            if(LastBlockNum >= CurBlockNum)
            {
                return LastBlockNum;
            }
            
            var BlockNum = LastBlockNum + 1;
            
            if(BlockNum < JINN_CONST.BLOCK_GENESIS_COUNT)
            {
                Engine.WriteGenesisDB();
                return;
            }
            var TxArr = Engine.GetTopTxArrayFromTree(Engine.ListTreeTx[BlockNum]);
            Block = Engine.GetNewBlock(BlockNum, TxArr);
            if(!Block)
            {
                Engine.ToLog("Cannt create block=" + BlockNum);
                return 0;
            }
            
            Engine.AddBlockToChain(Block);
            if(Count >= JINN_CONST.DELTA_BLOCKS_FOR_CREATE)
            {
                if(JINN_CONST.LINK_HASH_DELTA === 1)
                    return 0;
                
                var DeltaNum = CurBlockNum - Block.BlockNum;
                if(DeltaNum > JINN_CONST.DELTA_BLOCKS_FOR_LOAD_ONLY)
                {
                    Engine.ToLog5("Old block  BlockNum=" + BlockNum);
                    Engine.CreateBlockInMemory(CurBlockNum);
                }
                return 0;
            }
        }
    };
    
    Engine.AddBlockToChain = function (Block)
    {
        var Find = Engine.DB.FindBlockByHash(Block.BlockNum, Block.SumHash);
        if(!Find)
        {
            Engine.DB.WriteBlock(Block);
        }
        Engine.FindSaveMaxBlock(Block.BlockNum);
        
        var CurBlockNum = JINN_EXTERN.GetCurrentBlockNumByTime();
        if(Block.BlockNum < CurBlockNum - JINN_CONST.STEP_LAST - JINN_CONST.MAX_DELTA_PROCESSING)
            return;
        if(Block.BlockNum <= CurBlockNum - JINN_CONST.STEP_MAXHASH)
            Engine.AddHashToMaxLider(Block, Block.BlockNum, 1);
        else
            Engine.MaxLiderTaskArr.push(Block);
    };
    Engine.DoMaxLiderTaskArr = function (BlockNum)
    {
        for(var i = 0; i < Engine.MaxLiderTaskArr.length; i++)
        {
            var Block = Engine.MaxLiderTaskArr[i];
            if(Block.BlockNum <= BlockNum)
            {
                Engine.AddHashToMaxLider(Block, Block.BlockNum, 1);
                Engine.MaxLiderTaskArr.splice(i, 1);
                i--;
            }
        }
    };
    
    Engine.FindSaveMaxBlock = function (BlockNum)
    {
        var Block = Engine.GetMaxPowerBlockFromChain(BlockNum);
        if(!Block)
        {
            return 0;
        }
        
        if(!Engine.SaveToDB(Block, 0, 1))
        {
            return 0;
        }
    };
    
    Engine.CreateBlockInMemory = function (BlockNum)
    {
        
        if(Engine.GetBlockHeaderDB(BlockNum))
            return;
        
        var TxArr = Engine.GetTopTxArrayFromTree(Engine.ListTreeTx[BlockNum]);
        var Block = Engine.GetNewBlock(BlockNum, TxArr, 1);
        if(!Block)
        {
            return;
        }
        
        Engine.DB.WriteBlock(Block);
    };
    
    // Modeling...
    
    Engine.GenesisArr = [];
    Engine.GetGenesisBlock = function (Num)
    {
        if(Engine.GenesisArr[Num])
            return Engine.GenesisArr[Num];
        
        if(Num >= JINN_CONST.BLOCK_GENESIS_COUNT)
        {
            ToLogTrace("Error GenesisBlock Num = " + Num);
            return undefined;
        }
        
        var PrevBlock;
        if(!Num)
            PrevBlock = {Hash:ZERO_ARR_32, SumPow:0, SumHash:ZERO_ARR_32, };
        else
            PrevBlock = Engine.GetGenesisBlock(Num - 1);
        
        var Block = {};
        Block.Genesis = 1;
        Block.BlockNum = Num;
        Block.TxData = [];
        Block.LinkSumHash = ZERO_ARR_32;
        Block.TreeHash = ZERO_ARR_32;
        Block.MinerHash = ZERO_ARR_32;
        Block.PrevSumHash = PrevBlock.SumHash;
        Block.PrevSumPow = PrevBlock.SumPow;
        Engine.CalcBlockData(Block);
        
        Engine.GenesisArr[Num] = Block;
        return Block;
    };
    
    Engine.GetNewBlock = function (BlockNum,TxArr,bInMemory)
    {
        if(BlockNum - JINN_CONST.LINK_HASH_DELTA > Engine.GetMaxNumBlockDB())
            return undefined;
        
        var Block = {};
        Block.BlockNum = BlockNum;
        
        Engine.SortBlock({TxData:TxArr});
        Block.TxData = TxArr;
        Block.TreeHash = Engine.CalcTreeHash(Block.BlockNum, Block.TxData);
        
        Block.MinerHash = [Engine.ID % 256, Engine.ID >>> 8];
        for(var i = 2; i < 32; i++)
            Block.MinerHash[i] = i;
        
        if(random(100) < 50)
            Block.MinerHash = ZERO_ARR_32;
        Engine.SetBlockDataFromDB(Block);
        Engine.CalcBlockData(Block);
        
        return Block;
    };
    
    // Serylizing...
    
    Engine.CalcBlockHeader = function (Block)
    {
        if(!Block)
            return undefined;
        
        if(Block.BlockNum >= JINN_CONST.BLOCK_GENESIS_COUNT && IsZeroArr(Block.PrevSumHash))
            ToLog("ZeroArr PrevSumHash on BlockNum=" + Block.BlockNum);
        var Data = {BlockNum:Block.BlockNum, LinkSumHash:Block.PrevSumHash, TreeHash:Block.TreeHash, MinerHash:Block.MinerHash, PrevSumPow:Block.PrevSumPow,
            PrevSumHash:Block.PrevSumHash, Size:4 * 32 + 2 * 6, };
        
        return Data;
    };
    
    Engine.CalcBlockBody = function (Block)
    {
        if(!IsZeroArr(Block.TreeHash) && (!Block.TxData || Block.TxData.length === 0))
            ToLogTrace("CalcBlockBody : Error block tx data TreeHash=" + Block.TreeHash + " on block: " + Block.BlockNum);
        
        var Data = {BlockNum:Block.BlockNum, TreeHash:Block.TreeHash, PrevSumHash:Block.PrevSumHash, TxData:Block.TxData, };
        
        var Size = 10;
        for(var i = 0; i < Data.TxData.length; i++)
        {
            Size += Data.TxData[i].body.length;
        }
        Data.Size = Size;
        
        return Data;
    };
    
    Engine.CheckHashExistArr = function (TxArr)
    {
        for(var n = 0; TxArr && n < TxArr.length; n++)
            Engine.CheckHashExist(TxArr[n]);
    };
    
    Engine.CalcTreeHash = function (BlockNum,TxArr)
    {
        if(!TxArr || !TxArr.length)
            return ZERO_ARR_32;
        
        var Buf = [];
        for(var n = 0; n < TxArr.length; n++)
        {
            var Tx = TxArr[n];
            CheckTx("=CalcTreeHash=", Tx, BlockNum, 1);
            
            var Hash = Tx.HASH;
            for(var h = 0; h < Hash.length; h++)
                Buf.push(Hash[h]);
        }
        if(!Buf.length)
            throw "Error Buf CalcTreeHash";
        
        var arr = sha3(Buf, 4);
        return arr;
    };
    
    Engine.SortBlock = function (Block)
    {
        if(!Block || !Block.TxData)
            return;
        for(var i = 0; i < Block.TxData.length; i++)
            Engine.CheckHashExist(Block.TxData[i]);
        Block.TxData.sort(function (a,b)
        {
            if(b.TimePow !== a.TimePow)
                return b.TimePow - a.TimePow;
            return CompareArr(a.HashPow, b.HashPow);
        });
    };
    
    Engine.SetBlockDataFromDB = function (Block)
    {
        Block.PrevSumPow = Engine.GetPrevSumPowFromDBNum(Block.BlockNum);
        Block.PrevSumHash = Engine.GetPrevSumHashFromDBNum(Block.BlockNum);
        Block.LinkSumHash = Engine.GetLinkDataFromDBNum(Block.BlockNum);
    };
    Engine.GetPrevSumPowFromDBNum = function (BlockNum)
    {
        var PrevNum = BlockNum - 1;
        if(PrevNum < 0)
            return 0;
        else
        {
            var PrevBlock = Engine.GetBlockHeaderDB(PrevNum, 1);
            if(PrevBlock)
                return PrevBlock.SumPow;
            else
                return 0;
        }
    };
    
    Engine.GetPrevSumHashFromDBNum = function (BlockNum)
    {
        var PrevNum = BlockNum - 1;
        if(PrevNum <= 0)
            return ZERO_ARR_32;
        else
        {
            var PrevBlock = Engine.GetBlockHeaderDB(PrevNum, 1);
            if(PrevBlock)
                return PrevBlock.SumHash;
            else
                return ZERO_ARR_32;
        }
    };
    Engine.GetLinkDataFromDBNum = function (BlockNum)
    {
        if(BlockNum < JINN_CONST.BLOCK_GENESIS_COUNT)
        {
            return ZERO_ARR_32;
        }
        else
        {
            var PrevNum = BlockNum - JINN_CONST.LINK_HASH_DELTA;
            var PrevBlock = Engine.GetBlockHeaderDB(PrevNum, 1);
            if(PrevBlock)
                return PrevBlock.SumHash;
            else
                return ZERO_ARR_32;
        }
    };
    
    Engine.GetLinkDataFromDB = function (Block)
    {
        return Engine.GetLinkDataFromDBNum(Block.BlockNum);
    };
    
    Engine.CalcBlockData = function (Block)
    {
        Engine.CalcBlockHash(Block);
        Engine.CalcSumHash(Block);
    };
    
    Engine.CalcBlockHash = function (Block)
    {
        if(!Block.PrevSumHash)
            ToLogTrace("Error No PrevSumHash on Block=" + Block.BlockNum);
        
        if(Block.BlockNum < JINN_CONST.BLOCK_GENESIS_COUNT)
        {
            Block.LinkSumHash = ZERO_ARR_32;
        }
        else
        {
            Block.LinkSumHash = Block.PrevSumHash;
        }
        
        if(Block.PrevSumPow === undefined)
            ToLogTrace("Error No Block.PrevSumPow on Block=" + Block.BlockNum);
        
        Block.DataHash = sha3(Block.LinkSumHash.concat(Block.TreeHash), 5);
        
        if(Block.BlockNum < JINN_CONST.BLOCK_GENESIS_COUNT)
        {
            Block.Hash = ZERO_ARR_32.slice();
            Block.Hash[0] = 1 + Block.BlockNum;
            Block.Hash[31] = Block.Hash[0];
        }
        else
        {
            Block.Hash = sha3(Block.DataHash.concat(Block.MinerHash).concat(GetArrFromValue(Block.BlockNum)), 6);
        }
        
        Block.Power = GetPowPower(Block.Hash);
        Block.SumPow = Block.PrevSumPow + Block.Power;
    };
    
    Engine.CalcSumHash = function (Block)
    {
        if(Block.BlockNum === 0)
            Block.SumHash = ZERO_ARR_32;
        else
        {
            if(!Block.PrevSumHash)
                ToLogTrace("Error No PrevSumHash on Block=" + Block.BlockNum);
            
            if(Block.SumPow === undefined)
                ToLogTrace("Error No SumPow on Block=" + Block.BlockNum);
            
            var arr_sum_pow = [];
            WriteUintToArr(arr_sum_pow, Block.SumPow);
            Block.SumHash = sha3(Block.PrevSumHash.concat(Block.Hash).concat(arr_sum_pow), 7);
        }
    };
    
    Engine.FillTicket = function (Tx)
    {
        var FullHashTicket = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
        for(var i = 0; i < JINN_CONST.TX_TICKET_HASH_LENGTH; i++)
            FullHashTicket[i] = Tx.HashTicket[i];
        WriteUintToArrOnPos(FullHashTicket, Tx.num, JINN_CONST.TX_TICKET_HASH_LENGTH);
        
        Tx.HashPow = sha3(FullHashTicket, 8);
        Tx.TimePow = GetPowPower(Tx.HashPow);
    };
    
    Engine.CheckHashExist = function (Tx)
    {
        if(!Tx.KEY)
        {
            var Tx2 = Engine.GetTx(Tx.body);
            CopyObjKeys(Tx, Tx2);
        }
    };
    
    Engine.GetTx = function (body,HASH,HashPow)
    {
        
        var Tx = {};
        Tx.IsTx = 1;
        Tx.num = ReadUintFromArr(body, body.length - 12);
        if(HASH)
            Tx.HASH = HASH;
        else
            Tx.HASH = sha3(body, 9);
        
        Tx.HashTicket = Tx.HASH.slice(0, JINN_CONST.TX_TICKET_HASH_LENGTH);
        Tx.KEY = GetHexFromArr(Tx.HashTicket);
        Tx.body = body;
        if(HashPow)
        {
            Tx.HashPow = HashPow;
            Tx.TimePow = GetPowPower(HashPow);
        }
        else
        {
            Engine.FillTicket(Tx);
        }
        
        return Tx;
    };
}

function NeedLoadBodyFromNet(Block)
{
    if(IsZeroArr(Block.TreeHash))
        return 0;
    
    if(Block.TxPosition)
        return 0;
    
    if(Block.TxData)
        return 0;
    
    return 1;
}

function NeedLoadBodyFromDB(Block)
{
    if(Block && !IsZeroArr(Block.TreeHash) && !Block.TxData && Block.TxPosition)
        return 1;
    else
        return 0;
}

global.NeedLoadBodyFromNet = NeedLoadBodyFromNet;
global.NeedLoadBodyFromDB = NeedLoadBodyFromDB;
