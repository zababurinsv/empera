/*
 * @project: TERA
 * @version: Development (beta)
 * @license: MIT (not for evil)
 * @copyright: Yuriy Ivanov (Vtools) 2017-2019 [progr76@gmail.com]
 * Web: https://terafoundation.org
 * Twitter: https://twitter.com/terafoundation
 * Telegram:  https://t.me/terafoundation
*/

global.JINN_MODULES.push({InitClass:InitClass});
const DB_BLOCK_FORMAT = {BlockNum:"uint", PrevHash:"hash", TreeHash:"hash", AddrHash:"hash", SumHash:"hash", SumPow:"uint",
    TxData:[{HASH:"hash", HashPow:"hash", body:"tr"}], };
const DB_BLOCK_FORMATWRK = {};
const DB_BLOCK_HEADER_FORMAT = GetCopyObj(DB_BLOCK_FORMAT);
delete DB_BLOCK_HEADER_FORMAT.TxData;
const DB_BLOCK_HEADER_FORMATWRK = {};
function InitClass(Engine)
{
    Engine.ArrDB = [];
    Engine.SaveToDB = function (Block,bCheckSum)
    {
        JINN_STAT.SaveDB++;
        Engine.ToDebug("SaveToDB  Block:" + Block.BlockNum + " POW=" + Block.SumPow);
        var BlockNum = Block.BlockNum;
        if(Engine.ArrDB.length > BlockNum)
        {
            Engine.ArrDB.length = BlockNum;
        }
        var BlockDB = {};
        BlockDB.BlockNum = Block.BlockNum;
        BlockDB.PrevHash = Block.PrevHash;
        BlockDB.TreeHash = Block.TreeHash;
        BlockDB.AddrHash = Block.AddrHash;
        BlockDB.Hash = Block.Hash;
        BlockDB.TxData = Block.TxData;
        var PrevBlock;
        if(BlockNum > 0)
        {
            PrevBlock = Engine.GetBlockHeaderDB(BlockNum - 1);
            BlockDB.SumHash = sha3(PrevBlock.SumHash.concat(BlockDB.Hash));
            BlockDB.SumPow = PrevBlock.SumPow + Block.Power;
        }
        else
        {
            BlockDB.SumHash = ZERO_ARR_32;
            BlockDB.SumPow = Block.Power;
        }
        var Buf = SerializeLib.GetBufferFromObject(Block, DB_BLOCK_FORMAT, DB_BLOCK_FORMATWRK);
        Engine.ArrDB[BlockNum] = Buf;
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
            if(!PrevBlock.SumHash)
                throw "SaveToDB: Error PrevBlock.SumHash on Block=" + BlockNum;
            if(PrevBlock.SumPow === undefined)
                throw "SaveToDB: Error PrevBlock.SumPow on Block=" + BlockNum;
            if(!IsEqArr(PrevBlock.Hash, Block.PrevHash))
                throw "SaveToDB: Error PrevHash";
            if(PrevBlock.BlockNum !== Block.BlockNum - 1)
                throw "SaveToDB: Error PrevBlock.BlockNum on Block=" + BlockNum;
        }
        if(bCheckSum)
        {
            if(BlockDB.SumPow !== Block.SumPow)
            {
                throw "SaveToDB: Error Sum POW: " + BlockDB.SumPow + "/" + Block.SumPow + " on block=" + Block.BlockNum;
                return 0;
            }
        }
        Engine.OnSaveBlock(BlockDB);
        return 1;
    };
    Engine.GetBlockDB = function (BlockNum)
    {
        var Find = Engine.FindBlockDBInCache(BlockNum);
        if(Find)
            return Find;
        else
            return Engine.GetBlockDBInner(BlockNum);
    };
    Engine.GetBlockHeaderDB = function (BlockNum)
    {
        var Find = Engine.FindBlockDBInCache(BlockNum);
        if(Find)
            return Find;
        else
            return Engine.GetBlockHeaderDBInner(BlockNum);
    };
    Engine.GetBlockDBInner = function (BlockNum)
    {
        var Buf = Engine.ArrDB[BlockNum];
        if(!Buf)
            return undefined;
        JINN_STAT.LoadDB++;
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
        JINN_STAT.LoadHDB++;
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
    Engine.SaveChainToDB = function (SeedBlock,HeadBlock)
    {
        var Arr = [];
        var CurBlock = SeedBlock;
        var BlockDB = Engine.GetBlockHeaderDB(SeedBlock.BlockNum);
        if(BlockDB)
        {
            if(!SeedBlock.SumPow || BlockDB.SumPow > SeedBlock.SumPow)
                throw "SaveChainToDB: Error SumPow = " + SeedBlock.SumPow + "/" + BlockDB.SumPow;
        }
        while(CurBlock)
        {
            if(CurBlock === HeadBlock)
                break;
            Arr.unshift(CurBlock);
            CurBlock = CurBlock.PrevBlock;
        }
        for(var b = 0; b < Arr.length; b++)
        {
            var CurBlock2 = Arr[b];
            Engine.SaveToDB(CurBlock2, 1);
            Engine.SetBlockAsSave(CurBlock2);
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
function GetCopyObj(Obj)
{
    var Obj2 = {};
    for(var key in Obj)
        Obj2[key] = Obj[key];
    return Obj2;
}
global.GetCopyObj = GetCopyObj;
