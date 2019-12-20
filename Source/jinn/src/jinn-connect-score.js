/*
 * @project: TERA
 * @version: Development (beta)
 * @license: MIT (not for evil)
 * @copyright: Yuriy Ivanov (Vtools) 2017-2019 [progr76@gmail.com]
 * Web: https://terafoundation.org
 * Twitter: https://twitter.com/terafoundation
 * Telegram:  https://t.me/terafoundation
*/

global.JINN_MODULES.push({InitClass:InitClass, Name:"Score"});
function InitClass(Engine)
{
    Engine.TreeConnectProcess = new RBTree(FNodeScoreAddr);
    Engine.TreeScoreNew = function (Child)
    {
        Engine.TreeScoreSet(Child, 0);
    };
    Engine.TreeScoreAdd = function (Child,Value)
    {
        if(!Child.Score)
            Child.Score = 0;
        Engine.TreeScoreSet(Child, Child.Score + Value);
    };
    Engine.TreeScoreSet = function (Child,SetValue)
    {
        if(!Engine.TreeConnectProcess.find(Child))
        {
            Child.Score = 0;
        }
        else
        {
            Engine.TreeConnectProcess.remove(Child);
        }
        Child.Score = SetValue;
        Engine.TreeConnectProcess.insert(Child);
    };
    Engine.TreeScoreDown = function (Child)
    {
        var Child0 = Engine.TreeConnectProcess.min();
        if(Child0)
            Engine.TreeScoreSet(Child, Child0.Score - 1);
    };
    Engine.GetTopTreeScore = function ()
    {
        return Engine.TreeConnectProcess.max();
    };
    Engine.GetTopTreeScoreArr = function (Count)
    {
        var Tree = Engine.TreeConnectProcess;
        var arr = [];
        var it = Tree.iterator(), Item;
        while((Item = it.prev()) !== null)
        {
            arr.push(Item);
            Count--;
            if(Count <= 0)
                break;
        }
        return arr;
    };
}
