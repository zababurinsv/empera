/*
 * @project: JINN
 * @version: 1.0
 * @license: MIT (not for evil)
 * @copyright: Yuriy Ivanov (Vtools) 2019-2020 [progr76@gmail.com]
 * Telegram:  https://t.me/progr76
*/



'use strict';
global.JINN_MODULES.push({InitClass:InitClass, Name:"Score"});

function InitClass(Engine)
{
    
    Engine.AddChildScore = function (Child,Count)
    {
        var Amount = 20 - Math.floor(Child.RetDeltaTime / 100);
        if(Amount < 0)
            return;
        
        if(Child.AddrItem)
        {
            if(!Child.AddrItem.Score)
                Child.AddrItem.Score = 0;
            Child.AddrItem.Score += Count * Amount / 20;
        }
    };
    
    Engine.DecrChildScore = function (Child,Count)
    {
        if(Child.AddrItem)
            Child.AddrItem.Score -= Count;
    };
    
    Engine.GetNodesArrByLevelScore = function (L)
    {
        var Arr2 = [];
        var Arr = Engine.NodesArrByLevel[L];
        if(Arr)
        {
            for(var i = 0; i < Arr.length; i++)
                Arr2[i] = Arr[i];
            Engine.SortAddrArrByScore(Arr2);
        }
        return Arr2;
    };
    
    Engine.SortAddrArrByScore = function (Arr)
    {
        Arr.sort(function (a,b)
        {
            return b.Score - a.Score;
        });
    };
}
