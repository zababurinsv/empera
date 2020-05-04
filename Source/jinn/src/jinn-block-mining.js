/*
 * @project: JINN
 * @version: 1.0
 * @license: MIT (not for evil)
 * @copyright: Yuriy Ivanov (Vtools) 2019-2020 [progr76@gmail.com]
 * Telegram:  https://t.me/progr76
*/


'use strict';
global.JINN_MODULES.push({InitClass:InitClass, Name:"Mining"});

function InitClass(Engine)
{
    Engine.MiningBlockArr = {};
    Engine.MiningBuffer = new CTimeCache(function (a,b)
    {
        return CompareArr(a.DataHash, b.DataHash);
    });
    Engine.CurrentBodyTx = new CTimeCache(function (a,b)
    {
        return a.BlockNum - b.BlockNum;
    });
    
    Engine.DoRecalcPOW = function ()
    {
        
        var CurBlockNum = JINN_EXTERN.GetCurrentBlockNumByTime();
        for(var Num = CurBlockNum - JINN_CONST.STEP_CALC_POW_FIRST; Num <= CurBlockNum - JINN_CONST.STEP_CALC_POW_LAST; Num++)
        {
            var BlockNum = Num - 1;
            var Store = Engine.GetLiderArrAtNum(BlockNum);
            if(Store)
            {
                for(var n = 0; n < Store.LiderArr.length; n++)
                {
                    var NodeStatus = Store.LiderArr[n];
                    var Block = Engine.DB.FindBlockByHash(BlockNum, NodeStatus.Hash);
                    if(Block)
                    {
                        if(!Engine.MiningBuffer.FindItemInCache({DataHash:Block.DataHash}))
                        {
                            Engine.MiningBuffer.AddItemToCache({DataHash:Block.DataHash, TimeNum:Block.BlockNum});
                            
                            var BlockNew = Engine.GetNewBlock(Block);
                            
                            if(BlockNew)
                            {
                                Engine.ToLog("" + n + ". Add new block on Pow=" + Block.Power + " SumPow=" + Block.SumPow + "   Block=" + Block.BlockNum, 4);
                                Engine.AddToMining(BlockNew);
                            }
                        }
                    }
                }
            }
        }
    };
    
    Engine.AddToMining = function (Block)
    {
        
        var MinerMaxArr;
        var HashMaxArr = Block.Hash;
        var MinerHash = [Engine.ID % 256, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        0];
        for(var i = 0; i < 16; i++)
        {
            MinerHash[10] = random(255);
            MinerHash[11] = random(255);
            
            var HashTest = sha3(Block.DataHash.concat(MinerHash).concat(GetArrFromValue(Block.BlockNum)), 6);
            if(CompareArr(HashTest, HashMaxArr) < 0)
            {
                HashMaxArr = HashTest;
                MinerMaxArr = MinerHash.slice(0);
            }
        }
        
        if(MinerMaxArr)
        {
            var BlockNew = Engine.GetCopyBlock(Block);
            
            BlockNew.MinerHash = MinerMaxArr;
            Engine.CalcBlockData(BlockNew);
            
            Engine.AddBlockToChain(BlockNew, 1);
        }
    };
    
    Engine.DoSaveMain = function ()
    {
        var BlockNumSave = JINN_EXTERN.GetCurrentBlockNumByTime() - JINN_CONST.STEP_SAVE;
        
        var Count = 0;
        while(1)
        {
            Count++;
            var LastBlockNumMain = Engine.GetMaxNumBlockDB();
            
            if(LastBlockNumMain >= BlockNumSave)
                break;
            
            var BlockNum = LastBlockNumMain + 1;
            
            if(BlockNum < JINN_CONST.BLOCK_GENESIS_COUNT)
            {
                Engine.WriteGenesisDB();
                break;
            }
            
            var Block = Engine.GetMaxPowerBlockWithConinues(BlockNum, LastBlockNumMain);
            if(!Block)
            {
                Engine.ToLog("--Cannt GetMaxPowerBlockWithConinues Block=" + BlockNum);
                break;
            }
            
            if(!Engine.SaveToDB(Block))
            {
                Engine.ToLog("--Can not save to DB block=" + BlockNum);
                return 0;
            }
            
            if(Count >= JINN_CONST.DELTA_BLOCKS_FOR_CREATE)
            {
                break;
            }
        }
    };
    
    Engine.DoCreateNewBlock = function ()
    {
        
        var BlockNumTime = JINN_EXTERN.GetCurrentBlockNumByTime();
        var BlockNumSave = BlockNumTime - JINN_CONST.STEP_SAVE;
        var BlockNumNew = BlockNumTime - JINN_CONST.STEP_NEW_BLOCK;
        
        var LastBlockNumMain = Engine.GetMaxNumBlockDB();
        if(LastBlockNumMain < JINN_CONST.BLOCK_GENESIS_COUNT || LastBlockNumMain < BlockNumSave)
            return;
        if(BlockNumSave < JINN_CONST.BLOCK_GENESIS_COUNT)
            BlockNumSave = JINN_CONST.BLOCK_GENESIS_COUNT - 1;
        
        var Block = Engine.GetMaxPowerBlockWithConinues(BlockNumNew, BlockNumSave, 1);
        if(!Block)
        {
            Engine.ToLog("---Cannt create block=" + BlockNumNew);
        }
    };
    
    Engine.SetBodyCurrentTx = function (Block)
    {
        if(IsZeroArr(Block.TreeHash))
            return;
        
        if(Engine.CurrentBodyTx.FindItemInCache(Block))
            return;
        
        Block.TimeNum = Block.BlockNum;
        Engine.CurrentBodyTx.AddItemToCache(Block);
    };
    
    Engine.FillBodyCurrentTx = function (Block)
    {
        var Find = Engine.CurrentBodyTx.FindItemInCache(Block);
        if(Find)
        {
            Block.TreeHash = Find.TreeHash;
            Block.TxData = Find.TxData;
            Block.TxCount = Find.TxCount;
        }
        else
        {
            Block.TreeHash = ZERO_ARR_32;
            Block.TxCount = 0;
        }
    };
    Engine.AddBlockToChain = function (Block,bAddOnlyMax)
    {
        var Result =  - 1;
        var CurBlockNum = JINN_EXTERN.GetCurrentBlockNumByTime();
        if(Block.BlockNum >= CurBlockNum - JINN_CONST.STEP_LAST - JINN_CONST.MAX_DELTA_PROCESSING)
            Result = Engine.AddHashToMaxLider(Block, Block.BlockNum, 1);
        
        if(!bAddOnlyMax || Result !==  - 1)
        {
            var Find = Engine.DB.FindBlockByHash(Block.BlockNum, Block.SumHash);
            if(Find)
                return Find;
            Engine.DB.WriteBlock(Block);
        }
        else
        {
            return undefined;
        }
        
        return Block;
    };
}
