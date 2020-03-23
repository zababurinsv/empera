/*
 * @project: JINN
 * @version: 1.0
 * @license: MIT (not for evil)
 * @copyright: Yuriy Ivanov (Vtools) 2019-2020 [progr76@gmail.com]
 * Telegram:  https://t.me/progr76
*/


'use strict';

class CDBCacheHot extends global.CDBBlockCache
{
    constructor(EngineID, FCalcBlockHash)
    {
        super(EngineID, FCalcBlockHash)
        
        this.StartHotBlockNum = 1e9
    }
    
    DoNode()
    {
        super.DoNode()
        
        this.StartHotBlockNum = Math.max(JINN_CONST.BLOCK_GENESIS_COUNT, JINN_EXTERN.GetCurrentBlockNumByTime() + 0)
    }
    
    Clear()
    {
        super.Clear()
    }
    WriteBlock(Block)
    {
        if(Block.BlockNum < this.StartHotBlockNum)
            return super.WriteBlock(Block);
        return 0;
    }
    GetMaxIndex()
    {
        return super.GetMaxIndex();
    }
    
    ReadIndex(BlockNum)
    {
        if(BlockNum < this.StartHotBlockNum)
            return super.ReadIndex(BlockNum);
        
        ToLogTrace("Error hot ReadIndex on block=" + BlockNum)
        return undefined;
    }
    
    WriteIndex(Item)
    {
        if(Item.BlockNum < this.StartHotBlockNum)
            return super.WriteIndex(Item);
        
        ToLogTrace("Error hot WriteIndex on block=" + Item.BlockNum)
        return 0;
    }
    WriteBlockMain(Block)
    {
        return super.WriteBlockMain(Block);
    }
    ReadBlockMain(BlockNum)
    {
        return super.ReadBlockMain(BlockNum);
    }
    
    GetMaxMainIndex()
    {
        return super.GetMaxMainIndex();
    }
    
    ReadMainIndex(BlockNum)
    {
        if(BlockNum < this.StartHotBlockNum)
            return super.ReadMainIndex(BlockNum);
        
        ToLogTrace("Error hot ReadMainIndex on block=" + BlockNum)
        return undefined;
    }
    WriteMainIndex(BlockNum, Position)
    {
        if(BlockNum < this.StartHotBlockNum)
            return super.WriteMainIndex(BlockNum, Position);
        
        ToLogTrace("Error hot WriteMainIndex on block=" + BlockNum)
        return 0;
    }
    TruncateMain(LastBlockNum)
    {
        if(LastBlockNum < this.StartHotBlockNum)
            return super.TruncateMain(LastBlockNum);
        
        ToLogTrace("Error hot WriteMainIndex on block=" + LastBlockNum)
    }
    LoadBlockTx(Block)
    {
        if(Block.BlockNum < this.StartHotBlockNum)
            return super.LoadBlockTx(Block);
        
        ToLogTrace("Error hot LoadBlockTx on block=" + Block.BlockNum)
        return 0;
    }
    
    GetBodyFilePosition(LastPosition, BlockNum, TreeHash, TxData)
    {
        if(BlockNum < this.StartHotBlockNum)
            return super.GetBodyFilePosition(LastPosition, BlockNum, TreeHash, TxData);
        
        ToLogTrace("Error hot GetBodyFilePosition on block=" + BlockNum)
        return 0;
    }
    SetTxData(BlockNum, TreeHash, TxData)
    {
        if(IsZeroArr(TreeHash))
            return 0;
        if(BlockNum < this.StartHotBlockNum)
            return super.SetTxData(BlockNum, TreeHash, TxData);
        ToLogTrace("TODO SetTxData on block=" + BlockNum)
        
        return 0;
    }
    
    GetChainArrByNum(BlockNum)
    {
        if(BlockNum < this.StartHotBlockNum)
            return super.GetChainArrByNum(BlockNum);
        ToLogTrace("TODO GetChainArrByNum on block=" + BlockNum)
        return [];
    }
    
    FindBlockByHash(BlockNum, Hash)
    {
        if(BlockNum < this.StartHotBlockNum)
            return super.FindBlockByHash(BlockNum, Hash);
        return undefined;
    }
    GetPrevBlockDB(Block)
    {
        if(!Block.BlockNum)
            return undefined;
        
        if(Block.BlockNum < this.StartHotBlockNum)
            return super.GetPrevBlockDB(Block);
        ToLogTrace("TODO GetPrevBlockDB on block=" + Block.BlockNum)
        
        return undefined;
    }
    
    SetBlockJump(BlockSeed, Block, StrType)
    {
        if(BlockSeed.BlockNum < this.StartHotBlockNum - JINN_CONST.HOT_CACHE_DELTA)
            return super.SetBlockJump(BlockSeed, Block, StrType);
        return 0;
    }
    
    GetBlockJump(BlockSeed, StrType)
    {
        if(BlockSeed.BlockNum < this.StartHotBlockNum - JINN_CONST.HOT_CACHE_DELTA)
            return super.GetBlockJump(BlockSeed, StrType);
        
        return undefined;
    }
    SaveChainToDB(BlockHead, BlockSeed)
    {
        var Arr = [];
        while(BlockSeed.BlockNum >= this.StartHotBlockNum)
        {
            Arr.push(BlockSeed)
            var BlockSeed = this.GetPrevBlockDB(BlockSeed);
            if(!BlockSeed)
                return 0;
        }
        var Result = 1;
        if(BlockSeed.BlockNum > BlockHead.BlockNum)
            Result = super.SaveChainToDB(BlockHead, BlockSeed)
        
        if(!Result)
            return Result;
        
        for(var i = Arr.length - 1; i >= 0; i--)
        {
            this.WriteBlockMain(Arr[i])
        }
        return Result;
    }
};

global.CDBCacheHot = CDBCacheHot;
