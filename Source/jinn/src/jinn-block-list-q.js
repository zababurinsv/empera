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
    Engine.ChainVersionNum = 0;
    Engine.InitChainTree = function ()
    {
        Engine.CacheChainDBTree = new RBTree(function FBlockNum(a,b)
        {
            return a.BlockNum - b.BlockNum;
        });
        Engine.VersionChainDBTree = new RBTree(function FBlockNum(a,b)
        {
            return a.VersionNum - b.VersionNum;
        });
    };
    Engine.GetChainArrByNum = function (BlockNum,bReadOnly)
    {
        var Find = Engine.FindChainInCache(BlockNum);
        if(!Find)
        {
            if(bReadOnly)
                return [];
            Engine.ChainVersionNum++;
            Find = Engine.ReadChainItemFromDB(BlockNum);
            if(!Find)
                Find = {BlockNum:BlockNum, ArrBlock:[]};
            Find.VersionNum = Engine.ChainVersionNum;
            Engine.CacheChainDBTree.insert(Find);
            Engine.VersionChainDBTree.insert(Find);
        }
        return Find.ArrBlock;
    };
    Engine.UpdateChainList = function (BlockNum)
    {
        while(Engine.VersionChainDBTree.size > JINN_CONST.MAX_CHAIN_IN_MEMORY)
        {
            var OldItem = Engine.VersionChainDBTree.min();
            Engine.VersionChainDBTree.remove(OldItem);
            Engine.CacheChainDBTree.remove(OldItem);
            Engine.WriteChainItemToDB(OldItem);
        }
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
