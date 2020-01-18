/*
 * @project: JINN
 * @version: 1.0
 * @license: MIT (not for evil)
 * @copyright: Yuriy Ivanov (Vtools) 2019-2020 [progr76@gmail.com]
 * Telegram:  https://t.me/progr76
*/

/**
 *
 * The module is responsible for clearing memory of old data (caches)
 *
**/
'use strict';
global.JINN_MODULES.push({InitClass:InitClass, DoNode:DoNode});
function DoNode(Engine)
{
    if(Engine.TickNum % 20 === 0)
    {
        Engine.MemClear();
        if(!Engine.CanMemClear())
            return ;
        if(Engine.TickNum % 100 === 0)
        {
            for(var i = 0; i < Engine.LevelArr.length; i++)
            {
                var Child = Engine.LevelArr[i];
                if(Child)
                {
                    if(Engine.TickNum % 200 === 0)
                        if(Engine.CanHistoryClear())
                            Child.CahcheVersion++;
                    Child.InvalidateOldChildCache();
                    Child.InvalidateOldBlockNumCache();
                }
            }
        }
    }
}
function InitClass(Engine)
{
    Engine.CanMemClear = function ()
    {
        var LastBlockNum = JINN_EXTERN.GetCurrentBlockNumByTime();
        var LastBlockNumDB = Engine.GetMaxNumBlockDB();
        if(LastBlockNum - LastBlockNumDB >= JINN_CONST.STEP_CLEAR_MEM)
            return 0;
        else
            return 1;
    };
    Engine.CanHistoryClear = function ()
    {
        var LastBlockNum = JINN_EXTERN.GetCurrentBlockNumByTime();
        var LastBlockNumDB = Engine.GetMaxNumBlockDB();
        for(var n = LastBlockNum - 10; n <= LastBlockNum; n++)
        {
            var Store = Engine.BlockStore[n];
            if(!Store)
                return 0;
            for(var i = 0; i < Store.LiderArr.length / 2; i++)
            {
                var Item = Store.LiderArr[i];
                if(Item.LoadNum || Item.LoadTreeNum)
                    return 0;
            }
        }
        return 1;
    };
    Engine.MemClear = function ()
    {
        var LastBlockNum = JINN_EXTERN.GetCurrentBlockNumByTime();
        for(var key in Engine.ListTreeTx)
        {
            var BlockNum =  + key;
            if(LastBlockNum - BlockNum <= JINN_CONST.STEP_CLEAR_MEM)
                continue;
            var Value = Engine.ListTreeTx[key];
            Value.clear();
            delete Engine.ListTreeTx[key];
        }
        Engine.ListTreeTicket;
        if(Engine.ListTreeTicket)
            for(var key in Engine.ListTreeTicket)
            {
                var BlockNum =  + key;
                if(LastBlockNum - BlockNum <= JINN_CONST.STEP_CLEAR_MEM)
                    continue;
                var Value = Engine.ListTreeTicket[key];
                Value.clear();
                delete Engine.ListTreeTicket[key];
            }
        for(var key in Engine.BlockStore)
        {
            var Store = Engine.BlockStore[key];
            if(LastBlockNum - Store.BlockNum <= JINN_CONST.STEP_CLEAR_MEM)
                continue;
            delete Engine.BlockStore[key];
        }
        if(!Engine.CanMemClear())
            return ;
        if(!Engine.CanHistoryClear())
            return ;
        for(var key in Engine.LoadingArr)
        {
            var BlockNum =  + key;
            if(LastBlockNum - BlockNum <= JINN_CONST.STEP_CLEAR_MEM)
                continue;
            var BlockArr = Engine.LoadingArr[key];
            delete Engine.LoadingArr[key];
        }
    };
}
