/*
 * @project: JINN
 * @version: 1.0
 * @license: MIT (not for evil)
 * @copyright: Yuriy Ivanov (Vtools) 2019-2020 [progr76@gmail.com]
 * Telegram:  https://t.me/progr76
*/


'use strict';
global.JINN_MODULES.push({InitClass:InitClass, DoNode:DoNode});

//Engine context

function DoNode(Engine)
{
    if(Engine.TickNum % 10 === 0)
    {
        Engine.SaveCacheChainList();
    }
}
function InitClass(Engine)
{
    
    Engine.InitChainTree = function ()
    {
        Engine.ChainVersionNum = 0;
        
        Engine.CacheChainDBTree = new RBTree(function (a,b)
        {
            return a.BlockNum - b.BlockNum;
        });
        Engine.VersionChainDBTree = new RBTree(function (a,b)
        {
            return a.VersionNum - b.VersionNum;
        });
    };
    
    Engine.GetChainArrByNum = function (BlockNum,bReadOnly)
    {
        var Find = Engine.FindChainInCache(BlockNum);
        if(!Find)
        {
            Engine.ChainVersionNum++;
            Find = Engine.ReadChainFromDB(BlockNum);
            if(!Find)
            {
                if(bReadOnly)
                    return [];
                
                Find = {BlockNum:BlockNum, ArrBlock:[]};
            }
            Find.VersionNum = Engine.ChainVersionNum;
            
            Engine.CacheChainDBTree.insert(Find);
            Engine.VersionChainDBTree.insert(Find);
        }
        
        if(!bReadOnly)
            Find.ToSaveDB = 1;
        
        return Find.ArrBlock;
    };
    
    Engine.SetChainListForSave = function (BlockNum)
    {
        var Find = Engine.FindChainInCache(BlockNum);
        if(Find)
        {
            Find.ToSaveDB = 1;
        }
    };
    Engine.SaveCacheChainList = function ()
    {
        while(Engine.VersionChainDBTree.size > JINN_CONST.MAX_CHAIN_IN_MEMORY)
        {
            var OldItem = Engine.VersionChainDBTree.min();
            Engine.VersionChainDBTree.remove(OldItem);
            Engine.CacheChainDBTree.remove(OldItem);
            
            if(OldItem.ToSaveDB && OldItem.BlockNum >= 1)
            {
                JINN_STAT.SaveCH++;
                Engine.WriteChainToDB(OldItem);
                OldItem.ToSaveDB = 0;
            }
        }
        JINN_STAT.MAXCacheChainLength = Math.max(JINN_STAT.MAXCacheChainLength, Engine.VersionChainDBTree.size);
    };
    
    Engine.SetMinChainBlockNum = function (BlockNum)
    {
        Engine.GetChainArrByNum(BlockNum);
    };
    
    Engine.FindChainInCache = function (BlockNum)
    {
        
        var Find = Engine.CacheChainDBTree.find({BlockNum:BlockNum});
        if(Find)
        {
            if(Find.VersionNum < Engine.ChainVersionNum)
            {
                Engine.ChainVersionNum++;
                Engine.VersionChainDBTree.remove(Find);
                
                Find.VersionNum = Engine.ChainVersionNum;
                Engine.VersionChainDBTree.insert(Find);
            }
            return Find;
        }
        
        return undefined;
    };
    Engine.InitChainTree();
}
