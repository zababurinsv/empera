/*
 * @project: JINN
 * @version: 1.0
 * @license: MIT (not for evil)
 * @copyright: Yuriy Ivanov (Vtools) 2019-2020 [progr76@gmail.com]
 * Telegram:  https://t.me/progr76
*/

'use strict';
global.JINN_MODULES.push({InitClass:InitClass});
function InitClass(Engine)
{
    Engine.EmptyBodyLink = 1;
    Engine.BlockHeadLink = 1;
    Engine.SetChainArr = function (Block)
    {
        var ArrBlock = Engine.GetChainArrByNum(Block.BlockNum);
        ArrBlock.push(Block);
        Engine.SetChainListForSave(Block.BlockNum);
    };
    Engine.SetBlockData = function (Block,TxData)
    {
        Block.TxData = TxData;
        Engine.SetChainListForSave(Block.BlockNum);
    };
    Engine.GetPrevBlock = function (Block)
    {
        return Engine.GetBlockAtNum(Block.BlockNum - 1, Block.PrevBlockHash);
    };
    Engine.GetBlockAtNum = function (BlockNum,Hash)
    {
        var ArrBlock = Engine.GetChainArrByNum(BlockNum);
        for(var i = 0; i < ArrBlock.length; i++)
        {
            var Block2 = ArrBlock[i];
            if(IsEqArr(Hash, Block2.Hash))
            {
                return Block2;
            }
        }
        return undefined;
    };
    Engine.GetFirstHeadBlock = function (SeedBlock)
    {
        var Count = 0;
        var JumpBlock, JumpBlockTo;
        var Block = SeedBlock;
        var BlockSet;
        while(Block)
        {
            Count++;
            if(Block.BlockNum < Engine.ChainDBBlockMin || Engine.IsValideDBSave(Block))
            {
                break;
            }
            if(Block.FirstHeadBlockNum && Block.HeadLinkVer && Block.BlockNum >= Engine.ChainDBBlockMin)
            {
                var FirstBlock = Engine.GetBlockAtNum(Block.FirstHeadBlockNum, Block.FirstHeadBlockHash);
                if(FirstBlock && FirstBlock.HeadLinkVer && FirstBlock.HeadLinkVer === Block.HeadLinkVer)
                {
                    JumpBlock = Block;
                    JumpBlockTo = FirstBlock;
                    Block = FirstBlock;
                    BlockSet = JumpBlockTo;
                    continue;
                }
            }
            var PrevBlock = Engine.GetPrevBlock(Block);
            if(!PrevBlock)
                break;
            BlockSet = Block;
            Block = PrevBlock;
        }
        JINN_STAT.MAXFindHeadCount = Math.max(JINN_STAT.MAXFindHeadCount, Count);
        var Block0 = Engine.GetFirstHeadBlock0(SeedBlock);
        if(Block0 !== Block)
        {
            var Str = "Err HeadBlock = " + BlockInfoH(Block) + "  Need = " + BlockInfoH(Block0) + "   ChainDBBlockMin=" + Engine.ChainDBBlockMin;
            if(JumpBlock)
                Str += "  JumpBlock = " + BlockInfoH(JumpBlock) + " -> " + BlockInfoH(JumpBlockTo);
            Engine.ToLog(Str);
        }
        if(BlockSet && BlockSet !== SeedBlock)
        {
            SeedBlock.FirstHeadBlockNum = BlockSet.BlockNum;
            SeedBlock.FirstHeadBlockHash = BlockSet.Hash;
            if(BlockSet !== JumpBlockTo)
            {
                Engine.BlockHeadLink++;
                BlockSet.HeadLinkVer = Engine.BlockHeadLink;
                Engine.SetChainListForSave(BlockSet.BlockNum);
            }
            SeedBlock.HeadLinkVer = BlockSet.HeadLinkVer;
            Engine.SetChainListForSave(SeedBlock.BlockNum);
        }
        return Block;
    };
    Engine.GetFirstHeadBlock0 = function (SeedBlock)
    {
        var Block = SeedBlock;
        while(Block)
        {
            if(Block.BlockNum < Engine.ChainDBBlockMin || Engine.IsValideDBSave(Block))
                break;
            var PrevBlock = Engine.GetPrevBlock(Block);
            if(!PrevBlock)
                break;
            Block = PrevBlock;
        }
        return Block;
    };
    function BlockInfoH(Block)
    {
        if(!Block)
            return "-";
        return "" + Block.BlockNum + " (" + Block.HeadLinkVer + ")";
    };
    function BlockInfoB(Block)
    {
        if(!Block)
            return "-";
        return "" + Block.BlockNum + " (" + Block.BodyLinkVer + ")";
    };
    Engine.GetFirstEmptyBodyBlock = function (SeedBlock)
    {
        var Count = 0;
        var Block = SeedBlock;
        var BlockSet, JumpBlock, JumpBlockTo;
        var FirstHeadBlock = Engine.GetFirstHeadBlock(SeedBlock);
        while(Block)
        {
            BlockSet = Block;
            Count++;
            if(Block.BlockNum < FirstHeadBlock.BlockNum)
            {
                if(!FirstHeadBlock.TxData)
                {
                    Block = FirstHeadBlock;
                }
                else
                {
                    Block = undefined;
                }
                break;
            }
            if(!IsZeroArr(Block.TreeHash))
            {
                if(!Block.TxData)
                {
                    var ArrBlock = Engine.GetBlockArrFromNum(Block.BlockNum, 1);
                    if(ArrBlock)
                    {
                        for(var i = 0; i < ArrBlock.length; i++)
                        {
                            var Block2 = ArrBlock[i];
                            if(Block2 && Block2.TxData && IsEqArr(Block2.TreeHash, Block.TreeHash))
                            {
                                Engine.SetBlockData(Block, Block2.TxData);
                            }
                        }
                    }
                }
                if(!Block.TxData)
                {
                    break;
                }
            }
            if(Block.FirstEmptyBodyNum && Block.BodyLinkVer)
            {
                var FirstBlock = Engine.GetBlockAtNum(Block.FirstEmptyBodyNum, Block.FirstEmptyBodyHash);
                if(FirstBlock && FirstBlock.BodyLinkVer === Block.BodyLinkVer)
                {
                    JumpBlock = Block;
                    JumpBlockTo = FirstBlock;
                    Block.Description = " jump to " + Block.FirstEmptyBodyNum + ":" + Block.BodyLinkVer;
                    Block = FirstBlock;
                    BlockSet = JumpBlockTo;
                    continue;
                }
            }
            Block = Engine.GetPrevBlock(Block);
        }
        JINN_STAT.MAXFindEmptyCount = Math.max(JINN_STAT.MAXFindEmptyCount, Count);
        var Block0 = Engine.GetFirstEmptyBodyBlock0(SeedBlock);
        if(Block0 !== Block)
        {
            var Str = "Err EmptyBody = " + BlockInfoB(Block) + "  Need = " + BlockInfoB(Block0) + "  FirstHeadBlock=" + FirstHeadBlock.BlockNum + "   ChainDBBlockMin=" + Engine.ChainDBBlockMin;
            if(JumpBlock)
                Str += "  JumpBlock = " + BlockInfoB(JumpBlock) + " -> " + BlockInfoB(JumpBlockTo);
            Engine.ToLog(Str);
        }
        if(BlockSet && BlockSet !== SeedBlock)
        {
            SeedBlock.FirstEmptyBodyNum = BlockSet.BlockNum;
            SeedBlock.FirstEmptyBodyHash = BlockSet.Hash;
            if(BlockSet !== JumpBlockTo)
            {
                Engine.EmptyBodyLink++;
                BlockSet.BodyLinkVer = Engine.EmptyBodyLink;
                Engine.SetChainListForSave(BlockSet.BlockNum);
            }
            SeedBlock.BodyLinkVer = BlockSet.BodyLinkVer;
            Engine.SetChainListForSave(SeedBlock.BlockNum);
        }
        return Block;
    };
    Engine.GetFirstEmptyBodyBlock0 = function (SeedBlock)
    {
        var Block = SeedBlock;
        var FirstHeadBlock = Engine.GetFirstHeadBlock(SeedBlock);
        while(Block)
        {
            if(Block.BlockNum < FirstHeadBlock.BlockNum)
            {
                if(!FirstHeadBlock.TxData)
                {
                    Block = FirstHeadBlock;
                }
                else
                {
                    Block = undefined;
                }
                break;
            }
            if(!IsZeroArr(Block.TreeHash))
            {
                if(!Block.TxData)
                {
                    var ArrBlock = Engine.GetBlockArrFromNum(Block.BlockNum, 1);
                    if(ArrBlock)
                    {
                        for(var i = 0; i < ArrBlock.length; i++)
                        {
                            var Block2 = ArrBlock[i];
                            if(Block2 && Block2.TxData && IsEqArr(Block2.TreeHash, Block.TreeHash))
                            {
                                Engine.SetBlockData(Block, Block2.TxData);
                            }
                        }
                    }
                }
                if(!Block.TxData)
                {
                    break;
                }
            }
            Block = Engine.GetPrevBlock(Block);
        }
        return Block;
    };
    Engine.FillSumPow = function (BlockDB,BlockSeed)
    {
        if(!BlockDB)
            throw "FillSumPow Error BlockDB";
        if(!BlockSeed)
            throw "FillSumPow Error BlockSeed";
        var TotalSum = 0;
        var Block = BlockSeed;
        var StopBlock = undefined;
        while(Block)
        {
            if(IsEqArr(BlockDB.Hash, Block.Hash))
            {
                StopBlock = Block;
                StopBlock.SumPow = BlockDB.SumPow;
                StopBlock.SumPowPrevNum = BlockDB.BlockNum;
                StopBlock.SumPowPrevHash = BlockDB.Hash;
                TotalSum += StopBlock.SumPow;
                break;
            }
            if(Block.SumPowPrevNum && Block.SumPowPrevNum !== Block.BlockNum)
            {
                if(Block.SumPow === undefined)
                    throw "Error Block.SumPow===undefined";
                {
                    StopBlock = Block;
                    StopBlock.Description = " jump to " + Block.SumPowPrevNum;
                    TotalSum += StopBlock.SumPow;
                    break;
                }
            }
            TotalSum += Block.Power;
            Block = Engine.GetPrevBlock(Block);
            if(!Block)
            {
                return 0;
            }
        }
        Block = BlockSeed;
        while(Block)
        {
            if(IsEqArr(StopBlock.Hash, Block.Hash))
                break;
            Block.SumPow = TotalSum;
            Block.SumPowPrevNum = BlockDB.BlockNum;
            Block.SumPowPrevHash = BlockDB.Hash;
            TotalSum -= Block.Power;
            Block = Engine.GetPrevBlock(Block);
        }
        if(TotalSum !== StopBlock.SumPow)
            throw "Error fill FillSumPow";
        return 1;
    };
    Engine.SaveChainToDB = function (SeedBlock,HeadBlock)
    {
        var Arr = [];
        var CurBlock = SeedBlock;
        var BlockDB = Engine.GetBlockHeaderDB(SeedBlock.BlockNum);
        if(BlockDB)
        {
            if(!SeedBlock.SumPow || BlockDB.SumPow > SeedBlock.SumPow)
            {
                Engine.ToLogTrace("SaveChainToDB: Error SumPow = " + SeedBlock.SumPow + "/" + BlockDB.SumPow);
                return 0;
            }
        }
        if(HeadBlock.BlockNum < Engine.ChainDBBlockMin)
        {
            return  - 1;
        }
        while(CurBlock)
        {
            delete CurBlock.FirstHeadBlockNum;
            delete CurBlock.FirstHeadBlockHash;
            delete CurBlock.BodyLinkVer;
            delete CurBlock.FirstEmptyBodyNum;
            delete CurBlock.FirstEmptyBodyHash;
            delete CurBlock.SumPowPrevNum;
            delete CurBlock.SumPowPrevHash;
            var BlockArr = Engine.GetChainArrByNum(CurBlock.BlockNum);
            for(var i = 0; i < BlockArr.length; i++)
                BlockArr[i].HeadLinkVer = 0;
            if(IsEqArr(CurBlock.Hash, HeadBlock.Hash))
                break;
            Arr.unshift(CurBlock);
            CurBlock = Engine.GetPrevBlock(CurBlock);
        }
        for(var b = 0; b < Arr.length; b++)
        {
            var Block = Arr[b];
            var Res = Engine.SaveToDB(Block, 0, 0);
            if(!Res)
            {
                return 0;
            }
            Engine.SetBlockAsSave(Block);
        }
        return 1;
    };
}
