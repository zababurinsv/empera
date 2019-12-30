/*
 * @project: TERA
 * @version: Development (beta)
 * @license: MIT (not for evil)
 * @copyright: Yuriy Ivanov (Vtools) 2017-2019 [progr76@gmail.com]
 * Web: https://terafoundation.org
 * Twitter: https://twitter.com/terafoundation
 * Telegram:  https://t.me/terafoundation
*/

'use strict';
global.JINN_MODULES.push({InitClass:InitClass, Name:"Log"});
function InitClass(Engine)
{
    Engine.ToLog = function (Str)
    {
        var Time = Date.now() % 10000;
        var ID = GetNodeID(Engine);
        if(Str.substr(0, 1) === "<")
            ToLog("" + Time + ": " + ID + Str);
        else
            ToLog("" + Time + ": " + ID + "." + Str);
    };
    Engine.ToLog1 = function (Str)
    {
        Engine.ToWarning(Str, 1);
    };
    Engine.ToLog2 = function (Str)
    {
        Engine.ToWarning(Str, 2);
    };
    Engine.ToLog3 = function (Str)
    {
        Engine.ToWarning(Str, 3);
    };
    Engine.ToLog4 = function (Str)
    {
        Engine.ToWarning(Str, 4);
    };
    Engine.ToLog5 = function (Str)
    {
        Engine.ToWarning(Str, 5);
    };
    Engine.ToWarning = function (Str,StartLevel)
    {
        if(global.JINN_WARNING >= StartLevel || Engine.ID === global.DEBUG_ID)
            Engine.ToLog(Str);
    };
    Engine.ToDebug = function (Str)
    {
        if(global.DEBUG_ID !== "ALL")
            if(Engine.ID !== global.DEBUG_ID)
                return ;
        Engine.ToLog(Str);
    };
    Engine.ToError = function (Child,Str,WarningLevel)
    {
        Child.ErrCount++;
        if(WarningLevel === "t")
            ToLogTrace("" + Engine.ID + "<-->" + Child.ID + " ********ERROR: " + Str, WarningLevel);
        else
            if(global.JINN_WARNING >= WarningLevel || Engine.ID === global.DEBUG_ID)
            {
                var ID = GetNodeID(Child);
                Engine.ToWarning("<-->" + ID + " ********ERROR: " + Str, WarningLevel);
            }
    };
}
if(!global.ToLogTrace)
    global.ToLogTrace = function (Str)
    {
        var Err = new Error();
        ToLog("" + Str + ":" + Err.stack);
    };
global.GetNodeID = function (Node)
{
    var ID = Node.ID;
    return ID;
}
