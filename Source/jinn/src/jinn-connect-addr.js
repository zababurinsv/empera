/*
 * @project: TERA
 * @version: Development (beta)
 * @license: MIT (not for evil)
 * @copyright: Yuriy Ivanov (Vtools) 2017-2019 [progr76@gmail.com]
 * Web: https://terafoundation.org
 * Twitter: https://twitter.com/terafoundation
 * Telegram:  https://t.me/terafoundation
*/

global.JINN_MODULES.push({InitClass:InitClass, Name:"Addr"});
function InitClass(Engine)
{
    Engine.NodesArrByLevel = [];
    Engine.NodesTreeByLevel = [];
    Engine.AddNodeAddr = function (AddrItem)
    {
        var HostName = String(AddrItem.ip) + ":" + AddrItem.port;
        AddrItem.Score = 0;
        AddrItem.IDArr = sha3(HostName);
        var Level = Engine.AddrLevelArr(Engine.IDArr, AddrItem.IDArr);
        if(Level >= JINN_CONST.MAX_LEVEL_CONNECTION)
            return 0;
        var Tree = GetRBTreeByLevel(Level);
        if(Tree.find(AddrItem))
            return 0;
        var Arr = GetArrByLevel(Level);
        Tree.insert(AddrItem);
        Arr.push(AddrItem);
        return 1;
    };
    Engine.GetNextNodeAddr = function (Iterator,RecurcionNum)
    {
        var Level = Iterator.Level % JINN_CONST.MAX_LEVEL_CONNECTION;
        Iterator.Level = Level + 1;
        var Index = Iterator.Arr[Level];
        if(!Index)
            Index = 0;
        var Arr = GetArrByLevel(Level);
        if(Arr.length > Index)
        {
            Iterator.Arr[Level] = Index + 1;
            return Arr[Index];
        }
        else
        {
            Iterator.Arr[Level] = Arr.length;
            if(RecurcionNum < JINN_CONST.MAX_LEVEL_CONNECTION)
                return Engine.GetNextNodeAddr(Iterator, RecurcionNum + 1);
            return undefined;
        }
    };
    function GetRBTreeByLevel(Level)
    {
        var Tree = Engine.NodesTreeByLevel[Level];
        if(!Tree)
        {
            Tree = new RBTree(FNodeScoreAddr);
            Engine.NodesTreeByLevel[Level] = Tree;
        }
        return Tree;
    };
    function GetArrByLevel(Level)
    {
        var Arr = Engine.NodesArrByLevel[Level];
        if(!Arr)
        {
            Arr = [];
            Engine.NodesArrByLevel[Level] = Arr;
        }
        return Arr;
    };
}
function FNodeScoreAddr(a,b)
{
    if(a.Score !== b.Score)
        return a.Score - b.Score;
    else
        return CompareArr(a.IDArr, b.IDArr);
}
global.FNodeScoreAddr = FNodeScoreAddr;
