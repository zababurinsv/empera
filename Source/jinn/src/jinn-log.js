/*
 * @project: JINN
 * @version: 1.0
 * @license: MIT (not for evil)
 * @copyright: Yuriy Ivanov (Vtools) 2019-2020 [progr76@gmail.com]
 * Telegram:  https://t.me/progr76
*/

/**
 *
 * Logs for debugging
 *
**/

'use strict';
global.JINN_MODULES.push({InitClass:InitClass, Name:"Log"});

//Engine context

function InitClass(Engine)
{
    
    Engine.ErrorCount = 0;
    
    Engine.ToLog = function (Str,StartLevel)
    {
        if(StartLevel)
            return Engine.ToWarning(Str, StartLevel);
        
        var Time;
        Time = "";
        var ID = GetNodeID(Engine);
        
        var Type = Str.substr(0, 2);
        if(Type === "<-" || Type === "->")
            ToLog("" + Time + ID + Str);
        else
            ToLog("" + Time + ID + "." + Str);
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
        Engine.ErrorCount++;
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
    Engine.ToLogTrace = function (Str)
    {
        ToLogTrace("" + Engine.ID + ". " + Str);
    };
}

if(!global.ToLogTrace)
    global.ToLogTrace = function (Str)
    {
        var Data = new Error().stack;
        var index = Data.indexOf("\n");
        index = Data.indexOf("\n", index + 1);
        Data = Data.substr(index);
        
        ToLog("" + Str + ":" + Data);
    };

global.GetNodeID = function (Node)
{
    var ID = Node.ID;
    
    return ID;
}
