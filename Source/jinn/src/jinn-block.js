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
 *  LinkHash | -----------> DataHash | ---------------->    Hash
 *     +     |                  +    |
 *  TreeHash |              MinerHash|
 *
 * i.e.:
 * LinkHash + TreeHash              = DataHash
 * DataHash + MinerHash             = Hash
 **/
'use strict';
global.JINN_MODULES.push({InitClass:InitClass});
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
            Engine.SetChainArr(Block);
        }
    };
    Engine.GetGenesisBlock = function (Num)
    {
        if(Num >= JINN_CONST.BLOCK_GENESIS_COUNT)
            throw "Error GenesisBlock Num = " + Num;
        var Block = Engine.GenesisArr[Num];
        if(Block)
            return Block;
        var PrevBlock;
        if(!Num)
            PrevBlock = {Hash:ZERO_ARR_32, SumPow:0};
        else
            PrevBlock = Engine.GenesisArr[Num - 1];
        Block = {};
        Block.Genesis = 1;
        Block.BlockNum = Num;
        Block.TxData = [];
        Block.TreeHash = ZERO_ARR_32;
        Block.BlockNum = Num;
        Block.LinkHash = Engine.GetLinkHashDB(Block);
        Block.MinerHash = ZERO_ARR_32;
        Engine.CalcBlockHash(Block);
        Block.PrevBlockHash = PrevBlock.Hash;
        Block.SumPow = Block.Power + PrevBlock.SumPow;
        Block.Description = "Genesis";
        return Block;
    };
    Engine.GetLinkHashDB = function (Block)
    {
        if(Block.BlockNum < 1)
            return ZERO_ARR_32;
        var PrevBlock = Engine.GetBlockHeaderDB(Block.BlockNum - 1);
        if(PrevBlock)
            return PrevBlock.Hash;
        else
            return ZERO_ARR_32;
    };
    Engine.GetNewBlock = function (BlockNum,TxArr,PrevBlock,bInMemory)
    {
        var Block = {};
        Block.BlockNum = BlockNum;
        Block.LinkHash = Engine.GetLinkHashDB(Block);
        Block.TxData = TxArr;
        Block.TreeHash = Engine.CalcTreeHash(Block.BlockNum, Block.TxData);
        Block.MinerHash = [Engine.ID % 256, Engine.ID >>> 8];
        for(var i = 2; i < 32; i++)
            Block.MinerHash[i] = i;
        Engine.CalcBlockHash(Block);
        Block.PrevBlockHash = PrevBlock.Hash;
        if(!bInMemory)
        {
        }
        return Block;
    };
    Engine.GetBlockHeader = function (Block)
    {
        var Data = {BlockNum:Block.BlockNum, LinkHash:Block.LinkHash, TreeHash:Block.TreeHash, MinerHash:Block.MinerHash, DataHash:Block.DataHash,
            Hash:Block.Hash, PrevBlockHash:Block.PrevBlockHash, Size:3 * 32 + 10, };
        return Data;
    };
    Engine.GetBlockBody = function (Block)
    {
        var Data = {BlockNum:Block.BlockNum, TreeHash:Block.TreeHash, PrevBlockHash:Block.PrevBlockHash, TxData:Block.TxData, };
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
    Engine.CalcBlockHash = function (Block)
    {
        Block.DataHash = sha3(Block.LinkHash.concat(Block.TreeHash));
        Block.Hash = sha3(Block.DataHash.concat(Block.MinerHash));
        Block.Power = Engine.GetPowPower(Block.Hash);
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
