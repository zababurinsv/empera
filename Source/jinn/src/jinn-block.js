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
global.JINN_MODULES.push({InitClass:InitClass});

//Engine context

function InitClass(Engine)
{
    
    Engine.DoBlockMining = function (CurBlockNum)
    {
        if(!Engine.GenesisArr)
            Engine.CreateGenesisArray();
        
        var Count = 0;
        while(1)
        {
            var Block;
            Count++;
            var LastBlockNum = Engine.GetMaxNumBlockDB();
            if(LastBlockNum >= CurBlockNum)
                break;
            
            var BlockNum = LastBlockNum + 1;
            if(BlockNum < JINN_CONST.BLOCK_GENESIS_COUNT)
                Block = Engine.GenesisArr[BlockNum];
            else
            {
                var BlockDB = Engine.GetLastBlockDB();
                if(!BlockDB)
                    throw "Error DoBlockMining:GetLastBlockDB";
                var TxArr = Engine.GetTopTxArrayFromTree(Engine.ListTreeTx[BlockNum]);
                Block = Engine.GetNewBlock(BlockNum, TxArr, BlockDB);
                if(!Block)
                {
                    Engine.ToLog("Cannt create block=" + BlockNum);
                    return ;
                }
            }
            
            var Result = Engine.SaveToDB(Block, 0, 1);
            if(!Result)
                break;
            
            Engine.AddHashToMaxLider(Block, Block.BlockNum, 1);
            if(Count >= JINN_CONST.DELTA_BLOCKS_FOR_CREATE)
            {
                var DeltaNum = CurBlockNum - Block.BlockNum;
                if(DeltaNum > JINN_CONST.DELTA_BLOCKS_FOR_LOAD_ONLY)
                {
                    Engine.ToLog5("Old block  BlockNum=" + BlockNum);
                    Engine.CreateBlockInMemory(CurBlockNum);
                    break;
                }
            }
        }
    };
    Engine.CreateBlockInMemory = function (BlockNum)
    {
        return ;
        if(Engine.GetBlockHeaderDB(BlockNum))
            return ;
        
        var TxArr = Engine.GetTopTxArrayFromTree(Engine.ListTreeTx[BlockNum]);
        var Block = Engine.GetNewBlock(BlockNum, TxArr, {Hash:ZERO_ARR_32}, 1);
        if(!Block)
        {
            Engine.ToLog("Cannt create block=" + BlockNum);
            return ;
        }
        
        var ArrBlock = Engine.GetChainArrByNum(BlockNum);
        if(ArrBlock.length === 0)
        {
            Engine.ToDebug("Add new mem block: " + BlockNum);
            Block.Comment = "Mem block";
            
            Engine.AddBlockToChain(Block);
        }
    };
    
    Engine.GetGenesisBlock = function (Num)
    {
        if(Num >= JINN_CONST.BLOCK_GENESIS_COUNT)
        {
            ToLogTrace("Error GenesisBlock Num = " + Num);
            return undefined;
        }
        
        var Block = Engine.GenesisArr[Num];
        if(Block)
            return Block;
        
        var PrevBlock;
        if(!Num)
            PrevBlock = {Hash:ZERO_ARR_32, SumPow:0, SumHash:ZERO_ARR_32, };
        else
            PrevBlock = Engine.GenesisArr[Num - 1];
        
        Block = {};
        Block.Genesis = 1;
        Block.BlockNum = Num;
        Block.TxData = [];
        Block.LinkSumHash = ZERO_ARR_32;
        Block.TreeHash = ZERO_ARR_32;
        Block.MinerHash = ZERO_ARR_32;
        Block.PrevSumHash = PrevBlock.SumHash;
        Engine.CalcBlockHash(Block);
        
        Block.SumPow = Block.Power + PrevBlock.SumPow;
        
        Block.Description = "Genesis";
        
        return Block;
    };
    
    Engine.GetNewBlock = function (BlockNum,TxArr,PrevBlock,bInMemory)
    {
        var Block = {};
        Block.BlockNum = BlockNum;
        
        Block.TxData = TxArr;
        Block.TreeHash = Engine.CalcTreeHash(Block.BlockNum, Block.TxData);
        
        Block.MinerHash = [Engine.ID % 256, Engine.ID >>> 8];
        for(var i = 2; i < 32; i++)
            Block.MinerHash[i] = i;
        
        Engine.SetBlockDataFromDB(Block);
        Engine.CalcBlockHash(Block);
        
        return Block;
    };
    
    Engine.GetBlockHeader = function (Block)
    {
        if(Block.BlockNum >= JINN_CONST.BLOCK_GENESIS_COUNT && IsZeroArr(Block.LinkSumHash))
            ToLog("ZeroArr LinkSumHash on BlockNum=" + Block.BlockNum);
        if(Block.BlockNum > 0 && IsZeroArr(Block.SumHash))
            ToLog("ZeroArr SumHash on BlockNum=" + Block.BlockNum);
        
        var Data = {BlockNum:Block.BlockNum, LinkSumHash:Block.LinkSumHash, TreeHash:Block.TreeHash, MinerHash:Block.MinerHash, PrevSumHash:Block.PrevSumHash,
            Hash:Block.Hash, Size:4 * 32 + 6, };
        
        return Data;
    };
    
    Engine.GetBlockBody = function (Block)
    {
        if(!IsZeroArr(Block.TreeHash) && (!Block.TxData || Block.TxData.length === 0))
            ToLogTrace("GetBlockBody : Error block tx data TreeHash=" + Block.TreeHash + " on block: " + Block.BlockNum);
        
        var Data = {BlockNum:Block.BlockNum, TreeHash:Block.TreeHash, PrevSumHash:Block.PrevSumHash, TxData:Block.TxData, };
        
        var Size = 10;
        for(var i = 0; i < Data.TxData.length; i++)
        {
            Size += Data.TxData[i].body.length;
        }
        Data.Size = Size;
        
        return Data;
    };
    
    Engine.CreateGenesisArray = function ()
    {
        Engine.GenesisArr = [];
        for(var Num = 0; Num < JINN_CONST.BLOCK_GENESIS_COUNT; Num++)
        {
            var Block = Engine.GetGenesisBlock(Num);
            Engine.GenesisArr[Num] = Block;
        }
    };
    
    Engine.CalcTreeHash = function (BlockNum,TxArr)
    {
        if(!TxArr || !TxArr.length)
            return ZERO_ARR_32;
        
        var Buf = [];
        for(var n = 0; n < TxArr.length; n++)
        {
            var Tx = TxArr[n];
            CheckTx("CalcTreeHash", Tx, BlockNum, 1);
            
            var Hash = Tx.HASH;
            for(var h = 0; h < Hash.length; h++)
                Buf.push(Hash[h]);
        }
        if(!Buf.length)
            throw "Error Buf CalcTreeHash";
        
        var arr = sha3(Buf);
        return arr;
    };
    
    Engine.SetBlockDataFromDB = function (Block)
    {
        var PrevNum, PrevBlock;
        PrevNum = Block.BlockNum - 1;
        if(PrevNum < 0)
            Block.PrevSumHash = ZERO_ARR_32;
        else
        {
            PrevBlock = Engine.GetBlockHeaderDB(PrevNum, 1, 1);
            if(PrevBlock)
                Block.PrevSumHash = PrevBlock.SumHash;
            else
                Block.PrevSumHash = ZERO_ARR_32;
        }
        
        Block.LinkSumHash = Engine.GetLinkDataFromDB(Block);
    };
    
    Engine.GetLinkDataFromDB = function (Block)
    {
        var PrevNum, PrevBlock;
        if(Block.BlockNum < JINN_CONST.BLOCK_GENESIS_COUNT)
        {
            return ZERO_ARR_32;
        }
        else
        {
            PrevNum = Block.BlockNum - JINN_CONST.LINK_HASH_DELTA;
            PrevBlock = Engine.GetBlockHeaderDB(PrevNum, 1, 1);
            if(PrevBlock)
                return PrevBlock.SumHash;
            else
                return ZERO_ARR_32;
        }
    };
    
    Engine.CalcBlockHash = function (Block,bNoSumHash)
    {
        if(!Block.LinkSumHash)
            ToLogTrace("Error No Block.LinkSumHash on Block=" + Block.BlockNum);
        
        Block.DataHash = sha3(Block.LinkSumHash.concat(Block.TreeHash));
        Block.Hash = sha3(Block.DataHash.concat(Block.MinerHash));
        Block.Power = Engine.GetPowPower(Block.Hash);
        
        if(bNoSumHash)
            return ;
        if(Block.BlockNum === 0)
            Block.SumHash = ZERO_ARR_32;
        else
        {
            if(!Block.PrevSumHash)
                ToLogTrace("Error No Block.PrevSumHash on Block=" + Block.BlockNum);
            Block.SumHash = sha3(Block.PrevSumHash.concat(Block.Hash));
        }
    };
    
    Engine.GetPowPower = function (arrhash)
    {
        var SumBit = 0;
        for(var i = 0; i < arrhash.length; i++)
        {
            var byte = arrhash[i];
            for(var b = 7; b >= 0; b--)
            {
                if((byte >> b) & 1)
                {
                    
                    return SumBit;
                }
                else
                {
                    SumBit++;
                }
            }
        }
        return SumBit;
    };
}

var glBlockTest = {};
function CheckBlockGlobal(Engine,Block)
{
    if(!Engine.Err && Block.BlockNum > JINN_CONST.START_CHECK_BLOCKNUM)
    {
        var Block0 = glBlockTest[Block.BlockNum];
        if(!Block0)
        {
            Block0 = Block;
            glBlockTest[Block.BlockNum] = Block0;
        }
        if(!IsEqArr(Block.TreeHash, Block0.TreeHash))
        {
            Engine.ToLog("Error CheckBlockGlobal = " + Block.BlockNum);
        }
    }
}
global.CheckBlockGlobal = CheckBlockGlobal;
