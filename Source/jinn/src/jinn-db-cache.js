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
function InitClass(Engine)
{
    Engine.SaveVersionNum = 1;
    Engine.CacheDBTree = new RBTree(function FBlockNum(a,b)
    {
        return a.BlockNum - b.BlockNum;
    });
    Engine.VersionDBTree = new RBTree(function FBlockNum(a,b)
    {
        return a.SaveVersionNum - b.SaveVersionNum;
    });
    Engine.OnSaveBlock = function (Block)
    {
        Engine.SaveVersionNum++;
        Block.SaveVersionNum = Engine.SaveVersionNum;
        var Find = Engine.CacheDBTree.find(Block);
        if(Find)
        {
            Engine.CacheDBTree.remove(Find);
            Engine.VersionDBTree.remove(Find);
        }
        Engine.CacheDBTree.insert(Block);
        Engine.VersionDBTree.insert(Block);
        if(Engine.VersionDBTree.size > JINN_CONST.MAX_CACHE_DB_LENGTH)
        {
            var OldItem = Engine.VersionDBTree.min();
            Engine.VersionDBTree.remove(OldItem);
            Engine.CacheDBTree.remove(OldItem);
        }
    };
    Engine.FindBlockDBInCache = function (BlockNum)
    {
        if(Engine.ArrDB.length <= BlockNum)
            return undefined;
        var Find = Engine.CacheDBTree.find({BlockNum:BlockNum});
        if(Find)
        {
            if(Find.SaveVersionNum < Engine.SaveVersionNum)
            {
                Engine.VersionDBTree.remove(Find);
                Find.SaveVersionNum = Engine.SaveVersionNum;
                Engine.VersionDBTree.insert(Find);
            }
            return Find;
        }
        return undefined;
    };
    Engine.SetBlockAsSave = function (Block)
    {
        Block.WasSaveVersion = Engine.SaveVersionNum;
    };
    Engine.IsValideDBSave = function (Block)
    {
        if(!Block.WasSaveVersion)
            return 0;
        if(Block.WasSaveVersion === Engine.SaveVersionNum)
            return 1;
        JINN_STAT.CheckSave++;
        var BlockDB = Engine.GetBlockHeaderDB(Block.BlockNum);
        if(BlockDB && IsEqArr(BlockDB.Hash, Block.Hash))
        {
            Block.WasSaveVersion = Engine.SaveVersionNum;
            return 1;
        }
        Block.WasSaveVersion = 0;
        return 0;
    };
}
