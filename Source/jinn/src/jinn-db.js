/*
 * @project: TERA
 * @version: Development (beta)
 * @license: MIT (not for evil)
 * @copyright: Yuriy Ivanov (Vtools) 2017-2019 [progr76@gmail.com]
 * Web: https://terafoundation.org
 * Twitter: https://twitter.com/terafoundation
 * Telegram:  https://t.me/terafoundation
*/

global.JINN_MODULES.push({Init:Init});
function Init(Engine)
{
    Engine.ArrDB = [];
    Engine.SaveToDB = function (Block,bCheckSum)
    {
        Engine.ToDebug("SaveToDB  Block:" + Block.BlockNum + " POW=" + Block.SumPow);
        var BlockNum = Block.BlockNum;
        if(Engine.ArrDB.length > BlockNum)
        {
            Engine.ArrDB.length = BlockNum;
        }
        var BlockDB = {};
        CopyObjKeys(BlockDB, Block);
        delete BlockDB.PrevBlock;
        delete BlockDB.Power;
        delete BlockDB.SeqHash;
        delete BlockDB.Power;
        delete BlockDB.Description;
        delete BlockDB.TxData;
        BlockDB.SaveTxArr = [];
        for(var i = 0; Block.TxData && i < Block.TxData.length; i++)
        {
            var Tx = Block.TxData[i];
            CheckTx("SaveToDB", Tx, Block.BlockNum);
            if(!Tx.body.length)
                throw "Save Error body TX on Block=" + Block.BlockNum;
            BlockDB.SaveTxArr.push(Tx);
        }
        Engine.ArrDB[BlockNum] = BlockDB;
        if(!JINN_WARNING)
            return 1;
        if(global.JINN_WARNING >= 5)
        {
            var TreeHashTest = Engine.CalcTreeHash(Block.BlockNum, Block.TxData);
            if(!IsEqArr(TreeHashTest, Block.TreeHash))
                Engine.ToLog("B=" + Block.BlockNum + " SaveError Block TreeHash: " + TreeHashTest + "/" + Block.TreeHash + " Block=" + JSON.stringify(Block));
        }
        if(BlockNum > 0)
        {
            var PrevBlock = Engine.ArrDB[BlockNum - 1];
            if(!PrevBlock)
                throw "SaveToDB: Error PrevBlock on Block=" + BlockNum;
            if(!PrevBlock.SumHash)
                throw "SaveToDB: Error PrevBlock.SumHash on Block=" + BlockNum;
            if(PrevBlock.SumPow === undefined)
                throw "SaveToDB: Error PrevBlock.SumPow on Block=" + BlockNum;
            if(!IsEqArr(PrevBlock.Hash, Block.PrevHash))
                throw "SaveToDB: Error PrevHash";
            if(PrevBlock.BlockNum !== Block.BlockNum - 1)
                throw "SaveToDB: Error PrevBlock.BlockNum on Block=" + BlockNum;
            BlockDB.SumHash = sha3(PrevBlock.SumHash.concat(BlockDB.Hash));
            BlockDB.SumPow = PrevBlock.SumPow + Block.Power;
        }
        else
        {
            BlockDB.SumHash = ZERO_ARR_32;
            BlockDB.SumPow = Block.Power;
        }
        if(bCheckSum)
        {
            if(BlockDB.SumPow !== Block.SumPow)
            {
                throw "SaveToDB: Error Sum POW: " + BlockDB.SumPow + "/" + Block.SumPow + " on block=" + Block.BlockNum;
                return 0;
            }
        }
        return 1;
    };
    Engine.GetBlockDB = function (BlockNum)
    {
        var BlockDB = Engine.ArrDB[BlockNum];
        if(!BlockDB)
            return undefined;
        var Block = {};
        CopyObjKeys(Block, BlockDB);
        if(BlockNum >= 1)
        {
            Block.PrevBlock = Engine.ArrDB[BlockNum - 1];
            Block.Power = Engine.GetPowPower(Block.Hash);
            Block.SumPow = Block.Power + Block.PrevBlock.SumPow;
        }
        Block.TxData = [];
        delete Block.SaveTxArr;
        for(var i = 0; BlockDB.SaveTxArr && i < BlockDB.SaveTxArr.length; i++)
        {
            var Tx0 = BlockDB.SaveTxArr[i];
            if(!Tx0.body.length || !Tx0.HASH.length)
                throw "Error body TX on Block=" + BlockDB.BlockNum;
            var Tx = Tx0;
            Block.TxData.push(Tx);
            CheckTx("GetBlockDB", Tx, BlockNum);
        }
        Engine.CalcBlockHash(Block);
        if(!JINN_WARNING)
            return Block;
        if(!IsEqArr(Block.Hash, BlockDB.Hash))
            throw "B=" + Block.BlockNum + " LoadError Block Hash";
        if(global.JINN_WARNING >= 5)
        {
            var TreeHashTest = Engine.CalcTreeHash(Block.BlockNum, Block.TxData);
            if(!IsEqArr(TreeHashTest, Block.TreeHash))
                Engine.ToLog("B=" + Block.BlockNum + " LoadError Block TreeHash: " + TreeHashTest + "/" + Block.TreeHash + " Block=" + JSON.stringify(Block));
        }
        return Block;
    };
    Engine.SaveChainToDB = function (SeedBlock,HeadBlock)
    {
        var Arr = [];
        var CurBlock = SeedBlock;
        var BlockDB = Engine.GetBlockDB(SeedBlock.BlockNum);
        if(BlockDB)
        {
            if(BlockDB.SumPow >= SeedBlock.SumPow || !SeedBlock.SumPow)
                throw "SaveChainToDB: Error SumPow = " + SeedBlock.SumPow;
        }
        while(CurBlock)
        {
            var BlockDB3 = Engine.ArrDB[CurBlock.BlockNum];
            if(BlockDB3 && IsEqArr(BlockDB3.Hash, CurBlock.Hash))
                break;
            Arr.unshift(CurBlock);
            if(CurBlock === HeadBlock)
                break;
            CurBlock = CurBlock.PrevBlock;
        }
        for(var b = 0; b < Arr.length; b++)
        {
            var CurBlock2 = Arr[b];
            Engine.SaveToDB(CurBlock2, 1);
        }
    };
    Engine.GetMaxNumBlockDB = function ()
    {
        return Engine.ArrDB.length - 1;
    };
    Engine.GetLastBlockDB = function ()
    {
        return Engine.GetBlockDB(Engine.GetMaxNumBlockDB());
    };
}
