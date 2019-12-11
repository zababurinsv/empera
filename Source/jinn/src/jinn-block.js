/*
 * @project: TERA
 * @version: Development (beta)
 * @license: MIT (not for evil)
 * @copyright: Yuriy Ivanov (Vtools) 2017-2019 [progr76@gmail.com]
 * Web: https://terafoundation.org
 * Twitter: https://twitter.com/terafoundation
 * Telegram:  https://t.me/terafoundation
*/

global.JINN_MODULES.push({InitClass:InitClass, InitAfter:InitAfter});
function InitClass(Engine)
{
    Engine.DoBlockMining = function (CurBlockNum)
    {
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
            Engine.SaveToDB(Block);
            Engine.AddHashToMaxLider(Block, Block.BlockNum, 1);
            if(Count >= 2)
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
        var ArrBlock = Engine.GetLoadingArrayByNum(BlockNum);
        if(ArrBlock.length === 0)
        {
            Engine.ToDebug("Add new mem block: " + BlockNum);
            ArrBlock.push(Block);
        }
    };
    Engine.GetGenesisBlock = function (Num)
    {
        var PrevBlock;
        if(!Num)
            PrevBlock = {Hash:ZERO_ARR_32, SumPow:0};
        else
            PrevBlock = Engine.GenesisArr[Num - 1];
        var Block = {};
        Block.Genesis = 1;
        Block.BlockNum = Num;
        Block.TxData = [];
        Block.TreeHash = ZERO_ARR_32;
        Block.PrevHash = PrevBlock.Hash;
        Block.AddrHash = ZERO_ARR_32;
        Engine.CalcBlockHash(Block);
        Block.SumPow = Block.Power + PrevBlock.SumPow;
        if(Num > 0)
            Block.PrevBlock = PrevBlock;
        Block.Description = "Genesis";
        return Block;
    };
    Engine.GetNewBlock = function (BlockNum,TxArr,PrevBlock,bInMemory)
    {
        var Block = {};
        Block.BlockNum = BlockNum;
        Block.PrevHash = PrevBlock.Hash;
        Block.TxData = TxArr;
        Block.TreeHash = Engine.CalcTreeHash(Block.BlockNum, Block.TxData);
        Block.AddrHash = [Engine.ID % 256, Engine.ID >>> 8];
        for(var i = 2; i < 32; i++)
            Block.AddrHash[i] = i;
        Engine.CalcBlockHash(Block);
        if(!bInMemory)
        {
            Block.SumPow = Block.Power + PrevBlock.SumPow;
            Block.PrevBlock = PrevBlock;
        }
        return Block;
    };
    Engine.GetBlockHeader = function (Block)
    {
        var Data = {BlockNum:Block.BlockNum, PrevHash:Block.PrevHash, TreeHash:Block.TreeHash, AddrHash:Block.AddrHash, SeqHash:Block.SeqHash,
            Hash:Block.Hash, Size:3 * 32 + 10, };
        return Data;
    };
    Engine.GetBlockBody = function (Block)
    {
        var Data = {BlockNum:Block.BlockNum, TreeHash:Block.TreeHash, TxData:Block.TxData, PrevHash:Block.PrevHash, };
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
    Engine.CalcTreeHash = function (BlockNum,TxArr0)
    {
        if(!TxArr0 || !TxArr0.length)
            return ZERO_ARR_32;
        var TxArr = TxArr0;
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
        Block.SeqHash = sha3(Block.PrevHash.concat(Block.TreeHash));
        Block.Hash = sha3(Block.SeqHash.concat(Block.AddrHash));
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
function InitAfter(Engine)
{
    Engine.CreateGenesisArray();
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
