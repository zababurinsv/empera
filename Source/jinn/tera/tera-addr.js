/*
 * @project: JINN
 * @version: 1.0
 * @license: MIT (not for evil)
 * @copyright: Yuriy Ivanov (Vtools) 2019-2020 [progr76@gmail.com]
 * Telegram:  https://t.me/progr76
*/

'use strict';

module.exports.Init = Init;

function Init(Engine)
{
    Engine.DoNodeAddr = function ()
    {
        if(!Engine.NodesTree || Engine.TickNum < 1200 || Engine.TickNum % 1200 !== 0)
            return;
        
        var Arr = [];
        var it = Engine.NodesTree.iterator(), Item;
        while((Item = it.next()) !== null)
        {
            if(!Item.Score || Item.Score <= 0)
                continue;
            
            var Item2 = {ip:Item.ip, port:Item.port, Score:Item.Score};
            
            Arr.push(Item2);
        }
        
        Engine.SortAddrArrByScore(Arr);
        SaveParams(GetDataPath("jinn-nodes-" + global.GETNODES_VERSION + ".lst"), Arr);
    };
    
    Engine.LoadAddrOnStart = function ()
    {
        var Arr = LoadParams(GetDataPath("jinn-nodes-" + global.GETNODES_VERSION + ".lst"), []);
        for(var i = 0; i < Arr.length; i++)
        {
            Engine.AddNodeAddr(Arr[i]);
        }
    };
}
