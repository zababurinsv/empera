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
    Engine.GetFirstHeadBlock = function (SeedBlock)
    {
        var JumpBlock;
        var Block = SeedBlock;
        while(Block && Block.PrevBlock)
        {
            if(Engine.IsValideDBSave(Block))
                break;
            Block = Block.PrevBlock;
            JINN_STAT.FindHeadCount++;
            var FirstHeadBlock = Block.FirstHeadBlock;
            if(FirstHeadBlock && FirstHeadBlock.HeadProcessNum && Block.HeadProcessNum && FirstHeadBlock.HeadProcessNum === Block.HeadProcessNum)
            {
                JumpBlock = Block;
                Block = FirstHeadBlock;
            }
        }
        if(Block !== SeedBlock)
        {
            SeedBlock.FirstHeadBlock = Block;
            SeedBlock.HeadProcessNum = Engine.SaveVersionNum;
            Block.HeadProcessNum = Engine.SaveVersionNum;
        }
        return Block;
    };
    Engine.GetFirstHeadBlock0 = function (SeedBlock)
    {
        var Block = SeedBlock;
        while(Block && Block.PrevBlock)
        {
            if(Engine.IsValideDBSave(Block))
                break;
            Block = Block.PrevBlock;
            JINN_STAT.FindHeadCount0++;
        }
        return Block;
    };
    Engine.GetFirstEmptyBodyBlock = function (SeedBlock)
    {
        var Block = SeedBlock;
        var LastBlock;
        while(Block)
        {
            LastBlock = Block;
            if(!IsZeroArr(Block.TreeHash))
            {
                if(!Block.TxData)
                {
                    var ArrBlock = Engine.GetBlockArrFromNum(Block.BlockNum);
                    if(ArrBlock)
                    {
                        for(var i = 0; i < ArrBlock.length; i++)
                        {
                            var Block2 = ArrBlock[i];
                            if(Block2 && Block2.TxData && IsEqArr(Block2.TreeHash, Block.TreeHash))
                            {
                                Block2.TxData = Block2.TxData;
                            }
                        }
                    }
                }
                if(!Block.TxData)
                {
                    break;
                }
                var FirstEmptyBody = Block.FirstEmptyBody;
                if(FirstEmptyBody)
                {
                    if(FirstEmptyBody === "END")
                    {
                        Block = undefined;
                        break;
                    }
                    FirstEmptyBody.Description = " jump from " + Block.BlockNum;
                    Block = FirstEmptyBody;
                    continue;
                }
            }
            Block = Block.PrevBlock;
        }
        if(LastBlock !== SeedBlock)
        {
            if(Block)
                SeedBlock.FirstEmptyBody = LastBlock;
            else
                SeedBlock.FirstEmptyBody = "END";
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
                TotalSum += StopBlock.SumPow;
                break;
            }
            if(Block.SumPow !== undefined && Block.SumPowFromNum !== undefined && BlockDB.BlockNum >= Block.SumPowFromNum)
            {
                StopBlock = Block;
                TotalSum += StopBlock.SumPow;
                break;
            }
            TotalSum += Block.Power;
            Block = Block.PrevBlock;
            if(!Block)
            {
                return 0;
            }
        }
        Block = BlockSeed;
        while(Block)
        {
            if(Block === StopBlock)
                break;
            Block.SumPow = TotalSum;
            Block.SumPowFromNum = BlockDB.BlockNum;
            TotalSum -= Block.Power;
            Block = Block.PrevBlock;
        }
        if(TotalSum !== StopBlock.SumPow)
            throw "Error fill FillSumPow";
        Block = BlockSeed;
        while(Block)
        {
            if(IsEqArr(BlockDB.Hash, Block.Hash))
                break;
            if(Block.SumPow === undefined)
            {
                Engine.ToLog("Error SumPow in block " + Block.BlockNum + " - " + Block.SumPowFromNum + " BlockSeed=" + BlockSeed.BlockNum + "  BlockDB=" + BlockDB.BlockNum + " StopBlock=" + StopBlock.BlockNum + " - " + StopBlock.SumPowFromNum);
                break;
            }
            Block = Block.PrevBlock;
        }
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
                throw "SaveChainToDB: Error SumPow = " + SeedBlock.SumPow + "/" + BlockDB.SumPow;
        }
        while(CurBlock)
        {
            delete CurBlock.FirstHeadBlock;
            delete CurBlock.HeadProcessNum;
            delete CurBlock.FirstEmptyBody;
            if(CurBlock === HeadBlock)
                break;
            Arr.unshift(CurBlock);
            CurBlock = CurBlock.PrevBlock;
        }
        for(var b = 0; b < Arr.length; b++)
        {
            var Block = Arr[b];
            Engine.SaveToDB(Block, 1, 0);
            Engine.SetBlockAsSave(Block);
        }
    };
}
