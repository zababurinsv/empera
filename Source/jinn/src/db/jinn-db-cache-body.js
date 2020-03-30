/*
 * @project: JINN
 * @version: 1.0
 * @license: MIT (not for evil)
 * @copyright: Yuriy Ivanov (Vtools) 2019-2020 [progr76@gmail.com]
 * Telegram:  https://t.me/progr76
*/

'use strict';

class CDBBodyCache extends global.CDBChain
{
    constructor(EngineID, FCalcBlockHash)
    {
        super(EngineID, FCalcBlockHash)
        this.CacheBody = new CCache(JINN_CONST.MAX_CACHE_BODY_LENGTH, function (a,b)
        {
            return CompareArr(a.CacheIndex, b.CacheIndex);
        })
    }
    DoNode()
    {
        super.DoNode()
        
        this.CacheBody.SetMaxSizeCache(JINN_CONST.MAX_CACHE_BODY_LENGTH)
        
        var Size = this.CacheBody.CheckDBBlockCacheSize(JINN_CONST.MAX_CACHE_BODY_LENGTH);
        JINN_STAT.MAXCacheBodyLength = Math.max(JINN_STAT.MAXCacheBodyLength, Size)
    }
    Clear()
    {
        super.Clear()
        this.CacheBody.Clear()
    }
    
    LoadBlockTx(Block)
    {
        if(!Block || !Block.TreeHash || !Block.TxPosition || IsZeroArr(Block.TreeHash))
            return;
        
        var Find = this.CacheBody.FindItemInCache(Block.TreeHash);
        if(Find && Find.TxData)
        {
            Block.TxData = Find.TxData
            return;
        }
        
        super.LoadBlockTx(Block)
        if(Block.TxData)
        {
            this.CacheBody.AddItemToCache({CacheIndex:Block.TreeHash, TxData:Block.TxData})
        }
        
        return Block;
    }
};

global.CDBBodyCache = CDBBodyCache;
