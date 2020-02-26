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
global.JINN_MODULES.push({InitClass:InitClass, DoNode:DoNode});

//Engine context
function DoNode(Engine)
{
    if(Engine.TickNum % 10 === 0)
    {
        Engine.CheckDBCacheSize();
    }
}

function InitClass(Engine)
{
    
    Engine.InitCacheDBTree = function ()
    {
        Engine.SaveVersionNum = 1;
        Engine.CacheDBTree = new RBTree(function (a,b)
        {
            return a.BlockNum - b.BlockNum;
        });
        Engine.VersionDBTree = new RBTree(function FBlockNum(a,b)
        {
            return a.SaveVersionNum - b.SaveVersionNum;
        });
    };
    Engine.ClearCacheDBTree = function (StartNum)
    {
        while(1)
        {
            var Block = Engine.CacheDBTree.max();
            if(!Block || Block.BlockNum < StartNum)
                break;
            Engine.CacheDBTree.remove(Block);
            Engine.VersionDBTree.remove(Block);
        }
    };
    
    Engine.CheckDBCacheSize = function ()
    {
        var MaxCount = JINN_CONST.MAX_SPEED_CACHE_DB_CLEAR;
        while(Engine.VersionDBTree.size > JINN_CONST.MAX_CACHE_DB_LENGTH)
        {
            var OldItem = Engine.VersionDBTree.min();
            Engine.VersionDBTree.remove(OldItem);
            Engine.CacheDBTree.remove(OldItem);
            
            MaxCount--;
            if(MaxCount <= 0)
                break;
        }
        JINN_STAT.MAXCacheDBLength = Math.max(JINN_STAT.MAXCacheDBLength, Engine.VersionDBTree.size);
    };
    
    Engine.AddBlockDBToCache = function (Block,bFull)
    {
        
        var Find = Engine.CacheDBTree.find(Block);
        if(Find)
        {
            Engine.CacheDBTree.remove(Find);
            Engine.VersionDBTree.remove(Find);
        }
        
        Engine.SaveVersionNum++;
        Block.SaveVersionNum = Engine.SaveVersionNum;
        Block.FullBlock = bFull;
        Engine.CacheDBTree.insert(Block);
        Engine.VersionDBTree.insert(Block);
        
        JINN_STAT.MAXCacheDBLength = Math.max(JINN_STAT.MAXCacheDBLength, Engine.VersionDBTree.size);
    };
    
    Engine.FindBlockDBInCache = function (BlockNum,bFull)
    {
        JINN_STAT.MAXCacheDBLength = Math.max(JINN_STAT.MAXCacheDBLength, Engine.VersionDBTree.size);
        
        var Find = Engine.CacheDBTree.find({BlockNum:BlockNum});
        if(Find && (Find.FullBlock || Find.FullBlock === bFull))
        {
            Engine.VersionDBTree.remove(Find);
            
            Engine.SaveVersionNum++;
            Find.SaveVersionNum = Engine.SaveVersionNum;
            Engine.VersionDBTree.insert(Find);
            return Find;
        }
        
        JINN_STAT.CacheErrDB++;
        
        return undefined;
    };
    
    Engine.SetBlockAsSave = function (Block)
    {
        Block.WasSaveVersion = Engine.SaveVersionNum;
    };
    Engine.InitCacheDBTree();
}
