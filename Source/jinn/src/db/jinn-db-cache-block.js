/*
 * @project: JINN
 * @version: 1.0
 * @license: MIT (not for evil)
 * @copyright: Yuriy Ivanov (Vtools) 2019-2020 [progr76@gmail.com]
 * Telegram:  https://t.me/progr76
*/

/**
 *
 * Cache the last entries of the database of the blockchain
 *
**/
'use strict';

class CDBBlockCache extends global.CDBBodyCache
{
    constructor(EngineID, FCalcBlockHash)
    {
        super(EngineID, FCalcBlockHash)
        
        this.CacheBlock = new CCache(JINN_CONST.MAX_CACHE_DB_LENGTH)
        this.CacheMainIndex = new CCache(100000)
        this.CacheChainIndex = new CCache(100000)
    }
    
    DoNode()
    {
        super.DoNode()
        
        this.CacheBlock.SetMaxSizeCache(JINN_CONST.MAX_CACHE_DB_LENGTH)
        
        var Size = this.CacheBlock.CheckDBBlockCacheSize(JINN_CONST.CACHE_DB_LENGTH);
        JINN_STAT.MAXCacheBlockLength = Math.max(JINN_STAT.MAXCacheBlockLength, Size)
    }
    WriteBlock(Block)
    {
        var Result = super.WriteBlock(Block);
        if(Result)
        {
            Block.CacheIndex = Block.Position
            this.CacheBlock.AddItemToCache(Block)
        }
        return Result;
    }
    ReadBlock(Position, bRaw)
    {
        var Find = this.CacheBlock.FindItemInCache(Position);
        if(Find)
        {
            return Find;
        }
        
        var Block = super.ReadBlock(Position, bRaw);
        if(Block)
        {
            Block.CacheIndex = Block.Position
            this.CacheBlock.AddItemToCache(Block)
        }
        
        return Block;
    }
    ReadIndex(BlockNum)
    {
        if(BlockNum > this.GetMaxIndex())
            return undefined;
        
        var Find = this.CacheChainIndex.FindItemInCache(BlockNum);
        if(Find)
            return Find;
        
        var Item = super.ReadIndex(BlockNum);
        if(Item)
        {
            Item.CacheIndex = BlockNum
            this.CacheChainIndex.AddItemToCache(Item)
        }
        
        return Item;
    }
    
    WriteIndex(Item)
    {
        var Result = super.WriteIndex(Item);
        if(Result)
        {
            Item.CacheIndex = Item.BlockNum
            this.CacheChainIndex.AddItemToCache(Item)
        }
        return Result;
    }
    ReadMainIndex(BlockNum)
    {
        if(BlockNum > this.GetMaxMainIndex())
            return undefined;
        
        var Find = this.CacheMainIndex.FindItemInCache(BlockNum);
        if(Find)
            return Find;
        
        var Item = super.ReadMainIndex(BlockNum);
        if(Item)
        {
            Item.CacheIndex = BlockNum
            this.CacheMainIndex.AddItemToCache(Item)
        }
        
        return Item;
    }
    
    WriteMainIndex(BlockNum, Position)
    {
        var Result = super.WriteMainIndex(BlockNum, Position);
        if(Result)
        {
            this.CacheMainIndex.AddItemToCache({CacheIndex:BlockNum, BlockNum:BlockNum, MainPosition:Position})
        }
        return Result;
    }
    
    TruncateMain(LastBlockNum)
    {
        super.TruncateMain(LastBlockNum)
        this.CacheMainIndex.ClearCacheDBTree(LastBlockNum)
    }
    
    TruncateIndex(LastBlockNum)
    {
        super.TruncateIndex(LastBlockNum)
        this.CacheChainIndex.ClearCacheDBTree(LastBlockNum)
    }
    
    Clear()
    {
        super.Clear()
        this.CacheBlock.Clear()
        this.CacheMainIndex.Clear()
        this.CacheChainIndex.Clear()
    }
};

global.CDBBlockCache = CDBBlockCache;
